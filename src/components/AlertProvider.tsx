import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type {Alert, WSMessage} from '../pages/alerts/types';

const AlertContext = createContext<{
    unreadCount: number;
    setUnreadCount: (n: number) => void;
    connectionStatus: string;
} | undefined>(undefined);

export const AlertProvider = ({ children }: { children: React.ReactNode }) => {
    const queryClient = useQueryClient();
    const [unreadCount, setUnreadCount] = useState(0);
    const [status, setStatus] = useState("connecting");

    useEffect(() => {
        let socket: WebSocket | null = null;
        let reconnectTimeout: ReturnType<typeof setTimeout>;

        const connect = () => {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            socket = new WebSocket(`${protocol}//${window.location.host}/api/v1/ws`);

            socket.onopen = () => {
                setStatus("connected");
                console.log("Global Alert Stream Connected");
            };

            socket.onmessage = (event) => {
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
            };

            socket.onclose = () => {
                setStatus("disconnected");
                reconnectTimeout = setTimeout(connect, 3000);
            };
        };

        connect();
        return () => {
            socket?.close();
            clearTimeout(reconnectTimeout);
        };
    }, [queryClient]);

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