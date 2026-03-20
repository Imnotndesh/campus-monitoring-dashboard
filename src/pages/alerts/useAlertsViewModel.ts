import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAlertGlobal } from "../../components/AlertProvider";
import type { Alert } from "./types";
import { apiFetch, fetchBlob } from "../../lib/api";
import { toast } from "sonner";

export const useAlertsViewModel = () => {
    const queryClient = useQueryClient();
    const { connectionStatus } = useAlertGlobal();
    const [filter, setFilter] = useState<string>("ALL");

    const { data: alerts = [], isLoading } = useQuery<Alert[]>({
        queryKey: ["alerts", "active"],
        queryFn: async () => {
            const data = await apiFetch("/api/v1/alerts/active");
            return Array.isArray(data) ? data : [];
        },
    });

    const filteredAlerts = useMemo(() => {
        if (filter === "ALL") return alerts;
        return alerts.filter((a) => a.category === filter);
    }, [alerts, filter]);

    const acknowledge = async (id: number) => {
        await apiFetch(`/api/v1/alerts/acknowledge/${id}`, { method: "PUT" });
        queryClient.invalidateQueries({ queryKey: ["alerts"] });
    };

    const generateReport = async () => {
        const end = new Date();
        const start = new Date();
        start.setHours(end.getHours() - 24);
        const from = start.toISOString();
        const to = end.toISOString();

        const url = `/api/v1/reports/generate?type=alerts&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&format=pdf`;
        try {
            const blob = await fetchBlob(url);
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `alerts_report_${new Date().toISOString().slice(0, 19)}.pdf`;
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
        alerts: filteredAlerts,
        isLoading,
        connectionStatus,
        filter,
        setFilter,
        acknowledge,
        generateReport,
    };
};