import { useState, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type {
    FleetProbe,
    FleetGroup,
    FleetConfigTemplate,
    FleetCommand,
    FleetRolloutStatus,
    FleetStatusResponse,
    FleetEnrollRequest,
    FleetCommandRequest,
    BaseProbe,
} from "./types"

export function useFleetViewModel() {
    const queryClient = useQueryClient()

    const [selectedProbeId, setSelectedProbeId] = useState<string | null>(null)
    const [selectedCommandId, setSelectedCommandId] = useState<string | null>(null)
    const [groupFilter, setGroupFilter] = useState<string>("all")
    const [commandFilter, setCommandFilter] = useState<string>("all")

    // ── Fleet Status Overview ──────────────────────────────────────────────────
    const { data: fleetStatus, isLoading: isStatusLoading } = useQuery<FleetStatusResponse>({
        queryKey: ["fleet-status"],
        queryFn: async () => {
            const res = await fetch("/api/v1/fleet/status")
            if (!res.ok) throw new Error("Failed to fetch fleet status")
            return res.json()
        },
        refetchInterval: 15000,
    })
    const { data: unenrolledProbes = [], isLoading: isUnenrolledLoading } = useQuery<BaseProbe[]>({
        queryKey: ["fleet-unenrolled-probes"],
        queryFn: async () => {
            const res = await fetch("/api/v1/fleet/unenrolled-probes")
            if (!res.ok) throw new Error("Failed to fetch unenrolled probes")
            return res.json()
        },
        refetchInterval: 15000,
    })
    const { data: probes = [], isLoading: isProbesLoading } = useQuery<FleetProbe[]>({
        queryKey: ["fleet-probes", groupFilter],
        queryFn: async () => {
            const params = new URLSearchParams()
            if (groupFilter !== "all") params.set("group", groupFilter)
            const res = await fetch(`/api/v1/fleet/probes?${params}`)
            if (!res.ok) throw new Error("Failed to fetch fleet probes")
            return res.json()
        },
        refetchInterval: 10000,
    })


    // ── Selected Probe Detail ──────────────────────────────────────────────────
    const { data: selectedProbe } = useQuery<FleetProbe>({
        queryKey: ["fleet-probe", selectedProbeId],
        queryFn: async () => {
            const res = await fetch(`/api/v1/fleet/probes/${selectedProbeId}`)
            if (!res.ok) throw new Error("Failed to fetch probe")
            return res.json()
        },
        enabled: !!selectedProbeId,
    })

    // ── Groups ─────────────────────────────────────────────────────────────────
    const { data: groups = [], isLoading: isGroupsLoading } = useQuery<FleetGroup[]>({
        queryKey: ["fleet-groups"],
        queryFn: async () => {
            const res = await fetch("/api/v1/fleet/groups")
            if (!res.ok) throw new Error("Failed to fetch groups")
            return res.json()
        },
    })

    // ── Templates ──────────────────────────────────────────────────────────────
    const { data: templates = [], isLoading: isTemplatesLoading } = useQuery<FleetConfigTemplate[]>({
        queryKey: ["fleet-templates"],
        queryFn: async () => {
            const res = await fetch("/api/v1/fleet/templates")
            if (!res.ok) throw new Error("Failed to fetch templates")
            return res.json()
        },
    })

    // ── Fleet Commands ─────────────────────────────────────────────────────────
    const { data: commands = [], isLoading: isCommandsLoading } = useQuery<FleetCommand[]>({
        queryKey: ["fleet-commands", commandFilter],
        queryFn: async () => {
            const params = new URLSearchParams({ limit: "50" })
            if (commandFilter !== "all") params.set("status", commandFilter)
            const res = await fetch(`/api/v1/fleet/commands?${params}`)
            if (!res.ok) throw new Error("Failed to fetch commands")
            return res.json()
        },
        refetchInterval: 5000,
    })

    // ── Command Status ─────────────────────────────────────────────────────────
    const { data: commandStatus } = useQuery<FleetRolloutStatus>({
        queryKey: ["fleet-command-status", selectedCommandId],
        queryFn: async () => {
            const res = await fetch(`/api/v1/fleet/commands/${selectedCommandId}`)
            if (!res.ok) throw new Error("Failed to fetch command status")
            return res.json()
        },
        enabled: !!selectedCommandId,
        refetchInterval: 3000,
    })

    // ── Mutations ──────────────────────────────────────────────────────────────
    const enrollMutation = useMutation({
        mutationFn: async ({ probeId, req }: { probeId: string; req: FleetEnrollRequest }) => {
            const res = await fetch(`/api/v1/fleet/probes/${probeId}/enroll`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(req),
            })
            if (!res.ok) throw new Error("Failed to enroll probe")
            return res.json()
        },
        onSuccess: () => {
            toast.success("Probe enrolled in fleet management")
            queryClient.invalidateQueries({ queryKey: ["fleet-probes"] })
            queryClient.invalidateQueries({ queryKey: ["fleet-status"] })
        },
        onError: (e: Error) => toast.error(e.message),
    })

    const unenrollMutation = useMutation({
        mutationFn: async (probeId: string) => {
            const res = await fetch(`/api/v1/fleet/probes/${probeId}/unenroll`, { method: "POST" })
            if (!res.ok) throw new Error("Failed to unenroll probe")
        },
        onSuccess: () => {
            toast.success("Probe removed from fleet")
            queryClient.invalidateQueries({ queryKey: ["fleet-probes"] })
            queryClient.invalidateQueries({ queryKey: ["fleet-status"] })
        },
        onError: (e: Error) => toast.error(e.message),
    })

    const sendCommandMutation = useMutation({
        mutationFn: async (req: FleetCommandRequest) => {
            const res = await fetch("/api/v1/fleet/commands", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(req),
            })
            if (!res.ok) throw new Error("Failed to send fleet command")
            return res.json() as Promise<FleetCommand>
        },
        onSuccess: (cmd) => {
            toast.success(`Fleet command dispatched to ${cmd.total_targets} probes`)
            setSelectedCommandId(cmd.id)
            queryClient.invalidateQueries({ queryKey: ["fleet-commands"] })
        },
        onError: (e: Error) => toast.error(e.message),
    })

    const cancelCommandMutation = useMutation({
        mutationFn: async (commandId: string) => {
            const res = await fetch(`/api/v1/fleet/commands/${commandId}/cancel`, { method: "POST" })
            if (!res.ok) throw new Error("Failed to cancel command")
        },
        onSuccess: () => {
            toast.success("Command cancelled")
            queryClient.invalidateQueries({ queryKey: ["fleet-commands"] })
        },
        onError: (e: Error) => toast.error(e.message),
    })

    const createGroupMutation = useMutation({
        mutationFn: async ({ name, description }: { name: string; description: string }) => {
            const res = await fetch("/api/v1/fleet/groups", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, description }),
            })
            if (!res.ok) throw new Error("Failed to create group")
            return res.json()
        },
        onSuccess: () => {
            toast.success("Group created")
            queryClient.invalidateQueries({ queryKey: ["fleet-groups"] })
        },
        onError: (e: Error) => toast.error(e.message),
    })

    const deleteGroupMutation = useMutation({
        mutationFn: async (groupId: string) => {
            const res = await fetch(`/api/v1/fleet/groups/${groupId}`, { method: "DELETE" })
            if (!res.ok) throw new Error("Failed to delete group")
        },
        onSuccess: () => {
            toast.success("Group deleted")
            queryClient.invalidateQueries({ queryKey: ["fleet-groups"] })
        },
        onError: (e: Error) => toast.error(e.message),
    })

    const createTemplateMutation = useMutation({
        mutationFn: async (template: Omit<FleetConfigTemplate, "id" | "created_at" | "usage_count">) => {
            const res = await fetch("/api/v1/fleet/templates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(template),
            })
            if (!res.ok) throw new Error("Failed to create template")
            return res.json()
        },
        onSuccess: () => {
            toast.success("Template created")
            queryClient.invalidateQueries({ queryKey: ["fleet-templates"] })
        },
        onError: (e: Error) => toast.error(e.message),
    })

    const applyTemplateMutation = useMutation({
        mutationFn: async ({ templateId, probeIds }: { templateId: number; probeIds: string[] }) => {
            const res = await fetch(`/api/v1/fleet/templates/${templateId}/apply`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ probe_ids: probeIds }),
            })
            if (!res.ok) throw new Error("Failed to apply template")
        },
        onSuccess: () => {
            toast.success("Template applied")
            queryClient.invalidateQueries({ queryKey: ["fleet-probes"] })
        },
        onError: (e: Error) => toast.error(e.message),
    })

    const deleteTemplateMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/v1/fleet/templates/${id}`, { method: "DELETE" })
            if (!res.ok) throw new Error("Failed to delete template")
        },
        onSuccess: () => {
            toast.success("Template deleted")
            queryClient.invalidateQueries({ queryKey: ["fleet-templates"] })
        },
        onError: (e: Error) => toast.error(e.message),
    })
    const getSmartSuggestions = useCallback((buildingOrLocation: string) => {
        if (!buildingOrLocation) return { groups: [], tags: {} }
        const similarProbes = (probes || []).filter(p =>
            p.location === buildingOrLocation || (p as any).building === buildingOrLocation
        )
        const suggestedGroups = new Set<string>()
        const suggestedTags: Record<string, string> = {}

        similarProbes.forEach(p => {
            p.groups?.forEach(g => suggestedGroups.add(g))
            if (p.tags) {
                Object.entries(p.tags).forEach(([k, v]) => {
                    suggestedTags[k] = v as string
                })
            }
        })

        return {
            groups: Array.from(suggestedGroups),
            tags: suggestedTags
        }
    }, [probes])

    const sendCommand = useCallback(
        (req: FleetCommandRequest) => sendCommandMutation.mutate(req),
        [sendCommandMutation]
    )
    const { data: locationOptions, isLoading: isLocationOptionsLoading } = useQuery({
        queryKey: ["location-options"],
        queryFn: async () => {
            const res = await fetch("/api/v1/probes/locations")
            if (!res.ok) throw new Error("Failed to fetch location options")
            return res.json()
        },
    })

    return {
        selectedProbeId, setSelectedProbeId,
        selectedCommandId, setSelectedCommandId,
        groupFilter, setGroupFilter,
        commandFilter, setCommandFilter,
        locationOptions,
        isLocationOptionsLoading,
        fleetStatus, isStatusLoading,
        probes, isProbesLoading,
        selectedProbe,
        groups, isGroupsLoading,
        templates, isTemplatesLoading,
        commands, isCommandsLoading,
        commandStatus,
        unenrolledProbes,
        isUnenrolledLoading,
        enrollMutation,
        getSmartSuggestions,

        // Mutations
        enrollProbe: (probeId: string, req: FleetEnrollRequest) => enrollMutation.mutate({ probeId, req }),
        isEnrolling: enrollMutation.isPending,
        unenrollProbe: (probeId: string) => unenrollMutation.mutate(probeId),
        isUnenrolling: unenrollMutation.isPending,
        sendCommand,
        isSendingCommand: sendCommandMutation.isPending,
        cancelCommand: (id: string) => cancelCommandMutation.mutate(id),
        createGroup: (name: string, description: string) => createGroupMutation.mutate({ name, description }),
        isCreatingGroup: createGroupMutation.isPending,
        deleteGroup: (id: string) => deleteGroupMutation.mutate(id),
        createTemplate: (t: Omit<FleetConfigTemplate, "id" | "created_at" | "usage_count">) => createTemplateMutation.mutate(t),
        isCreatingTemplate: createTemplateMutation.isPending,
        applyTemplate: (templateId: number, probeIds: string[]) => applyTemplateMutation.mutate({ templateId, probeIds }),
        isApplyingTemplate: applyTemplateMutation.isPending,
        deleteTemplate: (id: number) => deleteTemplateMutation.mutate(id),
        refreshAll: () => {
            queryClient.invalidateQueries({ queryKey: ["fleet-status"] })
            queryClient.invalidateQueries({ queryKey: ["fleet-probes"] })
            queryClient.invalidateQueries({ queryKey: ["fleet-commands"] })
            queryClient.invalidateQueries({ queryKey: ["fleet-groups"] })
            queryClient.invalidateQueries({ queryKey: ["fleet-unenrolled-probes"] })
        },
    }
}