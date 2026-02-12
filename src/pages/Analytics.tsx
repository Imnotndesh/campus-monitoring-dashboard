import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, BarChart, Bar, Cell, ScatterChart, Scatter
} from "recharts"
import {
    Activity, Calendar, Signal, TrendingDown, Radio, Search, Trash2,
    Wifi, ArrowDownUp, Zap, AlertTriangle, Loader2, AlertCircle, Layers, BarChart3,
    AlertOctagon, TrendingUp, Network, WifiOff
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// --- Types ---
type AnalyticsTimeRange = "1h" | "6h" | "24h" | "7d"
type Probe = { probe_id: string; location: string; building?: string; status?: string }
type Command = {
    id: number
    status: string
    result: any
    issued_at: string
    command_type: string
    probe_id: string
}

type TimeSeriesPoint = { timestamp: string; value: number }
type Anomaly = {
    type: string
    severity: string
    description: string
    timestamp: string
    probe_id?: string
}

type RoamingEvent = {
    from_ap: string
    to_ap: string
    timestamp: string
    rssi_before: number
    rssi_after: number
    latency_delta: number
}

type APStats = {
    bssid: string
    avg_rssi: number
    connection_count: number
    avg_latency: number
    most_common_channel: number
}

type ChannelData = {
    channel: number
    count: number
    avg_rssi?: number
}

type CongestionData = {
    rating: string
    count: number
    avg_congestion?: number
}

type PerformanceMetrics = {
    avg_rssi: number
    min_rssi: number
    max_rssi: number
    avg_latency: number
    min_latency: number
    max_latency: number
    avg_packet_loss: number
    stability_score: number
    sample_count: number
}

type NetworkHealth = {
    total_probes: number
    active_probes: number
    avg_rssi: number
    avg_latency: number
    avg_packet_loss: number
    stability_score: number
}

export default function Analytics() {
    const queryClient = useQueryClient()
    const [selectedProbe, setSelectedProbe] = useState<string>("all")
    const [range, setRange] = useState<AnalyticsTimeRange>("24h")
    const [selectedScanId, setSelectedScanId] = useState<number | null>(null)
    const [comparisonProbes, setComparisonProbes] = useState<string[]>([])

    // --- Helper: Date Ranges & Hours ---
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

    // --- 1. Fetch Probes ---
    const { data: probes = [] } = useQuery<Probe[]>({
        queryKey: ["probes"],
        queryFn: async () => {
            const res = await fetch("/api/v1/probes")
            if (!res.ok) throw new Error("Failed to fetch probes")
            return res.json()
        }
    })

    // --- 2. Fetch TimeSeries (RSSI & Latency) ---
    const { data: chartData = [] } = useQuery({
        queryKey: ["chartData", range, selectedProbe],
        queryFn: async () => {
            const { start, end } = getDateRange()
            const interval = getInterval()
            const params = new URLSearchParams({
                start_time: start,
                end_time: end,
                interval
            })

            if (selectedProbe !== 'all') {
                params.append("probe_id", selectedProbe)
            }

            const [rssiRes, latencyRes] = await Promise.all([
                fetch(`/api/v1/analytics/timeseries/rssi?${params}`),
                fetch(`/api/v1/analytics/timeseries/latency?${params}`)
            ])

            const rssiData: TimeSeriesPoint[] = rssiRes.ok ? await rssiRes.json() : []
            const latencyData: TimeSeriesPoint[] = latencyRes.ok ? await latencyRes.json() : []

            // Merge by timestamp
            const dataMap = new Map<string, { timestamp: string, rssi: number | null, latency: number | null }>()

            rssiData.forEach(p => {
                const existing = dataMap.get(p.timestamp) || { timestamp: p.timestamp, rssi: null, latency: null }
                existing.rssi = p.value
                dataMap.set(p.timestamp, existing)
            })

            latencyData.forEach(p => {
                const existing = dataMap.get(p.timestamp) || { timestamp: p.timestamp, rssi: null, latency: null }
                existing.latency = p.value
                dataMap.set(p.timestamp, existing)
            })

            return Array.from(dataMap.values()).sort((a, b) =>
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            )
        }
    })

    // --- 3. Network Health or Performance Stats ---
    const { data: stats } = useQuery<NetworkHealth | PerformanceMetrics>({
        queryKey: ["stats", range, selectedProbe],
        queryFn: async () => {
            if (selectedProbe === 'all') {
                const res = await fetch("/api/v1/analytics/health")
                if (!res.ok) throw new Error("Failed to fetch health")
                return res.json()
            } else {
                const { start, end } = getDateRange()
                const params = new URLSearchParams({ start_time: start, end_time: end })
                const res = await fetch(`/api/v1/analytics/performance/${selectedProbe}?${params}`)
                if (!res.ok) throw new Error("Failed to fetch performance")
                return res.json()
            }
        }
    })

    // --- 4. Channel Distribution ---
    const { data: channels = [] } = useQuery<ChannelData[]>({
        queryKey: ["channels", range],
        queryFn: async () => {
            const { start, end } = getDateRange()
            const params = new URLSearchParams({ start_time: start, end_time: end })
            const res = await fetch(`/api/v1/analytics/channels?${params}`)
            if (!res.ok) return []
            return res.json()
        },
        enabled: selectedProbe === 'all'
    })

    // --- 5. Access Point Analysis ---
    const { data: apData = [] } = useQuery<APStats[]>({
        queryKey: ["aps", hours],
        queryFn: async () => {
            const res = await fetch(`/api/v1/analytics/aps?hours=${hours}`)
            if (!res.ok) return []
            return res.json()
        },
        enabled: selectedProbe === 'all'
    })

    // --- 6. Congestion Analysis ---
    const { data: congestion = [] } = useQuery<CongestionData[]>({
        queryKey: ["congestion", hours],
        queryFn: async () => {
            const res = await fetch(`/api/v1/analytics/congestion?hours=${hours}`)
            if (!res.ok) return []
            return res.json()
        },
        enabled: selectedProbe === 'all'
    })

    // --- 7. Anomalies ---
    const { data: anomalies = [] } = useQuery<Anomaly[]>({
        queryKey: ["anomalies", selectedProbe, hours],
        queryFn: async () => {
            if (selectedProbe === 'all') return []
            const res = await fetch(`/api/v1/analytics/anomalies/${selectedProbe}?hours=${hours}`)
            if (!res.ok) return []
            return res.json()
        },
        enabled: selectedProbe !== 'all'
    })

    // --- 8. Roaming Analysis ---
    const { data: roaming } = useQuery<{ events: RoamingEvent[], total_events: number, avg_latency_delta: number }>({
        queryKey: ["roaming", selectedProbe, hours],
        queryFn: async () => {
            if (selectedProbe === 'all') return null
            const res = await fetch(`/api/v1/analytics/roaming/${selectedProbe}?hours=${hours}`)
            if (!res.ok) return null
            return res.json()
        },
        enabled: selectedProbe !== 'all'
    })

    // --- 9. Probe Comparison ---
    const { data: comparison } = useQuery({
        queryKey: ["comparison", comparisonProbes, hours],
        queryFn: async () => {
            if (comparisonProbes.length < 2) return null
            const params = new URLSearchParams({ hours: hours.toString() })
            comparisonProbes.forEach(p => params.append("probe_ids", p))
            const res = await fetch(`/api/v1/analytics/comparison?${params}`)
            if (!res.ok) return null
            return res.json()
        },
        enabled: comparisonProbes.length >= 2
    })

    // --- 10. Deep Scans ---
    const { data: scans = [] } = useQuery<Command[]>({
        queryKey: ["deep_scans", selectedProbe],
        queryFn: async () => {
            if (selectedProbe === "all") return []
            const res = await fetch(`/api/v1/commands?probe_id=${selectedProbe}&limit=50`)
            if (!res.ok) return []
            const cmds = await res.json()
            return cmds
                .filter((c: Command) => c.command_type === 'deep_scan')
                .sort((a: Command, b: Command) =>
                    new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime()
                )
        },
        enabled: selectedProbe !== "all",
        refetchInterval: 5000
    })

    // --- Mutations ---
    const triggerScanMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/v1/probes/${selectedProbe}/command`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: 'deep_scan', params: {} })
            })
            if (!res.ok) throw new Error("Failed to trigger scan")
            return res.json()
        },
        onSuccess: () => {
            toast.success("Deep Scan Initiated")
            queryClient.invalidateQueries({ queryKey: ["deep_scans"] })
        },
        onError: () => {
            toast.error("Failed to start scan")
        }
    })

    const deleteScanMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/v1/commands/${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error("Failed to delete")
        },
        onSuccess: (_, deletedId) => {
            toast.success("Scan deleted")
            if (selectedScanId === deletedId) setSelectedScanId(null)
            queryClient.invalidateQueries({ queryKey: ["deep_scans"] })
        }
    })

    // --- Computed Values ---
    const normalizedStats = useMemo(() => {
        if (!stats) return null

        const getVal = (keys: string[]) => {
            for (const k of keys) {
                if ((stats as any)[k] !== undefined && (stats as any)[k] !== null) {
                    return (stats as any)[k]
                }
            }
            return null
        }

        const rssi = getVal(['avg_rssi', 'rssi'])
        const latency = getVal(['avg_latency', 'latency'])
        const loss = getVal(['avg_packet_loss', 'packet_loss'])
        const score = getVal(['stability_score', 'stabilityScore'])

        // Treat 0 RSSI as invalid
        const validRssi = (rssi && rssi < 0) ? rssi : null

        return {
            rssi: validRssi,
            latency: latency || 0,
            loss: loss || 0,
            score: score || 0,
            activeProbes: (stats as NetworkHealth).active_probes,
            totalProbes: (stats as NetworkHealth).total_probes,
            sampleCount: (stats as PerformanceMetrics).sample_count
        }
    }, [stats])

    const activeScan = scans.find(s => s.id === selectedScanId) || scans[0] || null

    // --- Formatting ---
    const fmt = (val: any, unit: string, fixed = 0) =>
        (val !== null && val !== undefined) ? `${Number(val).toFixed(fixed)}${unit}` : "--"

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Network Intelligence</h2>
                    <p className="text-muted-foreground">
                        Real-time telemetry, spectrum analysis, and network diagnostics
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={selectedProbe} onValueChange={(val) => {
                        setSelectedProbe(val)
                        setSelectedScanId(null)
                        setComparisonProbes([])
                    }}>
                        <SelectTrigger className="w-[200px] bg-background">
                            <SelectValue placeholder="Select Scope" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Whole Network</SelectItem>
                            {probes.map((p) => (
                                <SelectItem key={p.probe_id} value={p.probe_id}>
                                    {p.location || p.probe_id}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="flex bg-muted p-1 rounded-md">
                        {(['1h', '6h', '24h', '7d'] as AnalyticsTimeRange[]).map((r) => (
                            <button
                                key={r}
                                onClick={() => setRange(r)}
                                className={`px-3 py-1 text-xs font-medium rounded-sm transition-all ${
                                    range === r
                                        ? "bg-background shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                {r.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <KpiCard
                    title="Network Stability"
                    value={fmt(normalizedStats?.score, "%")}
                    desc={selectedProbe === 'all' ? 'Health Score' : `Score (${normalizedStats?.sampleCount || 0} samples)`}
                    icon={<Activity className="h-4 w-4 text-emerald-500" />}
                />
                <KpiCard
                    title="Avg Latency"
                    value={fmt(normalizedStats?.latency, " ms")}
                    desc={`Last ${range}`}
                    icon={<Calendar className="h-4 w-4 text-blue-500" />}
                />
                <KpiCard
                    title="Avg Signal"
                    value={fmt(normalizedStats?.rssi, " dBm")}
                    desc="Signal Strength"
                    icon={<Signal className="h-4 w-4 text-purple-500" />}
                />
                <KpiCard
                    title="Packet Loss"
                    value={fmt(normalizedStats?.loss, "%", 2)}
                    desc={selectedProbe === 'all' && normalizedStats?.activeProbes
                        ? `${normalizedStats.activeProbes}/${normalizedStats.totalProbes} Active`
                        : 'Drop Rate'}
                    icon={<TrendingDown className="h-4 w-4 text-amber-500" />}
                />
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    {selectedProbe === 'all' && <TabsTrigger value="spectrum">Spectrum & APs</TabsTrigger>}
                    {selectedProbe !== 'all' && <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>}
                    {selectedProbe !== 'all' && <TabsTrigger value="deepscan">Deep Scan</TabsTrigger>}
                    {selectedProbe === 'all' && <TabsTrigger value="comparison">Compare Probes</TabsTrigger>}
                </TabsList>

                {/* TAB: OVERVIEW */}
                <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        <Card className="col-span-4">
                            <CardHeader>
                                <CardTitle>Latency Trend</CardTitle>
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
                                                tickFormatter={(t) =>
                                                    new Date(t).toLocaleTimeString([], {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })
                                                }
                                                minTickGap={30}
                                                fontSize={10}
                                            />
                                            <YAxis fontSize={12} />
                                            <Tooltip
                                                labelFormatter={(t) => new Date(t).toLocaleString()}
                                                contentStyle={{ backgroundColor: 'hsl(var(--card))' }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="latency"
                                                connectNulls
                                                stroke="#3b82f6"
                                                fill="url(#colorLatency)"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <NoData />
                                )}
                            </CardContent>
                        </Card>
                        <Card className="col-span-3">
                            <CardHeader>
                                <CardTitle>Signal Quality (RSSI)</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                {chartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="timestamp" hide />
                                            <YAxis domain={[-95, -30]} fontSize={12} />
                                            <Tooltip
                                                labelFormatter={(t) => new Date(t).toLocaleString()}
                                                contentStyle={{ backgroundColor: 'hsl(var(--card))' }}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="rssi"
                                                connectNulls
                                                stroke="#10b981"
                                                strokeWidth={2}
                                                dot={false}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <NoData />
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* TAB: SPECTRUM & APs */}
                <TabsContent value="spectrum" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart3 className="h-4 w-4" /> Channel Distribution
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                {channels.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={channels}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="channel" />
                                            <YAxis allowDecimals={false} />
                                            <Tooltip
                                                cursor={{ fill: 'transparent' }}
                                                contentStyle={{ backgroundColor: 'hsl(var(--card))' }}
                                            />
                                            <Bar dataKey="count" fill="#8884d8" radius={[4, 4, 0, 0]}>
                                                {channels.map((entry, index) => (
                                                    <Cell
                                                        key={`cell-${index}`}
                                                        fill={entry.count > 5 ? '#ef4444' : '#3b82f6'}
                                                    />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <NoData />
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Layers className="h-4 w-4" /> Congestion Ratings
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="h-[300px] flex items-center justify-center">
                                {congestion.length > 0 ? (
                                    <div className="w-full space-y-4">
                                        {congestion.map((c, i) => {
                                            // 1. Safety check: ensure rating exists, otherwise default to "Unknown"
                                            const safeRating = c.rating || "unknown"

                                            return (
                                                // Use index 'i' in key fallback just in case rating is missing
                                                <div key={safeRating + i} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className={`w-3 h-3 rounded-full ${
                                                                safeRating.toLowerCase() === 'good'
                                                                    ? 'bg-emerald-500'
                                                                    : safeRating.toLowerCase() === 'bad'
                                                                        ? 'bg-yellow-500'
                                                                        : 'bg-red-500'
                                                            }`}
                                                        />
                                                        <span className="font-medium">{safeRating.toUpperCase()}</span>
                                                    </div>
                                                    <Badge variant="secondary">{c.count} Probes</Badge>
                                                </div>
                                            )
                                        })}
                                    </div>
                                ) : (
                                    <NoData />
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Access Points Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Network className="h-4 w-4" /> Access Point Analysis
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {apData.length > 0 ? (
                                <ScrollArea className="h-[300px]">
                                    <div className="space-y-2">
                                        {apData.map((ap, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                                            >
                                                <div className="space-y-1">
                                                    <div className="font-mono text-sm font-semibold">{ap.bssid}</div>
                                                    <div className="flex gap-3 text-xs text-muted-foreground">
                                                        <span>Channel {ap.most_common_channel}</span>
                                                        <span>•</span>
                                                        <span>{ap.connection_count} connections</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-4 text-right">
                                                    <div>
                                                        <div className="text-xs text-muted-foreground">RSSI</div>
                                                        <div className="font-semibold">
                                                            {ap.avg_rssi?.toFixed(0) ?? '--'} dBm
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-muted-foreground">Latency</div>
                                                        <div className="font-semibold">
                                                            {ap.avg_latency?.toFixed(1) ?? '--'} ms
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            ) : (
                                <NoData />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB: DIAGNOSTICS */}
                <TabsContent value="diagnostics" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        {/* Anomalies */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <AlertOctagon className="h-4 w-4 text-orange-500" /> Detected Anomalies
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[300px]">
                                    {anomalies.length > 0 ? (
                                        anomalies.map((a, i) => (
                                            <div
                                                key={i}
                                                className="flex items-start gap-3 mb-4 border-b pb-3 last:border-0"
                                            >
                                                <Badge
                                                    variant={
                                                        a.severity === 'critical' ? 'destructive' : 'outline'
                                                    }
                                                >
                                                    {a.severity}
                                                </Badge>
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium">{a.type}</p>
                                                    <p className="text-xs text-muted-foreground">{a.description}</p>
                                                    <p className="text-[10px] text-muted-foreground mt-1">
                                                        {new Date(a.timestamp).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                                            No anomalies detected
                                        </div>
                                    )}
                                </ScrollArea>
                            </CardContent>
                        </Card>

                        {/* Roaming Events */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ArrowDownUp className="h-4 w-4 text-blue-500" /> Roaming Analysis
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {roaming && roaming.events ? (
                                    <div className="space-y-4">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Total Events:</span>
                                            <span className="font-semibold">{roaming.total_events}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Avg Latency Delta:</span>
                                            <span className="font-semibold">
                                                {roaming.avg_latency_delta?.toFixed(1) || 0} ms
                                            </span>
                                        </div>
                                        <ScrollArea className="h-[220px]">
                                            {roaming.events.map((event, i) => (
                                                <div
                                                    key={i}
                                                    className="p-2 border rounded mb-2 text-xs space-y-1"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <WifiOff className="h-3 w-3 text-red-500" />
                                                        <span className="font-mono">{event.from_ap}</span>
                                                        <span>→</span>
                                                        <Wifi className="h-3 w-3 text-green-500" />
                                                        <span className="font-mono">{event.to_ap}</span>
                                                    </div>
                                                    <div className="text-muted-foreground">
                                                        RSSI: {event.rssi_before} → {event.rssi_after} dBm
                                                    </div>
                                                    <div className="text-muted-foreground">
                                                        {new Date(event.timestamp).toLocaleString()}
                                                    </div>
                                                </div>
                                            ))}
                                        </ScrollArea>
                                    </div>
                                ) : (
                                    <NoData />
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* TAB: DEEP SCAN */}
                <TabsContent value="deepscan" className="space-y-4">
                    <div className="flex items-center justify-between bg-muted/30 p-4 rounded-lg border">
                        <div>
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Search className="h-5 w-5 text-primary" /> Active Inspector
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Trigger on-demand packet analysis for {selectedProbe}
                            </p>
                        </div>
                        <Button
                            onClick={() => triggerScanMutation.mutate()}
                            disabled={triggerScanMutation.isPending}
                        >
                            {triggerScanMutation.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Radio className="mr-2 h-4 w-4" />
                            )}
                            {triggerScanMutation.isPending ? "Starting..." : "Run New Scan"}
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[500px]">
                        <Card className="md:col-span-1 flex flex-col">
                            <CardHeader className="pb-2 bg-muted/20">
                                <CardTitle className="text-sm">Scan History</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 p-0 overflow-hidden">
                                <ScrollArea className="h-full">
                                    {scans.map((scan) => (
                                        <div
                                            key={scan.id}
                                            onClick={() => setSelectedScanId(scan.id)}
                                            className={`p-3 border-b cursor-pointer transition-all text-sm flex justify-between items-center group
                                                ${
                                                selectedScanId === scan.id ||
                                                (!selectedScanId && activeScan?.id === scan.id)
                                                    ? "bg-primary/5 border-l-4 border-l-primary"
                                                    : "hover:bg-muted/50 border-l-4 border-l-transparent"
                                            }`}
                                        >
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-semibold">#{scan.id}</span>
                                                    {scan.status === 'processing' || scan.status === 'pending' ? (
                                                        <Badge
                                                            variant="secondary"
                                                            className="text-[10px] h-5 animate-pulse text-blue-500"
                                                        >
                                                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />{' '}
                                                            Running
                                                        </Badge>
                                                    ) : (
                                                        <Badge
                                                            variant={
                                                                scan.status === 'completed'
                                                                    ? 'default'
                                                                    : 'outline'
                                                            }
                                                            className="text-[10px] h-5"
                                                        >
                                                            {scan.status}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {new Date(scan.issued_at).toLocaleTimeString()}
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    if (confirm("Delete this scan?")) {
                                                        deleteScanMutation.mutate(scan.id)
                                                    }
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    {scans.length === 0 && (
                                        <div className="p-8 text-center text-muted-foreground text-sm">
                                            No scans recorded
                                        </div>
                                    )}
                                </ScrollArea>
                            </CardContent>
                        </Card>

                        <Card className="md:col-span-2 flex flex-col overflow-hidden border-t-4 border-t-primary/20">
                            {activeScan ? (
                                activeScan.status === 'processing' || activeScan.status === 'pending' ? (
                                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 bg-muted/10">
                                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                                        <p>Analysis in Progress...</p>
                                    </div>
                                ) : (
                                    <DeepScanVisualizer scan={activeScan} />
                                )
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-muted/10">
                                    <Search className="h-8 w-8 opacity-40 mb-2" />
                                    <p>Select a completed scan</p>
                                </div>
                            )}
                        </Card>
                    </div>
                </TabsContent>

                {/* TAB: COMPARISON */}
                <TabsContent value="comparison" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Compare Probes</CardTitle>
                            <div className="flex gap-2 flex-wrap mt-2">
                                {probes.slice(0, 6).map(p => (
                                    <Button
                                        key={p.probe_id}
                                        size="sm"
                                        variant={comparisonProbes.includes(p.probe_id) ? "default" : "outline"}
                                        onClick={() => {
                                            setComparisonProbes(prev =>
                                                prev.includes(p.probe_id)
                                                    ? prev.filter(id => id !== p.probe_id)
                                                    : prev.length < 4
                                                        ? [...prev, p.probe_id]
                                                        : prev
                                            )
                                        }}
                                    >
                                        {p.location || p.probe_id}
                                    </Button>
                                ))}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {comparison && comparisonProbes.length >= 2 ? (
                                <div className="space-y-4">
                                    <ScrollArea className="h-[400px]">
                                        {comparison.map((probe: any, i: number) => (
                                            <div key={i} className="p-4 border rounded-lg mb-3 space-y-2">
                                                <h4 className="font-semibold">{probe.probe_id}</h4>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                                    <div>
                                                        <span className="text-muted-foreground">Avg RSSI:</span>
                                                        <div className="font-semibold">{probe.avg_rssi?.toFixed(0) || '--'} dBm</div>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">Avg Latency:</span>
                                                        <div className="font-semibold">{probe.avg_latency?.toFixed(1) || '--'} ms</div>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">Packet Loss:</span>
                                                        <div className="font-semibold">{probe.avg_packet_loss?.toFixed(2) || '--'}%</div>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">Stability:</span>
                                                        <div className="font-semibold">{probe.stability_score?.toFixed(0) || '--'}%</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </ScrollArea>
                                </div>
                            ) : (
                                <div className="flex h-[400px] items-center justify-center text-muted-foreground">
                                    Select 2-4 probes to compare
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}

function DeepScanVisualizer({ scan }: { scan: Command }) {
    const data = scan.result || {}
    const isError = !data.rssi && !data.snr && !data.channel

    if (isError) {
        return (
            <div className="p-6 flex flex-col items-center justify-center h-full">
                <AlertCircle className="h-8 w-8 text-amber-500 mb-2" />
                <p className="text-muted-foreground mb-4">Scan data unavailable or malformed</p>
                <pre className="bg-muted p-4 rounded text-xs max-w-full overflow-auto">
                    {JSON.stringify(data, null, 2)}
                </pre>
            </div>
        )
    }

    const getQualityColor = (q: number) =>
        q > 80 ? "bg-emerald-500" : q > 50 ? "bg-yellow-500" : "bg-red-500"

    return (
        <div className="flex flex-col h-full">
            <CardHeader className="py-3 px-6 bg-muted/30 border-b flex justify-between flex-row items-center">
                <div className="flex gap-2 items-center">
                    <Wifi className="h-5 w-5 text-primary" />
                    <span className="font-semibold">RF Analysis</span>
                </div>
                <Badge variant="outline">CH {data.channel || '--'}</Badge>
            </CardHeader>
            <ScrollArea className="flex-1">
                <div className="p-6 space-y-6">
                    {data.linkQuality !== undefined && (
                        <div className="flex flex-col items-center p-4 border rounded bg-card relative overflow-hidden">
                            <div className="absolute left-0 top-0 w-1 h-full bg-primary"></div>
                            <span className="text-xs uppercase text-muted-foreground">Link Quality</span>
                            <span className="text-4xl font-bold">{data.linkQuality?.toFixed(0)}/100</span>
                            <Progress
                                value={data.linkQuality}
                                className={`h-2 w-full mt-2 ${getQualityColor(data.linkQuality)}`}
                            />
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        {data.rssi !== undefined && (
                            <StatBox label="Signal" value={`${data.rssi} dBm`} icon={<Signal className="h-4 w-4" />} />
                        )}
                        {data.noiseFloor !== undefined && (
                            <StatBox label="Noise" value={`${data.noiseFloor} dBm`} icon={<TrendingDown className="h-4 w-4" />} />
                        )}
                        {data.tcpThroughput !== undefined && (
                            <StatBox
                                label="Throughput"
                                value={`${(data.tcpThroughput / 1000).toFixed(2)} Mbps`}
                                icon={<ArrowDownUp className="h-4 w-4" />}
                            />
                        )}
                        {data.packetLoss !== undefined && (
                            <StatBox label="Loss" value={`${data.packetLoss}%`} icon={<AlertTriangle className="h-4 w-4" />} />
                        )}
                        {data.snr !== undefined && (
                            <StatBox label="SNR" value={`${data.snr} dB`} icon={<Zap className="h-4 w-4" />} />
                        )}
                        {data.phyMode && (
                            <StatBox label="PHY Mode" value={data.phyMode} icon={<Radio className="h-4 w-4" />} />
                        )}
                    </div>
                </div>
            </ScrollArea>
        </div>
    )
}

function StatBox({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
    return (
        <div className="p-3 border rounded bg-background flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-1 text-muted-foreground">
                {icon} <span className="text-[10px] uppercase">{label}</span>
            </div>
            <div className="text-lg font-bold">{value}</div>
        </div>
    )
}

function KpiCard({ title, value, desc, icon }: {
    title: string
    value: string
    desc: string
    icon: React.ReactNode
}) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground">{desc}</p>
            </CardContent>
        </Card>
    )
}

function NoData() {
    return (
        <div className="flex h-full items-center justify-center text-muted-foreground bg-muted/10 rounded-md border border-dashed">
            No Data Available
        </div>
    )
}