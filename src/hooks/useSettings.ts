import { useState, useEffect } from "react"

export type WidgetID = "rssi" | "latency" | "activeProbes" | "packetLoss" | "signalGraph" | "recentAlerts"

const DEFAULT_WIDGETS: Record<WidgetID, boolean> = {
    rssi: true,
    latency: true,
    activeProbes: true,
    packetLoss: true,
    signalGraph: true,
    recentAlerts: true,
}

export function useSettings() {
    const [widgets, setWidgets] = useState<Record<WidgetID, boolean>>(() => {
        const saved = localStorage.getItem("dashboard_widgets")
        return saved ? JSON.parse(saved) : DEFAULT_WIDGETS
    })

    const toggleWidget = (id: WidgetID) => {
        setWidgets((prev) => {
            const next = { ...prev, [id]: !prev[id] }
            localStorage.setItem("dashboard_widgets", JSON.stringify(next))
            return next
        })
    }

    return { widgets, toggleWidget }
}