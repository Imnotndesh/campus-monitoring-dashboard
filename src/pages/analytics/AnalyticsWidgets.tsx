import React, {useMemo, useState} from "react"
import { useQuery } from "@tanstack/react-query"
import {
    AlertCircle,
    BarChart3,
    BarChart,
    CheckCircle2,
    Loader2,
    Radio,
    Search,
    XCircle,
    AlertTriangle,
    X,
} from "lucide-react"
import {
    AreaChart,
    Area,
    LineChart,
    Line,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Command, TimeSeriesPoint, AnalyticsTimeRange } from "./types"
import {Button} from "../../components/ui/button.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {DialogHeader} from "../../components/ui/dialog.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
interface Probe {
    probe_id: string
    location: string
    building?: string
    floor?: string
    status: 'active' | 'inactive' | 'maintenance'
    last_seen: string
}

interface ProbeComparison {
    probe_id: string
    location: string
    avg_rssi: number
    avg_latency: number
    avg_packet_loss: number
    stability_score: number
    sample_count: number
}

export function KpiCardWidget({
                                  title,
                                  icon,
                                  probeId = "all",
                                  range = "24h",
                                  metric
                              }: {
    title: string
    icon: React.ReactNode
    probeId?: string
    range?: AnalyticsTimeRange
    metric: "stability" | "latency" | "rssi" | "loss"
}) {
    const rangeToHours = { "1h": 1, "6h": 6, "24h": 24, "7d": 168 }
    const hours = rangeToHours[range]

    const getDateRange = () => {
        const end = new Date()
        const start = new Date()
        start.setHours(end.getHours() - hours)
        return { start: start.toISOString(), end: end.toISOString() }
    }

    const { data: stats } = useQuery({
        queryKey: ["widget-stats", range, probeId, metric],
        queryFn: async () => {
            if (probeId === 'all') {
                const res = await fetch("/api/v1/analytics/health")
                if (!res.ok) return null
                return res.json()
            } else {
                const { start, end } = getDateRange()
                const params = new URLSearchParams({ start_time: start, end_time: end })
                const res = await fetch(`/api/v1/analytics/performance/${probeId}?${params}`)
                if (!res.ok) return null
                return res.json()
            }
        }
    })

    const getValue = () => {
        if (!stats) return "--"

        const getVal = (keys: string[]) => {
            for (const k of keys) {
                if ((stats as any)[k] !== undefined && (stats as any)[k] !== null) {
                    return (stats as any)[k]
                }
            }
            return null
        }

        switch (metric) {
            case "stability": {
                const score = getVal(['health_score', 'stability_score'])
                return score != null ? `${score.toFixed(0)}%` : "--"
            }
            case "latency": {
                const lat = getVal(['avg_latency', 'latency'])
                return lat != null ? `${lat.toFixed(0)} ms` : "--"
            }
            case "rssi": {
                const rssi = getVal(['avg_rssi', 'rssi'])
                return rssi != null && rssi < 0 ? `${rssi.toFixed(0)} dBm` : "--"
            }
            case "loss": {
                const loss = getVal(['avg_packet_loss', 'packet_loss'])
                return loss != null ? `${loss.toFixed(2)}%` : "--"
            }
            default:
                return "--"
        }
    }

    const getDescription = () => {
        const source = probeId === "all" ? "Network-wide" : `Probe ${probeId}`
        return `${source} • Last ${range}`
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{getValue()}</div>
                <p className="text-xs text-muted-foreground">{getDescription()}</p>
            </CardContent>
        </Card>
    )
}

