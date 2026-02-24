import React from "react"
import { Activity, Bell, Radio, Server, Wifi, BarChart3, Users, AlertTriangle, Layers, Signal } from "lucide-react"

import { KpiCardWidget, RssiChartWidget, LatencyChartWidget, RecentDeepScansWidget, ProbeComparisonWidget } from "../analytics/AnalyticsWidgets"
import { AlertCounterWidget, RecentAlertsWidget, FilteredAlertsWidget } from "../alerts/AlertsWidgets"
import { ProbeStatusWidget, UnknownProbesWidget, ProbeConfigWidget } from "../probes/ProbesWidgets"
import { FleetOverviewWidget, FleetProbeListWidget, ActiveRolloutsWidget, FleetGroupsWidget, OfflineProbesWidget } from "../fleet/FleetWidgets"

export type WidgetCategory = "analytics" | "alerts" | "probes" | "fleet"

export interface WidgetDef {
    id: string
    name: string
    description: string
    category: WidgetCategory
    icon: React.ReactNode
    // Default grid sizing
    defaultW: number
    defaultH: number
    minW: number
    minH: number
    // Props this widget accepts (for config panel)
    configurableProps?: WidgetPropDef[]
    // Render the widget given its stored props
    render: (props: Record<string, any>) => React.ReactNode
}

export interface WidgetPropDef {
    key: string
    label: string
    type: "string" | "select" | "number" | "boolean"
    default?: any
    options?: { value: string; label: string }[]
}

const RANGE_OPTIONS = [
    { value: "1h", label: "Last 1 Hour" },
    { value: "6h", label: "Last 6 Hours" },
    { value: "24h", label: "Last 24 Hours" },
    { value: "7d", label: "Last 7 Days" },
]

