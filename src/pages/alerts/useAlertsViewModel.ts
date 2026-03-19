import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAlertGlobal } from "../../components/AlertProvider";
import type { Alert } from "./types";
import { apiFetch } from "../../lib/api";

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

    return {
        alerts: filteredAlerts,
        isLoading,
        connectionStatus,
        filter,
        setFilter,
        acknowledge,
    };
};