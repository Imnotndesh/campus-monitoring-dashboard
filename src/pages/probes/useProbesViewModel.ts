import { useState} from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { Probe, ProbeFormValues, ProbeStatusCache, ProbeConfigCache } from "./types"

export function useProbesViewModel() {
    const queryClient = useQueryClient()
    const [selectedProbe, setSelectedProbe] = useState<Probe | null>(null)
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [isAdoptOpen, setIsAdoptOpen] = useState(false)
    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [configDialogType, setConfigDialogType] = useState<'wifi' | 'mqtt' | 'rename' | 'ota' | null>(null)

    const { data: probes = [], isLoading } = useQuery<Probe[]>({
        queryKey: ["probes"],
        queryFn: async () => {
            const res = await fetch("/api/v1/probes")
            if (!res.ok) throw new Error("Failed to fetch probes")
            return res.json()
        }
    })

    const { data: commandHistory = [] } = useQuery({
        queryKey: ["probe_history", selectedProbe?.probe_id],
        queryFn: async () => {
            if (!selectedProbe) return []
            const res = await fetch(`/api/v1/commands/probe/${selectedProbe.probe_id}?limit=20`)
            if (!res.ok) return []
            return res.json()
        },
        enabled: !!selectedProbe
    })

    // NEW: Fetch Cached Status for Selected Probe
    const { data: probeStatus } = useQuery<ProbeStatusCache>({
        queryKey: ["probe_status", selectedProbe?.probe_id],
        queryFn: async () => {
            if (!selectedProbe) return null
            const res = await fetch(`/api/v1/probes/${selectedProbe.probe_id}/status`)
            if (!res.ok) return null
            return res.json()
        },
        enabled: !!selectedProbe,
        refetchInterval: 5000 // Poll the cache lightly
    })

    // NEW: Fetch Cached Config for Selected Probe
    const { data: probeConfig } = useQuery<ProbeConfigCache>({
        queryKey: ["probe_config", selectedProbe?.probe_id],
        queryFn: async () => {
            if (!selectedProbe) return null
            const res = await fetch(`/api/v1/probes/${selectedProbe.probe_id}/config`)
            if (!res.ok) return null
            return res.json()
        },
        enabled: !!selectedProbe
    })

    const pingMutation = useMutation({
        mutationFn: async (probeId: string) => {
            const res = await fetch(`/api/v1/probes/${probeId}/command`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ command_type: "ping" })
            })
            if (!res.ok) throw new Error("Probe Unreachable")
            return res.json()
        },
        onSuccess: () => {
            toast.success("Ping Sent")
            queryClient.invalidateQueries({ queryKey: ["probe_ping"] })
        },
        onError: () => toast.error("Ping Failed")
    })

    const commandMutation = useMutation({
        mutationFn: async ({ id, type, payload = {} }: { id: string, type: string, payload?: any }) => {
            const res = await fetch(`/api/v1/probes/${id}/command`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    command_type: type,
                    payload
                })
            })
            if (!res.ok) throw new Error(await res.text())
            return res.json()
        },
        onSuccess: (data, variables) => {
            toast.success(`Command Sent: ${variables.type}`)
            // Invalidate relevant caches to trigger UI update
            if (variables.type === 'get_status') {
                queryClient.invalidateQueries({ queryKey: ["probe_status", variables.id] })
            }
            if (variables.type === 'get_config') {
                queryClient.invalidateQueries({ queryKey: ["probe_config", variables.id] })
            }
            queryClient.invalidateQueries({ queryKey: ["probe_history"] })
        },
        onError: (err: Error) => toast.error(`Failed: ${err.message}`)
    })

    const configCommandMutation = useMutation({
        mutationFn: async ({ probeId, type, data }: { probeId: string, type: string, data: any }) => {
            const res = await fetch(`/api/v1/probes/${probeId}/command`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    command_type: type,
                    payload: data
                })
            })
            if (!res.ok) throw new Error(await res.text())
            return res.json()
        },
        onSuccess: (_, variables) => {
            toast.success("Configuration Updated")
            setConfigDialogType(null)
            queryClient.invalidateQueries({ queryKey: ["probe_config", variables.probeId] })
        },
        onError: (err: Error) => toast.error(`Config Failed: ${err.message}`)
    })

    const addMutation = useMutation({
        mutationFn: async (data: ProbeFormValues) => {
            const res = await fetch("/api/v1/probes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            })
            if (!res.ok) throw new Error("Failed to create probe")
        },
        onSuccess: () => {
            toast.success("Probe Registered")
            setIsAddOpen(false)
            queryClient.invalidateQueries({ queryKey: ["probes"] })
        }
    })

    const updateMutation = useMutation({
        mutationFn: async (data: Partial<Probe>) => {
            if (!selectedProbe) return
            const res = await fetch(`/api/v1/probes/${selectedProbe.probe_id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            })
            if (!res.ok) throw new Error("Update failed")
        },
        onSuccess: () => {
            toast.success("Configuration Saved")
            queryClient.invalidateQueries({ queryKey: ["probes"] })
        }
    })

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/v1/probes/${id}`, { method: "DELETE" })
            if (!res.ok) {
                const text = await res.text()
                throw new Error(text || "Delete failed")
            }
        },
        onSuccess: () => {
            toast.success("Probe Deleted")
            setIsSheetOpen(false)
            queryClient.invalidateQueries({ queryKey: ["probes"] })
        },
        onError: (err: Error) => {
            toast.error(`Delete failed: ${err.message}`)
        }
    })

    return {
        probes,
        isLoading,
        selectedProbe,
        isAddOpen,
        isAdoptOpen,
        isSheetOpen,
        commandHistory,
        probeStatus,
        probeConfig,
        configDialogType,
        setSelectedProbe,
        setIsAddOpen,
        setIsAdoptOpen,
        setIsSheetOpen,
        setConfigDialogType,

        pingProbe: pingMutation.mutate,
        isPinging: pingMutation.isPending,
        sendCommand: commandMutation.mutate,
        isSendingCommand: commandMutation.isPending,
        sendConfigCommand: (type: 'set_wifi' | 'set_mqtt' | 'rename_probe' | 'ota_update', data: any) => {
            if (!selectedProbe) return
            configCommandMutation.mutate({ probeId: selectedProbe.probe_id, type, data })
        },
        isSubmittingConfig: configCommandMutation.isPending,
        addProbe: addMutation.mutate,
        updateProbe: updateMutation.mutate,
        deleteProbe: deleteMutation.mutate
    }
}