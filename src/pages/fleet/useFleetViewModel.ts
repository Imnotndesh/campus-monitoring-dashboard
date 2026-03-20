import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
    ScheduledTask,
    ProbeSchedules,
} from "./types";
import {apiFetch, fetchBlob} from "../../lib/api";

export function useFleetViewModel() {
    const queryClient = useQueryClient();

    const [selectedProbeId, setSelectedProbeId] = useState<string | null>(null);
    const [selectedCommandId, setSelectedCommandId] = useState<string | null>(null);
    const [groupFilter, setGroupFilter] = useState<string>("all");
    const [commandFilter, setCommandFilter] = useState<string>("all");
    const [routineProbeId, setRoutineProbeId] = useState<string>("");

    // Fleet Status Overview
    const { data: fleetStatus, isLoading: isStatusLoading } = useQuery<FleetStatusResponse>({
        queryKey: ["fleet-status"],
        queryFn: async () => await apiFetch("/api/v1/fleet/status"),
        refetchInterval: 15000,
    });

    const { data: unenrolledProbes = [], isLoading: isUnenrolledLoading } = useQuery<BaseProbe[]>({
        queryKey: ["fleet-unenrolled-probes"],
        queryFn: async () => await apiFetch("/api/v1/fleet/unenrolled-probes"),
        refetchInterval: 15000,
    });

    const { data: probes = [], isLoading: isProbesLoading } = useQuery<FleetProbe[]>({
        queryKey: ["fleet-probes", groupFilter],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (groupFilter !== "all") params.set("group", groupFilter);
            return await apiFetch(`/api/v1/fleet/probes?${params}`);
        },
        refetchInterval: 10000,
    });

    // Selected Probe Detail
    const { data: selectedProbe } = useQuery<FleetProbe>({
        queryKey: ["fleet-probe", selectedProbeId],
        queryFn: async () => await apiFetch(`/api/v1/fleet/probes/${selectedProbeId}`),
        enabled: !!selectedProbeId,
    });

    // Groups
    const { data: groups = [], isLoading: isGroupsLoading } = useQuery<FleetGroup[]>({
        queryKey: ["fleet-groups"],
        queryFn: async () => await apiFetch("/api/v1/fleet/groups"),
    });

    // Templates
    const { data: templates = [], isLoading: isTemplatesLoading } = useQuery<FleetConfigTemplate[]>({
        queryKey: ["fleet-templates"],
        queryFn: async () => await apiFetch("/api/v1/fleet/templates"),
    });

    // Fleet Commands
    const { data: commands = [], isLoading: isCommandsLoading } = useQuery<FleetCommand[]>({
        queryKey: ["fleet-commands", commandFilter],
        queryFn: async () => {
            const params = new URLSearchParams({ limit: "50" });
            if (commandFilter !== "all") params.set("status", commandFilter);
            return await apiFetch(`/api/v1/fleet/commands?${params}`);
        },
        refetchInterval: 5000,
    });

    // Command Status
    const { data: commandStatus } = useQuery<FleetRolloutStatus>({
        queryKey: ["fleet-command-status", selectedCommandId],
        queryFn: async () => await apiFetch(`/api/v1/fleet/commands/${selectedCommandId}`),
        enabled: !!selectedCommandId,
        refetchInterval: 3000,
    });

    // Mutations
    const enrollMutation = useMutation({
        mutationFn: async ({ probeId, req }: { probeId: string; req: FleetEnrollRequest }) => {
            return await apiFetch(`/api/v1/fleet/probes/${probeId}/enroll`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(req),
            });
        },
        onSuccess: () => {
            toast.success("Probe enrolled in fleet management");
            queryClient.invalidateQueries({ queryKey: ["fleet-probes"] });
            queryClient.invalidateQueries({ queryKey: ["fleet-status"] });
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const unenrollMutation = useMutation({
        mutationFn: async (probeId: string) => {
            await apiFetch(`/api/v1/fleet/probes/${probeId}/unenroll`, { method: "POST" });
        },
        onSuccess: () => {
            toast.success("Probe removed from fleet");
            queryClient.invalidateQueries({ queryKey: ["fleet-probes"] });
            queryClient.invalidateQueries({ queryKey: ["fleet-status"] });
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const sendCommandMutation = useMutation({
        mutationFn: async (req: FleetCommandRequest) => {
            return await apiFetch("/api/v1/fleet/commands", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(req),
            }) as Promise<FleetCommand>;
        },
        onSuccess: (cmd) => {
            toast.success(`Fleet command dispatched to ${cmd.total_targets} probes`);
            setSelectedCommandId(cmd.id);
            queryClient.invalidateQueries({ queryKey: ["fleet-commands"] });
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const cancelCommandMutation = useMutation({
        mutationFn: async (commandId: string) => {
            await apiFetch(`/api/v1/fleet/commands/${commandId}/cancel`, { method: "POST" });
        },
        onSuccess: () => {
            toast.success("Command cancelled");
            queryClient.invalidateQueries({ queryKey: ["fleet-commands"] });
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const createGroupMutation = useMutation({
        mutationFn: async ({ name, description }: { name: string; description: string }) => {
            return await apiFetch("/api/v1/fleet/groups", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, description }),
            });
        },
        onSuccess: () => {
            toast.success("Group created");
            queryClient.invalidateQueries({ queryKey: ["fleet-groups"] });
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const deleteGroupMutation = useMutation({
        mutationFn: async (groupId: string) => {
            await apiFetch(`/api/v1/fleet/groups/${groupId}`, { method: "DELETE" });
        },
        onSuccess: () => {
            toast.success("Group deleted");
            queryClient.invalidateQueries({ queryKey: ["fleet-groups"] });
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const createTemplateMutation = useMutation({
        mutationFn: async (template: Omit<FleetConfigTemplate, "id" | "created_at" | "usage_count">) => {
            return await apiFetch("/api/v1/fleet/templates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(template),
            });
        },
        onSuccess: () => {
            toast.success("Template created");
            queryClient.invalidateQueries({ queryKey: ["fleet-templates"] });
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const applyTemplateMutation = useMutation({
        mutationFn: async ({ templateId, probeIds }: { templateId: number; probeIds: string[] }) => {
            await apiFetch(`/api/v1/fleet/templates/${templateId}/apply`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ probe_ids: probeIds }),
            });
        },
        onSuccess: () => {
            toast.success("Template applied");
            queryClient.invalidateQueries({ queryKey: ["fleet-probes"] });
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const deleteTemplateMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiFetch(`/api/v1/fleet/templates/${id}`, { method: "DELETE" });
        },
        onSuccess: () => {
            toast.success("Template deleted");
            queryClient.invalidateQueries({ queryKey: ["fleet-templates"] });
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const getSmartSuggestions = useCallback(
        (buildingOrLocation: string) => {
            if (!buildingOrLocation) return { groups: [], tags: {} };
            const similarProbes = (probes || []).filter(
                (p) => p.location === buildingOrLocation || (p as any).building === buildingOrLocation
            );
            const suggestedGroups = new Set<string>();
            const suggestedTags: Record<string, string> = {};

            similarProbes.forEach((p) => {
                p.groups?.forEach((g) => suggestedGroups.add(g));
                if (p.tags) {
                    Object.entries(p.tags).forEach(([k, v]) => {
                        suggestedTags[k] = v as string;
                    });
                }
            });

            return {
                groups: Array.from(suggestedGroups),
                tags: suggestedTags,
            };
        },
        [probes]
    );

    const sendCommand = useCallback((req: FleetCommandRequest) => sendCommandMutation.mutate(req), [sendCommandMutation]);

    const { data: locationOptions, isLoading: isLocationOptionsLoading } = useQuery({
        queryKey: ["location-options"],
        queryFn: async () => await apiFetch("/api/v1/probes/locations"),
    });

    const { data: routinesData = [], isLoading: isRoutinesLoading } = useQuery<ScheduledTask[]>({
        queryKey: ["routines", routineProbeId],
        queryFn: async () => {
            if (!routineProbeId) return [];
            return await apiFetch(`/api/v1/probes/${routineProbeId}/tasks`);
        },
        enabled: !!routineProbeId,
    });
    const routines = routinesData ?? [];

    const createRoutineMutation = useMutation({
        mutationFn: async (task: Omit<ScheduledTask, "id" | "created_at" | "updated_at">) => {
            return await apiFetch(`/api/v1/probes/${task.probe_id}/tasks`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(task),
            });
        },
        onSuccess: () => {
            toast.success("Routine created");
            queryClient.invalidateQueries({ queryKey: ["routines", routineProbeId] });
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const deleteRoutineMutation = useMutation({
        mutationFn: async ({ probeId, taskId }: { probeId: string; taskId: string }) => {
            await apiFetch(`/api/v1/probes/${probeId}/tasks/${taskId}`, { method: "DELETE" });
        },
        onSuccess: () => {
            toast.success("Routine deleted");
            queryClient.invalidateQueries({ queryKey: ["routines", routineProbeId] });
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const { data: probeSchedules, isLoading: isSchedulesLoading } = useQuery<ProbeSchedules>({
        queryKey: ["probe-schedules", selectedProbeId],
        queryFn: async () => await apiFetch(`/api/v1/fleet/probes/${selectedProbeId}/schedules`),
        enabled: !!selectedProbeId,
        refetchInterval: 30000,
    });

    const { data: probeSchedulesForRoutine, isLoading: isRoutineSchedulesLoading } = useQuery<ProbeSchedules>({
        queryKey: ["probe-schedules", routineProbeId],
        queryFn: async () => await apiFetch(`/api/v1/fleet/probes/${routineProbeId}/schedules`),
        enabled: !!routineProbeId,
        refetchInterval: 30000,
    });

    const deleteScheduleMutation = useMutation({
        mutationFn: async ({ probeId, scheduleId }: { probeId: string; scheduleId: string }) => {
            await apiFetch(`/api/v1/fleet/probes/${probeId}/schedules/${scheduleId}`, {
                method: "DELETE",
            });
        },
        onSuccess: () => {
            toast.success("Schedule deleted");
            queryClient.invalidateQueries({ queryKey: ["probe-schedules", selectedProbeId] });
        },
        onError: (e: Error) => toast.error(e.message),
    });
    const generateFleetReport = async () => {
        const url = `/api/v1/reports/generate?type=fleet&format=pdf`;
        try {
            const blob = await fetchBlob(url);
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `fleet_report_${new Date().toISOString().slice(0, 19)}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error("Report download failed", error);
            toast.error("Failed to generate report");
        }
    };

    const generateCommandSuccessReport = async () => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 7); // Last 7 days
        const from = start.toISOString();
        const to = end.toISOString();
        const url = `/api/v1/reports/generate?type=command_success&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&format=pdf`;
        try {
            const blob = await fetchBlob(url);
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `command_success_report_${new Date().toISOString().slice(0, 19)}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error("Report download failed", error);
            toast.error("Failed to generate report");
        }
    };


    return {
        selectedProbeId,
        setSelectedProbeId,
        selectedCommandId,
        setSelectedCommandId,
        groupFilter,
        setGroupFilter,
        commandFilter,
        setCommandFilter,
        locationOptions,
        isLocationOptionsLoading,
        fleetStatus,
        isStatusLoading,
        probes,
        generateFleetReport,
        generateCommandSuccessReport,
        isProbesLoading,
        selectedProbe,
        groups,
        isGroupsLoading,
        templates,
        isTemplatesLoading,
        commands,
        isCommandsLoading,
        commandStatus,
        unenrolledProbes,
        isUnenrolledLoading,
        enrollMutation,
        getSmartSuggestions,
        routineProbeId,
        setRoutineProbeId,
        routines,
        probeSchedules,
        isSchedulesLoading,
        deleteSchedule: deleteScheduleMutation.mutate,
        isDeletingSchedule: deleteScheduleMutation.isPending,
        probeSchedulesForRoutine: probeSchedulesForRoutine?.schedules ?? [],
        isRoutineSchedulesLoading,
        isRoutinesLoading,
        createRoutine: createRoutineMutation.mutate,
        isCreatingRoutine: createRoutineMutation.isPending,
        deleteRoutine: deleteRoutineMutation.mutate,
        isDeletingRoutine: deleteRoutineMutation.isPending,
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
            queryClient.invalidateQueries({ queryKey: ["fleet-status"] });
            queryClient.invalidateQueries({ queryKey: ["fleet-probes"] });
            queryClient.invalidateQueries({ queryKey: ["fleet-commands"] });
            queryClient.invalidateQueries({ queryKey: ["fleet-groups"] });
            queryClient.invalidateQueries({ queryKey: ["fleet-unenrolled-probes"] });
        },
    };
}