// useProbesViewModel.ts
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { Probe, ProbeFormValues } from "./types"

export function useProbesViewModel() {
    const queryClient = useQueryClient()
    const [selectedProbe, setSelectedProbe] = useState<Probe | null>(null)
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [statusOutput, setStatusOutput] = useState<any>(null)
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
        enabled: !!selectedProbe,
        refetchInterval: 5000
    })

    const pingMutation = useMutation({
        mutationFn: async (probeId: string) => {
            const res = await fetch(`/api/v1/probes/${probeId}/ping`, { method: "POST" })
            if (!res.ok) throw new Error("Probe Unreachable")
            return res.json()
        },
        onSuccess: () => toast.success("Probe is Online and responding"),
        onError: () => toast.error("Probe is Offline or Unreachable")
    })

    const commandMutation = useMutation({
        mutationFn: async ({ id, type, payload = {} }: { id: string, type: string, payload?: any }) => {
            const res = await fetch("/api/v1/commands", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    probe_id: id,
                    command_type: type,
                    payload
                })
            })
            if (!res.ok) {
                const errorText = await res.text()
                throw new Error(errorText || 'Command failed')
            }
            return res.json()
        },
        onSuccess: (data, variables) => {
            const commandNames: Record<string, string> = {
                'get_status': 'Status Retrieved',
                'get_config': 'Config Retrieved',
                'deep_scan': 'Deep Scan Started',
                'restart': 'Reboot Initiated',
                'factory_reset': 'Factory Reset Initiated',
                'set_wifi': 'WiFi Updated',
                'set_mqtt': 'MQTT Updated',
                'rename_probe': 'Probe Renamed',
                'ota_update': 'OTA Update Started'
            }

            toast.success(commandNames[variables.type] || `Command Sent: ${variables.type}`)

            if (variables.type === 'get_status' && data.result) {
                setStatusOutput(data.result)
            }

            queryClient.invalidateQueries({ queryKey: ["probe_history"] })
        },
        onError: (err: Error) => {
            toast.error(`Failed: ${err.message}`)
        }
    })

    const configCommandMutation = useMutation({
        mutationFn: async ({
                               probeId,
                               type,
                               data
                           }: {
            probeId: string,
            type: 'set_wifi' | 'set_mqtt' | 'rename_probe' | 'ota_update',
            data: any
        }) => {
            const res = await fetch("/api/v1/commands", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    probe_id: probeId,
                    command_type: type,
                    payload: data
                })
            })
            if (!res.ok) {
                const errorText = await res.text()
                throw new Error(errorText || 'Configuration command failed')
            }
            return res.json()
        },
        onSuccess: (_, variables) => {
            const messages: Record<string, string> = {
                'set_wifi': 'WiFi configuration sent. Probe will reconnect.',
                'set_mqtt': 'MQTT configuration sent. Probe will reconnect.',
                'rename_probe': 'Probe rename initiated. Device will reboot.',
                'ota_update': 'OTA update started. Monitor command history for progress.'
            }

            toast.success(messages[variables.type] || 'Configuration updated')
            setConfigDialogType(null)
            queryClient.invalidateQueries({ queryKey: ["probe_history"] })
        },
        onError: (err: Error) => {
            toast.error(`Configuration failed: ${err.message}`)
        }
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
            if (!res.ok) throw new Error("Delete failed")
        },
        onSuccess: () => {
            toast.success("Probe Deleted")
            setIsSheetOpen(false)
            queryClient.invalidateQueries({ queryKey: ["probes"] })
        }
    })

    return {
        probes,
        isLoading,
        selectedProbe,
        isAddOpen,
        isSheetOpen,
        commandHistory,
        statusOutput,
        configDialogType,
        setSelectedProbe,
        setIsAddOpen,
        setIsSheetOpen,
        setStatusOutput,
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