import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Probe, ProbeFormValues, ProbeStatusCache, ProbeConfigCache } from "./types";
import {apiFetch, fetchBlob} from "../../lib/api";

export function useProbesViewModel() {
    const queryClient = useQueryClient();
    const [selectedProbe, setSelectedProbe] = useState<Probe | null>(null);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isAdoptOpen, setIsAdoptOpen] = useState(false);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [configDialogType, setConfigDialogType] = useState<'wifi' | 'mqtt' | 'rename' | 'ota' | null>(null);

    const { data: probes = [], isLoading } = useQuery<Probe[]>({
        queryKey: ["probes"],
        queryFn: async () => await apiFetch("/api/v1/probes"),
    });

    const { data: commandHistory = [] } = useQuery({
        queryKey: ["command_history", selectedProbe?.probe_id],
        queryFn: async () => {
            if (!selectedProbe) return [];
            return await apiFetch(`/api/v1/commands/probe/${selectedProbe.probe_id}?limit=20`);
        },
        enabled: !!selectedProbe,
    });

    const { data: probeStatus } = useQuery<ProbeStatusCache>({
        queryKey: ["probe_status", selectedProbe?.probe_id],
        queryFn: async () => {
            if (!selectedProbe) return null;
            return await apiFetch(`/api/v1/probes/${selectedProbe.probe_id}/status`);
        },
        enabled: !!selectedProbe,
        refetchInterval: 5000,
    });

    const { data: probeConfig } = useQuery<ProbeConfigCache>({
        queryKey: ["probe_config", selectedProbe?.probe_id],
        queryFn: async () => {
            if (!selectedProbe) return null;
            return await apiFetch(`/api/v1/probes/${selectedProbe.probe_id}/config`);
        },
        enabled: !!selectedProbe,
    });

    const pingMutation = useMutation({
        mutationFn: async (probeId: string) => {
            return await apiFetch(`/api/v1/probes/${probeId}/command`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ command_type: "ping" }),
            });
        },
        onSuccess: () => {
            toast.success("Ping Sent");
            queryClient.invalidateQueries({ queryKey: ["probe_ping"] });
        },
        onError: () => toast.error("Ping Failed"),
    });

    const commandMutation = useMutation({
        mutationFn: async ({ id, type, payload = {} }: { id: string; type: string; payload?: any }) => {
            return await apiFetch(`/api/v1/probes/${id}/command`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ command_type: type, payload }),
            });
        },
        onSuccess: (_, variables) => {
            toast.success(`Command Sent: ${variables.type}`);
            if (variables.type === "get_status") {
                queryClient.invalidateQueries({ queryKey: ["probe_status", variables.id] });
            }
            if (variables.type === "get_config") {
                queryClient.invalidateQueries({ queryKey: ["probe_config", variables.id] });
            }
            queryClient.invalidateQueries({ queryKey: ["command_history", variables.id] });
        },
        onError: (err: Error) => toast.error(`Failed: ${err.message}`),
    });

    const configCommandMutation = useMutation({
        mutationFn: async ({ probeId, type, data }: { probeId: string; type: string; data: any }) => {
            return await apiFetch(`/api/v1/probes/${probeId}/command`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ command_type: type, payload: data }),
            });
        },
        onSuccess: (_, variables) => {
            toast.success("Configuration Updated");
            setConfigDialogType(null);
            queryClient.invalidateQueries({ queryKey: ["probe_config", variables.probeId] });
        },
        onError: (err: Error) => toast.error(`Config Failed: ${err.message}`),
    });

    const addMutation = useMutation({
        mutationFn: async (data: ProbeFormValues) => {
            await apiFetch("/api/v1/probes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
        },
        onSuccess: () => {
            toast.success("Probe Registered");
            setIsAddOpen(false);
            queryClient.invalidateQueries({ queryKey: ["probes"] });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async (data: Partial<Probe>) => {
            if (!selectedProbe) return;
            await apiFetch(`/api/v1/probes/${selectedProbe.probe_id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
        },
        onSuccess: () => {
            toast.success("Configuration Saved");
            queryClient.invalidateQueries({ queryKey: ["probes"] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiFetch(`/api/v1/probes/${id}`, { method: "DELETE" });
        },
        onSuccess: () => {
            toast.success("Probe Deleted");
            setIsSheetOpen(false);
            queryClient.invalidateQueries({ queryKey: ["probes"] });
        },
        onError: (err: Error) => {
            toast.error(`Delete failed: ${err.message}`);
        },
    });
    const generateProbeReport = async () => {
        const url = `/api/v1/reports/generate?type=probes&format=pdf`;
        try {
            const blob = await fetchBlob(url);
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `probe_report_${new Date().toISOString().slice(0, 19)}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error("Report download failed", error);
            toast.error("Failed to generate report");
        }
    };

    const generateFirmwareVersionReport = async () => {
        const url = `/api/v1/reports/generate?type=firmware_version&format=pdf`;
        try {
            const blob = await fetchBlob(url);
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `firmware_report_${new Date().toISOString().slice(0, 19)}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error("Report download failed", error);
            toast.error("Failed to generate report");
        }
    };

    const generateComplianceReport = async (thresholds: { minRSSI: number; maxLatency: number; maxPacketLoss: number }) => {
        const params = new URLSearchParams({
            min_rssi: thresholds.minRSSI.toString(),
            max_latency: thresholds.maxLatency.toString(),
            max_packet_loss: thresholds.maxPacketLoss.toString(),
            format: 'pdf'
        });
        const url = `/api/v1/reports/generate?type=compliance&${params}`;
        try {
            const blob = await fetchBlob(url);
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `compliance_report_${new Date().toISOString().slice(0, 19)}.pdf`;
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
        generateProbeReport,
        generateFirmwareVersionReport,
        generateComplianceReport,
        pingProbe: pingMutation.mutate,
        isPinging: pingMutation.isPending,
        sendCommand: commandMutation.mutate,
        isSendingCommand: commandMutation.isPending,
        sendConfigCommand: (type: 'set_wifi' | 'set_mqtt' | 'rename_probe' | 'ota_update', data: any) => {
            if (!selectedProbe) return;
            configCommandMutation.mutate({ probeId: selectedProbe.probe_id, type, data });
        },
        isSubmittingConfig: configCommandMutation.isPending,
        addProbe: addMutation.mutate,
        updateProbe: updateMutation.mutate,
        deleteProbe: deleteMutation.mutate,
    };
}