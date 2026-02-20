import { useEffect, useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Alert, WSMessage } from "./types";

export const useAlertsViewModel = () => {
    const queryClient = useQueryClient();
    const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
    const [filter, setFilter] = useState<string>("ALL");

    // 1. Fetch logic
    const { data: alerts = [], isLoading } = useQuery<Alert[]>({
        queryKey: ["alerts", "active"],
        queryFn: async () => {
            const res = await fetch("/api/v1/alerts/active");
            const data = await res.json();
            return Array.isArray(data) ? data : [];
        }
    });

    // 2. Computed Data for UI
    const filteredAlerts = useMemo(() => {
        if (filter === "ALL") return alerts;
        return alerts.filter(a => a.category === filter);
    }, [alerts, filter]);

    const unreadCount = useMemo(() => alerts.filter(a => a.status === "ACTIVE").length, [alerts]);

    // 3. WS Reconnection Logic
    useEffect(() => {
        let socket: WebSocket | null = null;
        let timeoutId: ReturnType<typeof setTimeout>;
        let reconnectAttempts = 0;

        const connect = () => {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            socket = new WebSocket(`${protocol}//${window.location.host}/api/v1/ws`);

            socket.onopen = () => {
                setConnectionStatus("connected");
                reconnectAttempts = 0;
            };

            socket.onmessage = (event) => {
                const msg: WSMessage = JSON.parse(event.data);
                if (msg.type === "ALERT") {
                    queryClient.setQueryData(["alerts", "active"], (old: Alert[] = []) => [msg.payload, ...old]);
                }
            };

            socket.onclose = () => {
                setConnectionStatus("disconnected");
                // Exponential backoff: 1s, 2s, 4s, up to 10s
                const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
                timeoutId = setTimeout(() => {
                    reconnectAttempts++;
                    connect();
                }, delay);
            };
        };

        connect();
        return () => {
            socket?.close();
            clearTimeout(timeoutId);
        };
    }, [queryClient]);

    return {
        alerts: filteredAlerts,
        unreadCount,
        isLoading,
        connectionStatus,
        filter,
        setFilter,
        acknowledge: async (id: number) => {
            await fetch(`/api/v1/alerts/acknowledge/${id}`, { method: "PUT" });
            queryClient.invalidateQueries({ queryKey: ["alerts"] });
        }
    };
};