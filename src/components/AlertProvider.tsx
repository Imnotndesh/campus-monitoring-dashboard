import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Alert, WSMessage } from '../pages/alerts/types';

const AlertContext = createContext<{
    unreadCount: number;
    setUnreadCount: (n: number) => void;
    connectionStatus: string;
} | undefined>(undefined);

export const AlertProvider = ({ children }: { children: React.ReactNode }) => {
    const queryClient = useQueryClient();
    const [unreadCount, setUnreadCount] = useState(0);
    const [status, setStatus] = useState("connecting");
    const socketRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

    const connect = () => {
        const baseUrl = localStorage.getItem('server_url');
        const token = localStorage.getItem('access_token');

        if (!baseUrl) {
            console.warn('AlertProvider: No server_url configured, WebSocket disabled');
            setStatus("disconnected");
            return;
        }
        const wsBase = baseUrl.replace(/^http/, 'ws');
        const cleanBase = wsBase.replace(/\/$/, '');
        const wsUrl = `${cleanBase}/api/v1/ws?token=${encodeURIComponent(token || '')}`;

        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
            console.log('WebSocket connected to', wsUrl);
            setStatus("connected");
        };

        ws.onmessage = (event) => {
            try {
                const msg: WSMessage = JSON.parse(event.data);
                if (msg.type === "ALERT") {
                    queryClient.setQueryData(["alerts", "active"], (old: Alert[] = []) => [
                        msg.payload,
                        ...old,
                    ]);
                    setUnreadCount(prev => prev + 1);
                    if (Notification.permission === "granted") {
                        new Notification(`Probe ${msg.payload.probe_id}`, {
                            body: msg.payload.message,
                        });
                    }
                }
            } catch (err) {
                console.error("Failed to parse WebSocket message", err);
            }
        };

        ws.onclose = (event) => {
            console.log(`WebSocket closed: ${event.code} - ${event.reason}`);
            setStatus("disconnected");
            reconnectTimeoutRef.current = setTimeout(() => {
                console.log("Attempting to reconnect WebSocket...");
                connect();
            }, 3000);
        };

        ws.onerror = (error) => {
            console.error("WebSocket error", error);
        };
    };

    useEffect(() => {
        if (Notification.permission === "default") {
            Notification.requestPermission();
        }

        connect();

        return () => {
            if (socketRef.current) {
                socketRef.current.close();
                socketRef.current = null;
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, []);

    return (
        <AlertContext.Provider value={{ unreadCount, setUnreadCount, connectionStatus: status }}>
            {children}
        </AlertContext.Provider>
    );
};

export const useAlertGlobal = () => {
    const context = useContext(AlertContext);
    if (!context) throw new Error("useAlertGlobal must be used within AlertProvider");
    return context;
};