export const WIDGET_REGISTRY: WidgetDef[] = [
    // ── Analytics ──────────────────────────────────────────────────────────────
    {
        id: "kpi_stability",
        name: "Network Stability",
        description: "Health or stability score KPI card",
        category: "analytics",
        icon: <Activity className="h-4 w-4" />,
        defaultW: 3, defaultH: 2, minW: 2, minH: 2,
        configurableProps: [
            { key: "probeId", label: "Probe ID", type: "string", default: "all" },
            { key: "range", label: "Time Range", type: "select", default: "24h", options: RANGE_OPTIONS },
        ],
        render: (p) => <KpiCardWidget title="Network Stability" metric="stability" icon={<Activity className="h-4 w-4 text-emerald-500" />} probeId={p.probeId || "all"} range={p.range || "24h"} />,
    },
    {
        id: "kpi_latency",
        name: "Avg Latency",
        description: "Average latency KPI card",
        category: "analytics",
        icon: <Radio className="h-4 w-4" />,
        defaultW: 3, defaultH: 2, minW: 2, minH: 2,
        configurableProps: [
            { key: "probeId", label: "Probe ID", type: "string", default: "all" },
            { key: "range", label: "Time Range", type: "select", default: "24h", options: RANGE_OPTIONS },
        ],
        render: (p) => <KpiCardWidget title="Avg Latency" metric="latency" icon={<Radio className="h-4 w-4 text-blue-500" />} probeId={p.probeId || "all"} range={p.range || "24h"} />,
    },
    {
        id: "kpi_rssi",
        name: "Avg Signal (RSSI)",
        description: "Average RSSI signal strength KPI card",
        category: "analytics",
        icon: <Signal className="h-4 w-4" />,
        defaultW: 3, defaultH: 2, minW: 2, minH: 2,
        configurableProps: [
            { key: "probeId", label: "Probe ID", type: "string", default: "all" },
            { key: "range", label: "Time Range", type: "select", default: "24h", options: RANGE_OPTIONS },
        ],
        render: (p) => <KpiCardWidget title="Avg Signal" metric="rssi" icon={<Wifi className="h-4 w-4 text-purple-500" />} probeId={p.probeId || "all"} range={p.range || "24h"} />,
    },
    {
        id: "kpi_loss",
        name: "Packet Loss",
        description: "Average packet loss KPI card",
        category: "analytics",
        icon: <AlertTriangle className="h-4 w-4" />,
        defaultW: 3, defaultH: 2, minW: 2, minH: 2,
        configurableProps: [
            { key: "probeId", label: "Probe ID", type: "string", default: "all" },
            { key: "range", label: "Time Range", type: "select", default: "24h", options: RANGE_OPTIONS },
        ],
        render: (p) => <KpiCardWidget title="Packet Loss" metric="loss" icon={<AlertTriangle className="h-4 w-4 text-amber-500" />} probeId={p.probeId || "all"} range={p.range || "24h"} />,
    },
    {
        id: "rssi_chart",
        name: "Signal Quality Chart",
        description: "Time-series RSSI chart with area fill",
        category: "analytics",
        icon: <BarChart3 className="h-4 w-4" />,
        defaultW: 6, defaultH: 3, minW: 4, minH: 3,
        configurableProps: [
            { key: "probeId", label: "Probe ID", type: "string", default: "all" },
            { key: "range", label: "Time Range", type: "select", default: "24h", options: RANGE_OPTIONS },
            { key: "title", label: "Card Title", type: "string", default: "Signal Quality" },
        ],
        render: (p) => <RssiChartWidget probeId={p.probeId || "all"} range={p.range || "24h"} title={p.title || "Signal Quality"} />,
    },
    {
        id: "latency_chart",
        name: "Latency Trend Chart",
        description: "Time-series latency chart",
        category: "analytics",
        icon: <BarChart3 className="h-4 w-4" />,
        defaultW: 6, defaultH: 3, minW: 4, minH: 3,
        configurableProps: [
            { key: "probeId", label: "Probe ID", type: "string", default: "all" },
            { key: "range", label: "Time Range", type: "select", default: "24h", options: RANGE_OPTIONS },
            { key: "title", label: "Card Title", type: "string", default: "Latency Trend" },
        ],
        render: (p) => <LatencyChartWidget probeId={p.probeId || "all"} range={p.range || "24h"} title={p.title || "Latency Trend"} />,
    },
    {
        id: "deep_scans",
        name: "Recent Deep Scans",
        description: "List of recent deep scan results for a probe",
        category: "analytics",
        icon: <Radio className="h-4 w-4" />,
        defaultW: 4, defaultH: 3, minW: 3, minH: 3,
        configurableProps: [
            { key: "probeId", label: "Probe ID (required)", type: "string", default: "" },
            { key: "limit", label: "Max Items", type: "number", default: 5 },
        ],
        render: (p) => <RecentDeepScansWidget probeId={p.probeId || ""} limit={Number(p.limit) || 5} />,
    },
    {
        id: "probe_comparison",
        name: "Probe Comparison",
        description: "Compare performance across multiple probes",
        category: "analytics",
        icon: <BarChart3 className="h-4 w-4" />,
        defaultW: 6, defaultH: 4, minW: 4, minH: 4,
        configurableProps: [
            { key: "range", label: "Time Range", type: "select", default: "24h", options: RANGE_OPTIONS },
            { key: "maxProbes", label: "Max Probes", type: "number", default: 4 },
        ],
        render: (p) => <ProbeComparisonWidget range={p.range || "24h"} maxProbes={Number(p.maxProbes) || 4} />,
    },

    // ── Alerts ─────────────────────────────────────────────────────────────────
    {
        id: "alert_counter",
        name: "Alert Counter",
        description: "Active alert counts with severity breakdown",
        category: "alerts",
        icon: <Bell className="h-4 w-4" />,
        defaultW: 3, defaultH: 2, minW: 2, minH: 2,
        configurableProps: [
            { key: "showSeverityBreakdown", label: "Show Breakdown", type: "boolean", default: true },
        ],
        render: (p) => <AlertCounterWidget showSeverityBreakdown={p.showSeverityBreakdown !== false} />,
    },
    {
        id: "recent_alerts",
        name: "Recent Alerts",
        description: "Scrollable list of most recent alerts",
        category: "alerts",
        icon: <Bell className="h-4 w-4" />,
        defaultW: 4, defaultH: 3, minW: 3, minH: 3,
        configurableProps: [
            { key: "limit", label: "Max Items", type: "number", default: 5 },
            { key: "showDismiss", label: "Show Dismiss", type: "boolean", default: true },
        ],
        render: (p) => <RecentAlertsWidget limit={Number(p.limit) || 5} showDismiss={p.showDismiss !== false} />,
    },
    {
        id: "filtered_alerts",
        name: "Filtered Alerts",
        description: "Alerts panel with category filter controls",
        category: "alerts",
        icon: <Bell className="h-4 w-4" />,
        defaultW: 6, defaultH: 4, minW: 4, minH: 3,
        configurableProps: [
            { key: "limit", label: "Max Items", type: "number", default: 10 },
            { key: "defaultCategory", label: "Default Category", type: "select", default: "ALL", options: [
                    { value: "ALL", label: "All" },
                    { value: "SIGNAL", label: "Signal" },
                    { value: "NETWORK", label: "Network" },
                    { value: "SYSTEM", label: "System" },
                ]},
        ],
        render: (p) => <FilteredAlertsWidget limit={Number(p.limit) || 10} defaultCategory={p.defaultCategory || "ALL"} />,
    },

    // ── Probes ─────────────────────────────────────────────────────────────────
    {
        id: "probe_status",
        name: "Probe Status",
        description: "Live system status for a specific probe",
        category: "probes",
        icon: <Server className="h-4 w-4" />,
        defaultW: 4, defaultH: 3, minW: 3, minH: 3,
        configurableProps: [
            { key: "probeId", label: "Probe ID (required)", type: "string", default: "" },
        ],
        render: (p) => <ProbeStatusWidget probeId={p.probeId || ""} />,
    },
    {
        id: "unknown_probes",
        name: "Unknown Probes",
        description: "List of unregistered probes seen on MQTT",
        category: "probes",
        icon: <Server className="h-4 w-4" />,
        defaultW: 4, defaultH: 3, minW: 3, minH: 2,
        render: (p) => <UnknownProbesWidget />,
    },
    {
        id: "probe_config",
        name: "Probe Configuration",
        description: "View config and settings for a probe",
        category: "probes",
        icon: <Server className="h-4 w-4" />,
        defaultW: 5, defaultH: 4, minW: 4, minH: 3,
        configurableProps: [
            { key: "defaultProbeId", label: "Default Probe ID", type: "string", default: "" },
        ],
        render: (p) => <ProbeConfigWidget defaultProbeId={p.defaultProbeId || undefined} />,
    },

    // ── Fleet ──────────────────────────────────────────────────────────────────
    {
        id: "fleet_overview",
        name: "Fleet Overview",
        description: "Total managed probes with online ratio bar",
        category: "fleet",
        icon: <Layers className="h-4 w-4" />,
        defaultW: 3, defaultH: 2, minW: 2, minH: 2,
        render: () => <FleetOverviewWidget />,
    },
    {
        id: "fleet_probe_list",
        name: "Fleet Probe List",
        description: "Scrollable list of fleet-managed probes",
        category: "fleet",
        icon: <Layers className="h-4 w-4" />,
        defaultW: 4, defaultH: 3, minW: 3, minH: 3,
        configurableProps: [
            { key: "maxItems", label: "Max Items", type: "number", default: 8 },
        ],
        render: (p) => <FleetProbeListWidget maxItems={Number(p.maxItems) || 8} />,
    },
    {
        id: "active_rollouts",
        name: "Active Rollouts",
        description: "Live progress for in-flight fleet commands",
        category: "fleet",
        icon: <Layers className="h-4 w-4" />,
        defaultW: 4, defaultH: 3, minW: 3, minH: 2,
        render: () => <ActiveRolloutsWidget />,
    },
    {
        id: "fleet_groups",
        name: "Fleet Groups",
        description: "Group summary with online ratios",
        category: "fleet",
        icon: <Users className="h-4 w-4" />,
        defaultW: 4, defaultH: 3, minW: 3, minH: 2,
        render: () => <FleetGroupsWidget />,
    },
    {
        id: "offline_probes",
        name: "Offline Probes",
        description: "Alert card listing probes that are offline",
        category: "fleet",
        icon: <Wifi className="h-4 w-4" />,
        defaultW: 3, defaultH: 2, minW: 2, minH: 2,
        render: () => <OfflineProbesWidget />,
    },
]

export const WIDGET_MAP = Object.fromEntries(WIDGET_REGISTRY.map(w => [w.id, w]))

export const CATEGORY_LABELS: Record<WidgetCategory, string> = {
    analytics: "Analytics",
    alerts: "Alerts",
    probes: "Probes",
    fleet: "Fleet",
}

export const CATEGORY_COLORS: Record<WidgetCategory, string> = {
    analytics: "bg-blue-500/15 text-blue-600 border-blue-500/30",
    alerts: "bg-rose-500/15 text-rose-600 border-rose-500/30",
    probes: "bg-purple-500/15 text-purple-600 border-purple-500/30",
    fleet: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
}