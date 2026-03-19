import React, { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bell, ShieldAlert, Clock, CheckCircle2, AlertCircle, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import {apiFetch} from "../../lib/api.ts";

type Severity = "INFO" | "WARNING" | "CRITICAL"
type AlertStatus = "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED"
type Category = "SIGNAL" | "NETWORK" | "SYSTEM"

interface Alert {
    id: number
    probe_id: string
    category: Category
    severity: Severity
    metric_key: string
    threshold_value: number
    actual_value: number
    message: string
    status: AlertStatus
    occurrences: number
    created_at: string
    updated_at: string
}

const getSeverityStyles = (severity: string) => {
    switch (severity) {
        case "CRITICAL":
            return "bg-red-500/10 text-red-500 border-red-500/20"
        case "WARNING":
            return "bg-amber-500/10 text-amber-500 border-amber-500/20"
        default:
            return "bg-blue-500/10 text-blue-500 border-blue-500/20"
    }
}

// ==================== ALERT COUNTER WIDGET ====================
export function AlertCounterWidget({
                                       title = "Active Alerts",
                                       showSeverityBreakdown = true
                                   }: {
    title?: string
    showSeverityBreakdown?: boolean
}) {
    const { data: alerts = [], isLoading, isError } = useQuery<Alert[]>({
        queryKey: ["widget-alerts-counter"],
        queryFn: async () => {
            const res = await apiFetch("/api/v1/alerts/active")
            if (!res.ok) throw new Error("Failed to fetch alerts")
            const data = await res.json()
            return Array.isArray(data) ? data : []
        },
        refetchInterval: 10000
    })

    const counts = {
        total: alerts.length,
        critical: alerts.filter(a => a.severity === "CRITICAL").length,
        warning: alerts.filter(a => a.severity === "WARNING").length,
        info: alerts.filter(a => a.severity === "INFO").length
    }

    if (isError) {
        return (
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{title}</CardTitle>
                    <Bell className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2 text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm">Failed to load</span>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">
                    {isLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    ) : (
                        counts.total
                    )}
                </div>
                {showSeverityBreakdown && !isLoading && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                        {counts.critical > 0 && (
                            <Badge variant="destructive" className="text-[10px] h-5">
                                {counts.critical} Critical
                            </Badge>
                        )}
                        {counts.warning > 0 && (
                            <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] h-5">
                                {counts.warning} Warning
                            </Badge>
                        )}
                        {counts.info > 0 && (
                            <Badge variant="secondary" className="text-[10px] h-5">
                                {counts.info} Info
                            </Badge>
                        )}
                        {counts.total === 0 && (
                            <span className="text-xs text-muted-foreground">All Clear</span>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

// ==================== RECENT ALERTS LIST WIDGET ====================
export function RecentAlertsWidget({
                                       limit = 5,
                                       title = "Recent Alerts",
                                       showDismiss = true
                                   }: {
    limit?: number
    title?: string
    showDismiss?: boolean
}) {
    const queryClient = useQueryClient()

    const { data: alerts = [], isLoading, isError } = useQuery<Alert[]>({
        queryKey: ["widget-alerts-list", limit],
        queryFn: async () => {
            const res = await apiFetch("/api/v1/alerts/active")
            if (!res.ok) throw new Error("Failed to fetch alerts")
            const data = await res.json()
            const alertArray = Array.isArray(data) ? data : []
            return alertArray
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, limit)
        },
        refetchInterval: 10000
    })

    const acknowledge = async (id: number) => {
        try {
            const res = await apiFetch(`/api/v1/alerts/acknowledge/${id}`, { method: "PUT" })
            if (!res.ok) throw new Error("Failed to acknowledge")
            queryClient.invalidateQueries({ queryKey: ["widget-alerts-list"] })
            queryClient.invalidateQueries({ queryKey: ["widget-alerts-counter"] })
        } catch (error) {
            console.error("Error acknowledging alert:", error)
        }
    }

    if (isError) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4" />
                        {title}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center h-[200px] text-destructive">
                        <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
                        <p className="text-sm">Failed to load alerts</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4" />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex items-center justify-center h-[200px]">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : alerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                        <CheckCircle2 className="h-8 w-8 mb-2 opacity-50 text-emerald-500" />
                        <p className="text-sm font-medium">All Clear</p>
                        <p className="text-xs">No active alerts</p>
                    </div>
                ) : (
                    <ScrollArea className="h-[200px]">
                        <div className="space-y-2">
                            {alerts.map((alert) => (
                                <div
                                    key={alert.id}
                                    className="p-3 border rounded-lg hover:bg-muted/50 transition-colors relative group"
                                >
                                    {showDismiss && (
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => acknowledge(alert.id)}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    )}
                                    <div className="flex items-start gap-2 mb-2">
                                        <div className={cn("p-1.5 rounded-full", getSeverityStyles(alert.severity))}>
                                            <ShieldAlert className="h-3 w-3" />
                                        </div>
                                        <div className="flex-1 pr-6">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <Badge variant="outline" className="font-mono text-[10px] h-4">
                                                    {alert.probe_id}
                                                </Badge>
                                                <Badge className={cn("text-[9px] h-4", getSeverityStyles(alert.severity))}>
                                                    {alert.severity}
                                                </Badge>
                                            </div>
                                            <p className="text-xs font-medium leading-snug mb-1">
                                                {alert.message}
                                            </p>
                                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                <Clock className="h-2.5 w-2.5" />
                                                <span>{new Date(alert.created_at).toLocaleTimeString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    )
}

// ==================== FILTERED ALERTS WIDGET ====================
export function FilteredAlertsWidget({
                                         limit = 10,
                                         title = "System Alerts",
                                         showDismiss = true,
                                         defaultCategory = "ALL"
                                     }: {
    limit?: number
    title?: string
    showDismiss?: boolean
    defaultCategory?: "ALL" | Category
}) {
    const queryClient = useQueryClient()
    const [category, setCategory] = useState<string>(defaultCategory)

    const { data: allAlerts = [], isLoading, isError } = useQuery<Alert[]>({
        queryKey: ["widget-alerts-filtered"],
        queryFn: async () => {
            const res = await apiFetch("/api/v1/alerts/active")
            if (!res.ok) throw new Error("Failed to fetch alerts")
            const data = await res.json()
            return Array.isArray(data) ? data : []
        },
        refetchInterval: 10000
    })

    const alerts = React.useMemo(() => {
        const filtered = category === "ALL"
            ? allAlerts
            : allAlerts.filter(a => a.category === category)

        return filtered
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, limit)
    }, [allAlerts, category, limit])

    const acknowledge = async (id: number) => {
        try {
            const res = await apiFetch(`/api/v1/alerts/acknowledge/${id}`, { method: "PUT" })
            if (!res.ok) throw new Error("Failed to acknowledge")
            queryClient.invalidateQueries({ queryKey: ["widget-alerts-filtered"] })
            queryClient.invalidateQueries({ queryKey: ["widget-alerts-counter"] })
        } catch (error) {
            console.error("Error acknowledging alert:", error)
        }
    }

    if (isError) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <ShieldAlert className="h-4 w-4" />
                            {title}
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center h-[300px] text-destructive">
                        <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
                        <p className="text-sm">Failed to load alerts</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4" />
                        {title}
                    </span>
                    <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="w-[140px] h-8 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Categories</SelectItem>
                            <SelectItem value="SIGNAL">Signal</SelectItem>
                            <SelectItem value="NETWORK">Network</SelectItem>
                            <SelectItem value="SYSTEM">System</SelectItem>
                        </SelectContent>
                    </Select>
                </CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex items-center justify-center h-[300px]">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : alerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                        <CheckCircle2 className="h-8 w-8 mb-2 opacity-50 text-emerald-500" />
                        <p className="text-sm font-medium">All Clear</p>
                        <p className="text-xs">
                            No {category !== "ALL" ? category.toLowerCase() : ""} alerts
                        </p>
                    </div>
                ) : (
                    <ScrollArea className="h-[300px]">
                        <div className="space-y-3">
                            {alerts.map((alert) => (
                                <div
                                    key={alert.id}
                                    className="p-3 border rounded-lg hover:bg-muted/50 transition-colors relative group border-l-4"
                                    style={{
                                        borderLeftColor: alert.severity === "CRITICAL"
                                            ? "rgb(239 68 68)"
                                            : alert.severity === "WARNING"
                                                ? "rgb(245 158 11)"
                                                : "rgb(59 130 246)"
                                    }}
                                >
                                    {showDismiss && (
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => acknowledge(alert.id)}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    )}
                                    <div className="flex items-start gap-2">
                                        <div className={cn("p-1.5 rounded-full", getSeverityStyles(alert.severity))}>
                                            <ShieldAlert className="h-3.5 w-3.5" />
                                        </div>
                                        <div className="flex-1 pr-8">
                                            <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                                <Badge variant="outline" className="font-mono text-[10px] h-4 bg-background">
                                                    {alert.probe_id}
                                                </Badge>
                                                <span className="text-[10px] text-muted-foreground">•</span>
                                                <span className="text-[10px] font-semibold uppercase tracking-tight">
                                                    {alert.metric_key || alert.category}
                                                </span>
                                                <Badge className={cn("text-[9px] h-4", getSeverityStyles(alert.severity))}>
                                                    {alert.severity}
                                                </Badge>
                                            </div>
                                            <p className="text-xs font-medium leading-relaxed mb-1.5">
                                                {alert.message}
                                            </p>
                                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="h-2.5 w-2.5" />
                                                    <span>{new Date(alert.created_at).toLocaleString()}</span>
                                                </div>
                                                {alert.occurrences > 1 && (
                                                    <>
                                                        <span>•</span>
                                                        <Badge variant="secondary" className="text-[9px] h-4">
                                                            {alert.occurrences} Events
                                                        </Badge>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    )
}