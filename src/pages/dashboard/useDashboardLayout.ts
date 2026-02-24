import { useState, useEffect, useCallback } from "react"

const STORAGE_KEY = "campus-dashboard-v2"

export interface PlacedWidget {
    /** Unique instance ID (uuid-like) */
    instanceId: string
    /** Widget definition ID from registry */
    widgetId: string
    /** Grid position & size */
    x: number
    y: number
    w: number
    h: number
    /** Configured prop values */
    props: Record<string, any>
}

interface DashboardLayout {
    version: number
    widgets: PlacedWidget[]
}

const DEFAULT_LAYOUT: PlacedWidget[] = [
    { instanceId: "default-1", widgetId: "kpi_stability",  x: 0,  y: 0, w: 3, h: 2, props: {} },
    { instanceId: "default-2", widgetId: "kpi_latency",    x: 3,  y: 0, w: 3, h: 2, props: {} },
    { instanceId: "default-3", widgetId: "kpi_rssi",       x: 6,  y: 0, w: 3, h: 2, props: {} },
    { instanceId: "default-4", widgetId: "kpi_loss",       x: 9,  y: 0, w: 3, h: 2, props: {} },
    { instanceId: "default-5", widgetId: "rssi_chart",     x: 0,  y: 2, w: 6, h: 3, props: {} },
    { instanceId: "default-6", widgetId: "latency_chart",  x: 6,  y: 2, w: 6, h: 3, props: {} },
    { instanceId: "default-7", widgetId: "alert_counter",  x: 0,  y: 5, w: 3, h: 2, props: {} },
    { instanceId: "default-8", widgetId: "recent_alerts",  x: 3,  y: 5, w: 4, h: 3, props: {} },
    { instanceId: "default-9", widgetId: "fleet_overview", x: 7,  y: 5, w: 5, h: 2, props: {} },
]

function loadLayout(): PlacedWidget[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return DEFAULT_LAYOUT
        const parsed: DashboardLayout = JSON.parse(raw)
        if (parsed.version !== 2 || !Array.isArray(parsed.widgets)) return DEFAULT_LAYOUT
        return parsed.widgets
    } catch {
        return DEFAULT_LAYOUT
    }
}

function saveLayout(widgets: PlacedWidget[]) {
    try {
        const layout: DashboardLayout = { version: 2, widgets }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(layout))
    } catch (e) {
        console.error("[Dashboard] Failed to save layout:", e)
    }
}

let idCounter = Date.now()
export function generateId(): string {
    return `w-${(idCounter++).toString(36)}`
}

export function useDashboardLayout() {
    const [widgets, setWidgets] = useState<PlacedWidget[]>(loadLayout)

    // Persist on every change
    useEffect(() => {
        saveLayout(widgets)
    }, [widgets])

    const addWidget = useCallback((widgetId: string, partialProps: Record<string, any> = {}) => {
        // Find a free Y position below existing widgets
        const maxY = widgets.reduce((acc, w) => Math.max(acc, w.y + w.h), 0)
        setWidgets(prev => [...prev, {
            instanceId: generateId(),
            widgetId,
            x: 0,
            y: maxY,
            w: 4,
            h: 3,
            props: partialProps,
        }])
    }, [widgets])

    const removeWidget = useCallback((instanceId: string) => {
        setWidgets(prev => prev.filter(w => w.instanceId !== instanceId))
    }, [])

    const updateWidgetProps = useCallback((instanceId: string, props: Record<string, any>) => {
        setWidgets(prev => prev.map(w =>
            w.instanceId === instanceId ? { ...w, props: { ...w.props, ...props } } : w
        ))
    }, [])

    const updateLayout = useCallback((newLayouts: { i: string; x: number; y: number; w: number; h: number }[]) => {
        setWidgets(prev => prev.map(w => {
            const l = newLayouts.find(l => l.i === w.instanceId)
            if (!l) return w
            return { ...w, x: l.x, y: l.y, w: l.w, h: l.h }
        }))
    }, [])

    const resetToDefault = useCallback(() => {
        setWidgets(DEFAULT_LAYOUT)
    }, [])

    return { widgets, addWidget, removeWidget, updateWidgetProps, updateLayout, resetToDefault }
}