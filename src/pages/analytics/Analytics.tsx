import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, BarChart, Bar, Cell, ComposedChart, Legend
} from "recharts"
import {
    Activity, Calendar, Signal, TrendingDown, Radio, Search, Trash2,
    Wifi, ArrowDownUp, Loader2, Layers, BarChart3,
    AlertOctagon, Network, WifiOff
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import type {AnalyticsTimeRange} from "./types"
import { useAnalyticsViewModel } from "./useAnalyticsViewModel"
import { KpiCard, NoData, DeepScanVisualizer } from "./components"

export default function Analytics() {
    const vm = useAnalyticsViewModel()

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
                    <Select value={vm.selectedProbe} onValueChange={(val) => {
                        vm.setSelectedProbe(val)
                        vm.setSelectedScanId(null)
                        vm.setComparisonProbes([])
                    }}>
                        <SelectTrigger className="w-[200px] bg-background">
                            <SelectValue placeholder="Select Scope" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Whole Network</SelectItem>
                            {vm.probes.map((p) => (
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
                                onClick={() => vm.setRange(r)}
                                className={`px-3 py-1 text-xs font-medium rounded-sm transition-all ${
                                    vm.range === r
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
                    value={fmt(vm.normalizedStats?.score, "%")}
                    desc={vm.selectedProbe === 'all' ? 'Health Score' : `Score (${vm.normalizedStats?.sampleCount || 0} samples)`}
                    icon={<Activity className="h-4 w-4 text-emerald-500" />}
                />
                <KpiCard
                    title="Avg Latency"
                    value={fmt(vm.normalizedStats?.latency, " ms")}
                    desc={`Last ${vm.range}`}
                    icon={<Calendar className="h-4 w-4 text-blue-500" />}
                />
                <KpiCard
                    title="Avg Signal"
                    value={fmt(vm.normalizedStats?.rssi, " dBm")}
                    desc="Signal Strength"
                    icon={<Signal className="h-4 w-4 text-purple-500" />}
                />
                <KpiCard
                    title="Packet Loss"
                    value={fmt(vm.normalizedStats?.loss, "%", 2)}
                    desc={vm.selectedProbe === 'all' && vm.normalizedStats?.activeProbes
                        ? `${vm.normalizedStats.activeProbes}/${vm.normalizedStats.totalProbes} Active`
                        : 'Drop Rate'}
                    icon={<TrendingDown className="h-4 w-4 text-amber-500" />}
                />
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    {vm.selectedProbe === 'all' && <TabsTrigger value="spectrum">Spectrum & APs</TabsTrigger>}
                    {vm.selectedProbe !== 'all' && <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>}
                    {vm.selectedProbe !== 'all' && <TabsTrigger value="deepscan">Deep Scan</TabsTrigger>}
                    {vm.selectedProbe === 'all' && <TabsTrigger value="comparison">Compare Probes</TabsTrigger>}
                </TabsList>

                {/* TAB: OVERVIEW */}
                <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        <Card className="col-span-4">
                            <CardHeader>
                                <CardTitle>Latency Trend</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                {vm.chartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={vm.chartData}>
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
                                {vm.chartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={vm.chartData}>
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
                                {vm.channels.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={vm.channels}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="channel" />
                                            <YAxis allowDecimals={false} />
                                            <Tooltip
                                                cursor={{ fill: 'transparent' }}
                                                contentStyle={{ backgroundColor: 'hsl(var(--card))' }}
                                            />
                                            <Bar dataKey="count" fill="#8884d8" radius={[4, 4, 0, 0]}>
                                                {vm.channels.map((entry, index) => (
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

                        {/* Congestion Analysis List */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Layers className="h-4 w-4" /> Congestion Analysis
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {vm.congestion.length > 0 ? (
                                    <ScrollArea className="h-[300px]">
                                        <div className="space-y-1">
                                            {/* Table Header */}
                                            <div className="grid grid-cols-4 text-xs font-semibold text-muted-foreground px-4 py-2 border-b">
                                                <div>Time</div>
                                                <div className="text-center">Neighbors</div>
                                                <div className="text-center">Overlap</div>
                                                <div className="text-right">Congested</div>
                                            </div>

                                            {/* Data Rows */}
                                            {vm.congestion.map((c, i) => (
                                                <div
                                                    key={i}
                                                    className="grid grid-cols-4 items-center px-4 py-3 border-b last:border-0 hover:bg-muted/50 text-sm"
                                                >
                                                    <div className="font-mono text-xs text-muted-foreground">
                                                        {new Date(c.hour).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                    <div className="text-center font-bold">
                                                        {Math.round(c.avg_neighbors)}
                                                    </div>
                                                    <div className="text-center font-bold">
                                                        {Math.round(c.avg_overlap)}
                                                    </div>
                                                    <div className="text-right">
                                                        {c.congested_probes > 0 ? (
                                                            <Badge variant="destructive" className="h-5 px-1.5">
                                                                {c.congested_probes}
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-muted-foreground">0</span>
                                                        )}
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
                    </div>

                    {/* Access Points Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Network className="h-4 w-4" /> Access Point Analysis
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {vm.apData.length > 0 ? (
                                <ScrollArea className="h-[300px]">
                                    <div className="space-y-2">
                                        {vm.apData.map((ap, i) => (
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
                                    {vm.anomalies.length > 0 ? (
                                        vm.anomalies.map((a, i) => (
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
                                {vm.roaming && vm.roaming.events ? (
                                    <div className="space-y-4">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Total Events:</span>
                                            <span className="font-semibold">{vm.roaming.total_events}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Avg Latency Delta:</span>
                                            <span className="font-semibold">
                                                {vm.roaming.avg_latency_delta?.toFixed(1) || 0} ms
                                            </span>
                                        </div>
                                        <ScrollArea className="h-[220px]">
                                            {vm.roaming.events.map((event, i) => (
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
                                Trigger on-demand packet analysis for {vm.selectedProbe}
                            </p>
                        </div>
                        <Button
                            onClick={() => vm.triggerScan()}
                            disabled={vm.isTriggeringScan}
                        >
                            {vm.isTriggeringScan ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Radio className="mr-2 h-4 w-4" />
                            )}
                            {vm.isTriggeringScan ? "Starting..." : "Run New Scan"}
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[500px]">
                        <Card className="md:col-span-1 flex flex-col">
                            <CardHeader className="pb-2 bg-muted/20">
                                <CardTitle className="text-sm">Scan History</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 p-0 overflow-hidden">
                                <ScrollArea className="h-full">
                                    {vm.scans.map((scan) => (
                                        <div
                                            key={scan.id}
                                            onClick={() => vm.setSelectedScanId(scan.id)}
                                            className={`p-3 border-b cursor-pointer transition-all text-sm flex justify-between items-center group
                                                ${
                                                vm.selectedScanId === scan.id ||
                                                (!vm.selectedScanId && vm.activeScan?.id === scan.id)
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
                                                        vm.deleteScan(scan.id)
                                                    }
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    {vm.scans.length === 0 && (
                                        <div className="p-8 text-center text-muted-foreground text-sm">
                                            No scans recorded
                                        </div>
                                    )}
                                </ScrollArea>
                            </CardContent>
                        </Card>

                        <Card className="md:col-span-2 flex flex-col overflow-hidden border-t-4 border-t-primary/20">
                            {vm.activeScan ? (
                                vm.activeScan.status === 'processing' || vm.activeScan.status === 'pending' ? (
                                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 bg-muted/10">
                                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                                        <p>Analysis in Progress...</p>
                                    </div>
                                ) : (
                                    <DeepScanVisualizer scan={vm.activeScan} />
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
                                {vm.probes.slice(0, 6).map(p => (
                                    <Button
                                        key={p.probe_id}
                                        size="sm"
                                        variant={vm.comparisonProbes.includes(p.probe_id) ? "default" : "outline"}
                                        onClick={() => {
                                            vm.setComparisonProbes(prev =>
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
                            {vm.comparison && vm.comparisonProbes.length >= 2 ? (
                                <div className="space-y-4">
                                    <ScrollArea className="h-[400px]">
                                        {vm.comparison.map((probe: any, i: number) => (
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