// ==================== RSSI CHART WIDGET ====================
export function RssiChartWidget({
                                    probeId = "all",
                                    range = "24h",
                                    title = "Signal Quality"
                                }: {
    probeId?: string
    range?: AnalyticsTimeRange
    title?: string
}) {
    const rangeToHours = { "1h": 1, "6h": 6, "24h": 24, "7d": 168 }
    const hours = rangeToHours[range]

    const getDateRange = () => {
        const end = new Date()
        const start = new Date()
        start.setHours(end.getHours() - hours)
        return { start: start.toISOString(), end: end.toISOString() }
    }

    const getInterval = () => {
        if (range === '1h') return '1 minute'
        if (range === '6h') return '5 minutes'
        if (range === '24h') return '1 hour'
        return '6 hours'
    }

    const { data: chartData = [] } = useQuery({
        queryKey: ["widget-rssi", range, probeId],
        queryFn: async () => {
            const { start, end } = getDateRange()
            const interval = getInterval()
            const params = new URLSearchParams({
                start_time: start,
                end_time: end,
                interval
            })

            if (probeId !== 'all') {
                params.append("probe_id", probeId)
            }

            const res = await fetch(`/api/v1/analytics/timeseries/rssi?${params}`)
            if (!res.ok) return []
            const data: TimeSeriesPoint[] = await res.json()

            return data.map(p => ({
                timestamp: p.timestamp,
                rssi: p.value
            }))
        }
    })

    const source = probeId === "all" ? "All Probes" : `Probe ${probeId}`

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>{title}</span>
                    <Badge variant="outline" className="text-xs font-normal">
                        {source} • {range}
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="timestamp"
                                tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                minTickGap={30}
                                fontSize={10}
                            />
                            <YAxis domain={[-95, -30]} fontSize={12} />
                            <Tooltip
                                labelFormatter={(t) => new Date(t).toLocaleString()}
                                contentStyle={{ backgroundColor: 'hsl(var(--card))' }}
                            />
                            <Line type="monotone" dataKey="rssi" stroke="#10b981" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground bg-muted/10 rounded-md border border-dashed">
                        No Data Available
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

// ==================== LATENCY CHART WIDGET ====================
export function LatencyChartWidget({
                                       probeId = "all",
                                       range = "24h",
                                       title = "Latency Trend"
                                   }: {
    probeId?: string
    range?: AnalyticsTimeRange
    title?: string
}) {
    const rangeToHours = { "1h": 1, "6h": 6, "24h": 24, "7d": 168 }
    const hours = rangeToHours[range]

    const getDateRange = () => {
        const end = new Date()
        const start = new Date()
        start.setHours(end.getHours() - hours)
        return { start: start.toISOString(), end: end.toISOString() }
    }

    const getInterval = () => {
        if (range === '1h') return '1 minute'
        if (range === '6h') return '5 minutes'
        if (range === '24h') return '1 hour'
        return '6 hours'
    }

    const { data: chartData = [] } = useQuery({
        queryKey: ["widget-latency", range, probeId],
        queryFn: async () => {
            const { start, end } = getDateRange()
            const interval = getInterval()
            const params = new URLSearchParams({
                start_time: start,
                end_time: end,
                interval
            })

            if (probeId !== 'all') {
                params.append("probe_id", probeId)
            }

            const res = await fetch(`/api/v1/analytics/timeseries/latency?${params}`)
            if (!res.ok) return []
            const data: TimeSeriesPoint[] = await res.json()

            return data.map(p => ({
                timestamp: p.timestamp,
                latency: p.value
            }))
        }
    })

    const source = probeId === "all" ? "All Probes" : `Probe ${probeId}`

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>{title}</span>
                    <Badge variant="outline" className="text-xs font-normal">
                        {source} • {range}
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="timestamp"
                                tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                minTickGap={30}
                                fontSize={10}
                            />
                            <YAxis fontSize={12} />
                            <Tooltip
                                labelFormatter={(t) => new Date(t).toLocaleString()}
                                contentStyle={{ backgroundColor: 'hsl(var(--card))' }}
                            />
                            <Area type="monotone" dataKey="latency" stroke="#3b82f6" fill="url(#colorLatency)" />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground bg-muted/10 rounded-md border border-dashed">
                        No Data Available
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

// ==================== RECENT DEEP SCANS WIDGET ====================
export function RecentDeepScansWidget({
                                          probeId,
                                          limit = 5,
                                          title = "Recent Deep Scans"
                                      }: {
    probeId: string
    limit?: number
    title?: string
}) {
    const { data: scans = [], isLoading } = useQuery<Command[]>({
        queryKey: ["widget-scans", probeId, limit],
        queryFn: async () => {
            const res = await fetch(`/api/v1/commands/probe/${probeId}?limit=50`)
            if (!res.ok) return []
            const raw = await res.json()
            const cmds = Array.isArray(raw) ? raw : []
            return cmds
                .filter((c: any) => c.command_type === 'deep_scan')
                .sort((a: Command, b: Command) =>
                    new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime()
                )
                .slice(0, limit)
        },
        refetchInterval: 5000,
        enabled: !!probeId && probeId !== "all"
    })

    if (probeId === "all" || !probeId) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Radio className="h-4 w-4" />
                        {title}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                        <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
                        <p className="text-sm">Select a specific probe to view scans</p>
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
                        <Radio className="h-4 w-4" />
                        {title}
                    </span>
                    <Badge variant="outline" className="text-xs font-normal">
                        Probe {probeId}
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex items-center justify-center h-[200px]">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : scans.length > 0 ? (
                    <ScrollArea className="h-[200px]">
                        <div className="space-y-2">
                            {scans.map((scan) => (
                                <div
                                    key={scan.id}
                                    className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-semibold text-sm">Scan #{scan.id}</span>
                                        {scan.status === 'processing' ? (
                                            <Badge variant="secondary" className="text-[10px] h-5 animate-pulse">
                                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                                Running
                                            </Badge>
                                        ) : (
                                            <Badge
                                                variant={scan.status === 'completed' ? 'default' : 'outline'}
                                                className="text-[10px] h-5"
                                            >
                                                {scan.status}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {new Date(scan.issued_at).toLocaleString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                ) : (
                    <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                        <Radio className="h-8 w-8 mb-2 opacity-50" />
                        <p className="text-sm">No scans recorded yet</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
export function ProbeComparisonWidget({
                                          title = "Probe Comparison",
                                          range = "24h",
                                          maxProbes = 4
                                      }: {
    title?: string
    range?: AnalyticsTimeRange
    maxProbes?: number
}) {
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [selectedProbeIds, setSelectedProbeIds] = useState<string[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "maintenance">("active")

    const rangeToHours = { "1h": 1, "6h": 6, "24h": 24, "7d": 168 }
    const hours = rangeToHours[range]

    const { data: probes = [] } = useQuery<Probe[]>({
        queryKey: ["widget-comparison-probes"],
        queryFn: async () => {
            const res = await fetch("/api/v1/probes")
            if (!res.ok) throw new Error("Failed to fetch probes")
            return res.json()
        }
    })

    const { data: comparisonData, isLoading, isError } = useQuery<ProbeComparison[]>({
        queryKey: ["widget-comparison-data", selectedProbeIds, hours],
        queryFn: async () => {
            if (selectedProbeIds.length === 0) return []

            const params = new URLSearchParams({ hours: hours.toString() })
            selectedProbeIds.forEach(id => params.append("probe_ids", id))

            const res = await fetch(`/api/v1/analytics/comparison?${params}`)
            if (!res.ok) throw new Error("Failed to fetch comparison")
            return res.json()
        },
        enabled: selectedProbeIds.length > 0
    })

    const filteredProbes = useMemo(() => {
        return probes.filter(p => {
            const matchesSearch = p.probe_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.building?.toLowerCase().includes(searchQuery.toLowerCase())
            const matchesStatus = statusFilter === "all" || p.status === statusFilter
            return matchesSearch && matchesStatus
        })
    }, [probes, searchQuery, statusFilter])

    const toggleProbe = (probeId: string) => {
        setSelectedProbeIds(prev => {
            if (prev.includes(probeId)) {
                return prev.filter(id => id !== probeId)
            } else {
                if (prev.length >= maxProbes) {
                    return prev
                }
                return [...prev, probeId]
            }
        })
    }

    const removeProbe = (probeId: string) => {
        setSelectedProbeIds(prev => prev.filter(id => id !== probeId))
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'active':
                return <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            case 'inactive':
                return <XCircle className="h-3 w-3 text-red-500" />
            case 'maintenance':
                return <AlertTriangle className="h-3 w-3 text-amber-500" />
            default:
                return <Radio className="h-3 w-3 text-muted-foreground" />
        }
    }

    // Transform data for charts
    const chartData = useMemo(() => {
        if (!comparisonData || comparisonData.length === 0) return []

        return [
            {
                metric: "RSSI",
                ...comparisonData.reduce((acc, probe) => ({
                    ...acc,
                    [probe.probe_id]: probe.avg_rssi
                }), {})
            },
            {
                metric: "Latency",
                ...comparisonData.reduce((acc, probe) => ({
                    ...acc,
                    [probe.probe_id]: probe.avg_latency
                }), {})
            },
            {
                metric: "Loss %",
                ...comparisonData.reduce((acc, probe) => ({
                    ...acc,
                    [probe.probe_id]: probe.avg_packet_loss
                }), {})
            },
            {
                metric: "Stability",
                ...comparisonData.reduce((acc, probe) => ({
                    ...acc,
                    [probe.probe_id]: probe.stability_score
                }), {})
            }
        ]
    }, [comparisonData])

    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" />
                            {title}
                        </span>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsDialogOpen(true)}
                        >
                            Select Probes
                        </Button>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Selected Probes Pills */}
                    {selectedProbeIds.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                            {selectedProbeIds.map((id) => {
                                const probe = probes.find(p => p.probe_id === id)
                                return (
                                    <Badge
                                        key={id}
                                        variant="secondary"
                                        className="pl-2 pr-1 py-1 flex items-center gap-1"
                                    >
                                        <span className="text-xs font-mono">{id}</span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-4 w-4 p-0 hover:bg-transparent"
                                            onClick={() => removeProbe(id)}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </Badge>
                                )
                            })}
                        </div>
                    )}

                    {selectedProbeIds.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                            <BarChart3 className="h-8 w-8 mb-2 opacity-50" />
                            <p className="text-sm">Select 2-{maxProbes} probes to compare</p>
                        </div>
                    ) : selectedProbeIds.length === 1 ? (
                        <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                            <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
                            <p className="text-sm">Select at least one more probe</p>
                        </div>
                    ) : isLoading ? (
                        <div className="flex items-center justify-center h-[300px]">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : isError ? (
                        <div className="flex flex-col items-center justify-center h-[300px] text-destructive">
                            <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
                            <p className="text-sm">Failed to load comparison</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Comparison Chart */}
                            <div className="h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="metric" fontSize={11} />
                                        <YAxis fontSize={11} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'hsl(var(--card))' }}
                                            cursor={{ fill: 'transparent' }}
                                        />
                                        <Legend
                                            wrapperStyle={{ fontSize: '11px' }}
                                            formatter={(value) => {
                                                const probe = probes.find(p => p.probe_id === value)
                                                return probe?.location || value
                                            }}
                                        />
                                        {selectedProbeIds.map((probeId, index) => (
                                            <Bar
                                                key={probeId}
                                                dataKey={probeId}
                                                fill={colors[index % colors.length]}
                                                radius={[4, 4, 0, 0]}
                                            />
                                        ))}
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Stats Table */}
                            <div className="border rounded-lg overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead className="bg-muted/50">
                                        <tr>
                                            <th className="text-left p-2 font-medium">Probe</th>
                                            <th className="text-right p-2 font-medium">RSSI</th>
                                            <th className="text-right p-2 font-medium">Latency</th>
                                            <th className="text-right p-2 font-medium">Loss</th>
                                            <th className="text-right p-2 font-medium">Score</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {comparisonData?.map((probe, index) => (
                                            <tr key={probe.probe_id} className="border-t">
                                                <td className="p-2">
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="w-2 h-2 rounded-full"
                                                            style={{ backgroundColor: colors[index % colors.length] }}
                                                        />
                                                        <div>
                                                            <div className="font-mono text-[10px]">{probe.probe_id}</div>
                                                            <div className="text-[9px] text-muted-foreground">{probe.location}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="text-right p-2 font-mono">{probe.avg_rssi.toFixed(0)} dBm</td>
                                                <td className="text-right p-2 font-mono">{probe.avg_latency.toFixed(0)} ms</td>
                                                <td className="text-right p-2 font-mono">{probe.avg_packet_loss.toFixed(2)}%</td>
                                                <td className="text-right p-2 font-mono">{probe.stability_score.toFixed(0)}%</td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Meta Info */}
                            <div className="text-[10px] text-muted-foreground text-center pt-2 border-t">
                                Time Range: Last {range} • Samples: {comparisonData?.[0]?.sample_count || 0}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Probe Selection Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            Select Probes to Compare ({selectedProbeIds.length}/{maxProbes})
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        {/* Search and Filters */}
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by ID, location, or building..."
                                    className="pl-8"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                                <TabsList>
                                    <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                                    <TabsTrigger value="active" className="text-xs">Active</TabsTrigger>
                                    <TabsTrigger value="inactive" className="text-xs">Inactive</TabsTrigger>
                                    <TabsTrigger value="maintenance" className="text-xs">Maintenance</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        {/* Selected Count */}
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                                {selectedProbeIds.length} selected
                            </span>
                            {selectedProbeIds.length >= maxProbes && (
                                <Badge variant="secondary" className="text-xs">
                                    Maximum reached
                                </Badge>
                            )}
                        </div>

                        {/* Probe List */}
                        <ScrollArea className="h-[400px] border rounded-lg">
                            <div className="p-2 space-y-2">
                                {filteredProbes.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                                        <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
                                        <p className="text-sm">No probes found</p>
                                    </div>
                                ) : (
                                    filteredProbes.map((probe) => {
                                        const isSelected = selectedProbeIds.includes(probe.probe_id)
                                        const isDisabled = !isSelected && selectedProbeIds.length >= maxProbes

                                        return (
                                            <div
                                                key={probe.probe_id}
                                                className={cn(
                                                    "p-3 border rounded-lg transition-colors",
                                                    isSelected && "bg-primary/5 border-primary",
                                                    !isDisabled && "cursor-pointer hover:bg-muted/50",
                                                    isDisabled && "opacity-50 cursor-not-allowed"
                                                )}
                                                onClick={() => !isDisabled && toggleProbe(probe.probe_id)}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3 flex-1">
                                                        <Checkbox
                                                            checked={isSelected}
                                                            disabled={isDisabled}
                                                            onCheckedChange={() => !isDisabled && toggleProbe(probe.probe_id)}
                                                        />
                                                        {getStatusIcon(probe.status)}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-mono font-medium text-sm">
                                                                {probe.probe_id}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground truncate">
                                                                {probe.location || 'Unknown'} {probe.building && `• ${probe.building}`}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Badge
                                                        variant={probe.status === 'active' ? 'default' : 'outline'}
                                                        className="text-[10px] h-5 ml-2"
                                                    >
                                                        {probe.status}
                                                    </Badge>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </ScrollArea>

                        {/* Action Buttons */}
                        <div className="flex justify-between items-center pt-2 border-t">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedProbeIds([])}
                                disabled={selectedProbeIds.length === 0}
                            >
                                Clear All
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => setIsDialogOpen(false)}
                                disabled={selectedProbeIds.length < 2}
                            >
                                Compare Selected
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}