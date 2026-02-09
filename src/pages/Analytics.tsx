import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, Legend
} from "recharts"
import {
    Activity, Calendar, Signal, TrendingDown, Radio, Search, Trash2,
    Wifi, ArrowDownUp, Zap, Server, AlertTriangle, Loader2
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"

// --- Types ---
type TimeRange = "1h" | "24h" | "7d"
type Probe = { probe_id: string; location: string }
type Command = { id: number; status: string; result: any; issued_at: string; command_type: string }

export default function Analytics() {
    const queryClient = useQueryClient();
    const [selectedProbe, setSelectedProbe] = useState<string>("all")
    const [range, setRange] = useState<TimeRange>("24h")
    const [selectedScanId, setSelectedScanId] = useState<number | null>(null);

    // 1. Fetch Probes
    const { data: probes } = useQuery<Probe[]>({
        queryKey: ["probes"],
        queryFn: async () => (await fetch("/api/v1/probes")).json(),
    })

    // 2. Fetch Deep Scans
    const { data: scans } = useQuery<Command[]>({
        queryKey: ["deep_scans", selectedProbe], // Specific key including probe
        queryFn: async () => {
            if (selectedProbe === "all") return [];
            const res = await fetch(`/api/v1/commands/probe/${selectedProbe}`);
            const cmds = await res.json();
            // Filter only deep scans and sort by newest first
            return cmds
                .filter((c: any) => c.command_type === 'deep_scan')
                .sort((a: any, b: any) => new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime());
        },
        enabled: selectedProbe !== "all",
        refetchInterval: 3000
    });

    const triggerScanMutation = useMutation({
        mutationFn: async () => {
            await fetch(`/api/v1/probes/${selectedProbe}/command`, {
                method: 'POST',
                body: JSON.stringify({ command: 'deep_scan', payload: {} })
            });
        },
        onSuccess: () => {
            toast.success("Deep Scan Initiated");
            // Invalidate exactly the key used in useQuery
            queryClient.invalidateQueries({ queryKey: ["deep_scans"] });
        }
    });

    // 3. Delete Scan Mutation
    const deleteScanMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/v1/commands/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error("Failed to delete");
        },
        onSuccess: (_, deletedId) => {
            toast.success("Scan deleted");
            // If we deleted the one we are looking at, deselect it
            if (selectedScanId === deletedId) setSelectedScanId(null);

            // Force refetch
            queryClient.invalidateQueries({ queryKey: ["deep_scans"] });
        }
    });

    // 4. Mock Data for Charts
    const { data: history } = useQuery({
        queryKey: ["history", range],
        queryFn: () => generateMockData(range)
    });

    const stats = useMemo(() => {
        if (!history || history.length === 0) return null
        const avgLatency = history.reduce((acc: any, curr: any) => acc + curr.avg_latency, 0) / history.length
        const maxLoss = Math.max(...history.map((d: any) => d.packet_loss))
        const avgRssi = history.reduce((acc: any, curr: any) => acc + curr.avg_rssi, 0) / history.length
        const stabilityScore = Math.max(0, 100 - (avgLatency / 5) - (maxLoss * 10))
        return { avgLatency, maxLoss, avgRssi, stabilityScore }
    }, [history])

    const activeScan = scans?.find(s => s.id === selectedScanId) || (scans && scans.length > 0 ? scans[0] : null);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Header & KPI Cards */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Network Intelligence</h2>
                    <p className="text-muted-foreground">Real-time performance metrics and deep packet inspection.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={selectedProbe} onValueChange={(val) => {
                        setSelectedProbe(val);
                        setSelectedScanId(null); // Reset selection on probe change
                    }}>
                        <SelectTrigger className="w-[200px] bg-background">
                            <SelectValue placeholder="Select Scope" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Whole Network (Avg)</SelectItem>
                            {probes?.map((p) => (
                                <SelectItem key={p.probe_id} value={p.probe_id}>{p.location || p.probe_id}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <KpiCard title="Network Stability" value={`${stats?.stabilityScore.toFixed(0)}%`} desc="Calculated Score" icon={<Activity className="h-4 w-4 text-emerald-500" />} />
                <KpiCard title="Avg Latency" value={`${stats?.avgLatency.toFixed(0)} ms`} desc={`Last ${range}`} icon={<Calendar className="h-4 w-4 text-blue-500" />} />
                <KpiCard title="Avg Signal" value={`${stats?.avgRssi.toFixed(0)} dBm`} desc="Signal Strength" icon={<Signal className="h-4 w-4 text-purple-500" />} />
                <KpiCard title="Max Packet Loss" value={`${stats?.maxLoss.toFixed(1)}%`} desc="Worst Spike" icon={<TrendingDown className="h-4 w-4 text-amber-500" />} />
            </div>

            {/* Charts Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                <Card className="lg:col-span-4 bg-card/50">
                    <CardHeader><CardTitle>Latency vs Loss</CardTitle></CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={history}>
                                <defs>
                                    <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                <XAxis dataKey="timestamp" hide />
                                <YAxis yAxisId="left" fontSize={12} tickFormatter={(v) => `${v}ms`} />
                                <YAxis yAxisId="right" orientation="right" fontSize={12} tickFormatter={(v) => `${v}%`} />
                                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))' }} />
                                <Legend />
                                <Area yAxisId="left" type="monotone" dataKey="avg_latency" name="Latency" stroke="#3b82f6" fill="url(#colorLatency)" />
                                <Area yAxisId="right" type="monotone" dataKey="packet_loss" name="Loss" stroke="#f59e0b" fill="transparent" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card className="lg:col-span-3 bg-card/50">
                    <CardHeader><CardTitle>Signal Quality</CardTitle></CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={history}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                <XAxis dataKey="timestamp" hide />
                                <YAxis domain={[-90, -30]} fontSize={12} />
                                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))' }} />
                                <Line type="monotone" dataKey="avg_rssi" stroke="#10b981" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* --- Deep Scan Section --- */}
            {selectedProbe !== "all" && (
                <div className="space-y-4 pt-6 border-t animate-in slide-in-from-bottom-5 duration-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Search className="h-5 w-5 text-primary" /> Deep Scan Inspector
                            </h3>
                            <p className="text-sm text-muted-foreground">Trigger on-demand packet analysis for {selectedProbe}.</p>
                        </div>
                        <Button onClick={() => triggerScanMutation.mutate()} disabled={triggerScanMutation.isPending}>
                            {triggerScanMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Radio className="mr-2 h-4 w-4" />}
                            {triggerScanMutation.isPending ? "Starting Scan..." : "Run New Scan"}
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[500px]">

                        {/* 1. Scan History List */}
                        <Card className="md:col-span-1 flex flex-col">
                            <CardHeader className="pb-2 bg-muted/20"><CardTitle className="text-sm">Scan History</CardTitle></CardHeader>
                            <CardContent className="flex-1 p-0 overflow-hidden">
                                <ScrollArea className="h-full">
                                    {scans?.map((scan) => (
                                        <div
                                            key={scan.id}
                                            onClick={() => setSelectedScanId(scan.id)}
                                            className={`p-3 border-b cursor-pointer transition-all text-sm flex justify-between items-center group
                                                ${selectedScanId === scan.id || (!selectedScanId && activeScan?.id === scan.id) ? "bg-primary/5 border-l-4 border-l-primary" : "hover:bg-muted/50 border-l-4 border-l-transparent"}`
                                            }
                                        >
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-semibold text-foreground">#{scan.id}</span>
                                                    {scan.status === 'processing' ? (
                                                        <Badge variant="secondary" className="text-[10px] h-5 animate-pulse text-blue-500">
                                                            <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Running
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant={scan.status === 'completed' ? 'default' : 'outline'} className="text-[10px] h-5">
                                                            {scan.status}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="text-xs text-muted-foreground">{new Date(scan.issued_at).toLocaleTimeString()} <span className="opacity-50">| {new Date(scan.issued_at).toLocaleDateString()}</span></div>
                                            </div>

                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm("Delete this scan record?")) deleteScanMutation.mutate(scan.id);
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    {scans?.length === 0 && <div className="p-8 text-center text-muted-foreground text-sm">No scans recorded yet.</div>}
                                </ScrollArea>
                            </CardContent>
                        </Card>

                        {/* 2. Result Visualizer */}
                        <Card className="md:col-span-2 flex flex-col overflow-hidden border-t-4 border-t-primary/20">
                            {activeScan ? (
                                activeScan.status === 'processing' ? (
                                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 bg-muted/10">
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse"></div>
                                            <Loader2 className="h-12 w-12 animate-spin text-primary relative z-10" />
                                        </div>
                                        <div className="text-center space-y-1">
                                            <p className="font-medium text-foreground text-lg">Analysis in Progress</p>
                                            <p className="text-sm">Probe is gathering RF metrics and performing throughput tests.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <DeepScanVisualizer scan={activeScan} />
                                )
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 bg-muted/10">
                                    <div className="p-4 bg-muted rounded-full">
                                        <Search className="h-8 w-8 opacity-40" />
                                    </div>
                                    <p>Select a completed scan to inspect packet data.</p>
                                </div>
                            )}
                        </Card>
                    </div>
                </div>
            )}
        </div>
    )
}

// --- VISUALIZATION COMPONENT FOR NETWORK ENGINEERS ---
function DeepScanVisualizer({ scan }: { scan: Command }) {
    // Safety check if result is empty or just a message
    const data = scan.result || {};
    const isError = !data.rssi && !data.snr; // Basic check if metrics exist

    if (isError) {
        return (
            <div className="flex flex-col h-full">
                <CardHeader className="pb-2 bg-muted/20 border-b">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-sm font-mono text-muted-foreground">SCAN #{scan.id}</CardTitle>
                        <Badge variant="outline">{new Date(scan.issued_at).toLocaleString()}</Badge>
                    </div>
                </CardHeader>
                <div className="p-6 font-mono text-xs text-muted-foreground">
                    <p className="mb-2 font-bold text-foreground">Raw Output:</p>
                    <pre className="bg-muted p-4 rounded">{JSON.stringify(data, null, 2)}</pre>
                </div>
            </div>
        )
    }

    // Metric Calculations for UI Colors
    const getQualityColor = (q: number) => q > 80 ? "bg-emerald-500" : q > 50 ? "bg-yellow-500" : "bg-red-500";
    const getRssiColor = (r: number) => r > -60 ? "text-emerald-500" : r > -75 ? "text-yellow-500" : "text-red-500";
    const getLossColor = (l: number) => l < 1 ? "text-emerald-500" : l < 5 ? "text-yellow-500" : "text-red-500";

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar Header */}
            <CardHeader className="py-3 px-6 bg-muted/30 border-b flex flex-row justify-between items-center">
                <div className="flex items-center gap-3">
                    <Wifi className="h-5 w-5 text-primary" />
                    <div>
                        <CardTitle className="text-base">RF Environment Analysis</CardTitle>
                        <CardDescription className="text-xs">Target: Google DNS (8.8.8.8) via TCP</CardDescription>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Badge variant="secondary" className="font-mono">{data.phyMode || "802.11n"}</Badge>
                    <Badge variant="outline" className="font-mono">CH {data.channel}</Badge>
                </div>
            </CardHeader>

            <ScrollArea className="flex-1">
                <div className="p-6 space-y-8">

                    {/* 1. Health Score Section */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-1 flex flex-col items-center justify-center p-4 border rounded-lg bg-card shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
                            <span className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Link Quality</span>
                            <span className="text-4xl font-bold tracking-tight">{data.linkQuality?.toFixed(1) || 0}<span className="text-lg text-muted-foreground font-normal">/100</span></span>
                            <Progress value={data.linkQuality || 0} className={`h-2 w-full mt-3 ${getQualityColor(data.linkQuality || 0)}`} />
                        </div>

                        <div className="md:col-span-2 grid grid-cols-2 gap-4">
                            <StatBox label="SNR Margin" value={`${data.snr?.toFixed(1)} dB`} icon={<Zap className="h-4 w-4" />} />
                            <StatBox label="Noise Floor" value={`${data.noiseFloor || -95} dBm`} icon={<TrendingDown className="h-4 w-4" />} />
                            <StatBox label="Avg Signal (RSSI)" value={`${data.rssi} dBm`} icon={<Signal className="h-4 w-4" />} color={getRssiColor(data.rssi)} />
                            <StatBox label="Congestion Rating" value={data.congestion === 0 ? "Good" : data.congestion === 1 ? "Fair" : "Bad"} icon={<AlertTriangle className="h-4 w-4" />} />
                        </div>
                    </div>

                    <Separator />

                    {/* 2. Throughput & Latency */}
                    <div>
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <ArrowDownUp className="h-4 w-4 text-primary" /> Transport Performance
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 bg-muted/40 rounded-lg border flex flex-col justify-between">
                                <span className="text-xs text-muted-foreground">TCP Throughput</span>
                                <div className="flex items-baseline gap-1 mt-1">
                                    <span className="text-2xl font-bold">{data.tcpThroughput ? (data.tcpThroughput / 1000).toFixed(2) : 0}</span>
                                    <span className="text-xs font-mono">Mbps</span>
                                </div>
                            </div>
                            <div className="p-4 bg-muted/40 rounded-lg border flex flex-col justify-between">
                                <span className="text-xs text-muted-foreground">Round Trip Time (RTT)</span>
                                <div className="flex items-baseline gap-1 mt-1">
                                    <span className="text-2xl font-bold">{data.avgLatency || 0}</span>
                                    <span className="text-xs font-mono">ms</span>
                                </div>
                            </div>
                            <div className="p-4 bg-muted/40 rounded-lg border flex flex-col justify-between">
                                <span className="text-xs text-muted-foreground">Packet Loss</span>
                                <div className={`flex items-baseline gap-1 mt-1 ${getLossColor(data.packetLoss)}`}>
                                    <span className="text-2xl font-bold">{data.packetLoss?.toFixed(1) || 0}</span>
                                    <span className="text-xs font-mono">%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* 3. Spectrum & Environment */}
                    <div>
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <Activity className="h-4 w-4 text-primary" /> Spectrum Analysis
                        </h4>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-muted-foreground">Channel Utilization</span>
                                    <span className="font-mono">{data.channelUtilization?.toFixed(1) || 0}%</span>
                                </div>
                                <Progress value={data.channelUtilization || 0} className="h-2" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 border rounded bg-background flex justify-between items-center">
                                    <span className="text-xs text-muted-foreground">Visible Networks</span>
                                    <span className="font-mono font-bold">{data.neighborCount || 0}</span>
                                </div>
                                <div className="p-3 border rounded bg-background flex justify-between items-center">
                                    <span className="text-xs text-muted-foreground">Co-Channel Overlap</span>
                                    <span className="font-mono font-bold text-orange-500">{data.overlappingCount || 0}</span>
                                </div>
                            </div>

                            <div className="p-3 bg-muted/50 rounded border font-mono text-[10px] text-muted-foreground flex justify-between">
                                <span>Connected BSSID: {data.bssid}</span>
                                <span>DNS Time: {data.dnsResolutionTime}ms</span>
                            </div>
                        </div>
                    </div>

                </div>
            </ScrollArea>
        </div>
    )
}

function StatBox({ label, value, icon, color }: any) {
    return (
        <div className="p-3 border rounded-md bg-background flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-1 text-muted-foreground">
                {icon}
                <span className="text-[10px] uppercase tracking-wide">{label}</span>
            </div>
            <div className={`text-lg font-bold ${color || "text-foreground"}`}>
                {value}
            </div>
        </div>
    )
}

function KpiCard({ title, value, desc, icon }: any) {
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

function generateMockData(range: any) {
    return Array.from({length: 20}).map((_, i) => ({
        timestamp: new Date().toISOString(),
        avg_latency: 20 + Math.random() * 30,
        packet_loss: Math.random() > 0.8 ? Math.random() * 5 : 0,
        avg_rssi: -50 - Math.random() * 20
    }))
}