// useProbesViewModel.ts
import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { Probe, ProbeFormValues } from "./types"

export function useProbesViewModel() {
    const queryClient = useQueryClient()
    const [selectedProbe, setSelectedProbe] = useState<Probe | null>(null)
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [isAdoptOpen, setIsAdoptOpen] = useState(false)
    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [statusOutput, setStatusOutput] = useState<any>(null)
    const [configOutput, setConfigOutput] = useState<any>(null)
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
        refetchInterval: 2000
    })

    // Auto-update status and config when history changes
    useEffect(() => {
        if (!commandHistory || commandHistory.length === 0) return

        const latestStatus = commandHistory.find((cmd: any) =>
            cmd.command_type === 'get_status' && cmd.status === 'completed' && cmd.result
        )
        if (latestStatus?.result) {
            setStatusOutput(latestStatus.result)
        }

        const latestConfig = commandHistory.find((cmd: any) =>
            cmd.command_type === 'get_config' && cmd.status === 'completed' && cmd.result
        )
        if (latestConfig?.result) {
            setConfigOutput(latestConfig.result)
        }
    }, [commandHistory])

    const pingMutation = useMutation({
        mutationFn: async (probeId: string) => {
            const res = await fetch("/api/v1/commands", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    probe_id: probeId,
                    command_type: "ping",
                    payload: {}
                })
            })
            if (!res.ok) {
                const errorText = await res.text()
                throw new Error(errorText || "Probe Unreachable")
            }
            return res.json()
        },
        onSuccess: () => {
            toast.success("Ping sent - check history for response")
            queryClient.invalidateQueries({ queryKey: ["probe_history"] })
        },
        onError: (err: Error) => {
            toast.error(`Ping failed: ${err.message}`)
        }
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
                'get_status': 'Fetching Status...',
                'get_config': 'Fetching Config...',
                'deep_scan': 'Deep Scan Started',
                'restart': 'Reboot Initiated',
                'factory_reset': 'Factory Reset Initiated',
                'set_wifi': 'WiFi Updated',
                'set_mqtt': 'MQTT Updated',
                'rename_probe': 'Probe Renamed',
                'ota_update': 'OTA Update Started'
            }

            toast.success(commandNames[variables.type] || `Command Sent: ${variables.type}`)
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
            if (!data.probe_id) return
            const res = await fetch(`/api/v1/probes/${data.probe_id}`, {
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
        statusOutput,
        configOutput,
        configDialogType,
        setSelectedProbe,
        setIsAddOpen,
        setIsAdoptOpen,
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