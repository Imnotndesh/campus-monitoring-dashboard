import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Legend,
    LineChart,
    Line
} from "recharts"
import {
    Activity,
    Calendar,
    Signal,
    TrendingDown,
    TrendingUp,
    Wifi
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

// --- Types ---
type TimeRange = "1h" | "24h" | "7d"
type Probe = { probe_id: string; location: string }
type TelemetryPoint = {
    timestamp: string
    avg_rssi: number
    avg_latency: number
    packet_loss: number
    client_count?: number
}

export default function Analytics() {
    const [selectedProbe, setSelectedProbe] = useState<string>("all")
    const [range, setRange] = useState<TimeRange>("24h")

    // 1. Fetch Probes List for Dropdown
    const { data: probes } = useQuery<Probe[]>({
        queryKey: ["probes"],
        queryFn: async () => (await fetch("/api/v1/probes")).json(),
    })

    // 2. Fetch History Data (Mocked for UI demo, replace with real API endpoint)
    const { data: history } = useQuery<TelemetryPoint[]>({
        queryKey: ["history", selectedProbe, range],
        queryFn: async () => {
            // In a real app, you would pass ?duration=${range} and ?probe=${selectedProbe}
            // return (await fetch(`/api/v1/telemetry/history?probe=${selectedProbe}&duration=${range}`)).json()

            // MOCK DATA GENERATOR (So you can see the charts working immediately)
            return generateMockData(range)
        },
        keepPreviousData: true,
    })

    // 3. Calculate Aggregates
    const stats = useMemo(() => {
        if (!history || history.length === 0) return null
        const avgLatency = history.reduce((acc, curr) => acc + curr.avg_latency, 0) / history.length
        const maxLoss = Math.max(...history.map(d => d.packet_loss))
        const avgRssi = history.reduce((acc, curr) => acc + curr.avg_rssi, 0) / history.length

        // Stability Score (Simple heuristic: Lower latency/loss = higher score)
        const stabilityScore = Math.max(0, 100 - (avgLatency / 5) - (maxLoss * 10))

        return { avgLatency, maxLoss, avgRssi, stabilityScore }
    }, [history])

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">

            {/* --- Controls Header --- */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Network Analytics</h2>
                    <p className="text-muted-foreground">Historical performance and stability trends.</p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Probe Selector */}
                    <Select value={selectedProbe} onValueChange={setSelectedProbe}>
                        <SelectTrigger className="w-[200px] bg-background">
                            <SelectValue placeholder="Select Scope" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Whole Network (Avg)</SelectItem>
                            {probes?.map((p) => (
                                <SelectItem key={p.probe_id} value={p.probe_id}>
                                    {p.location || p.probe_id}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Time Range Toggles */}
                    <div className="flex bg-muted p-1 rounded-md">
                        <RangeButton label="1H" active={range === '1h'} onClick={() => setRange('1h')} />
                        <RangeButton label="24H" active={range === '24h'} onClick={() => setRange('24h')} />
                        <RangeButton label="7D" active={range === '7d'} onClick={() => setRange('7d')} />
                    </div>
                </div>
            </div>

            {/* --- KPI Cards --- */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <KpiCard
                    title="Network Stability"
                    value={`${stats?.stabilityScore.toFixed(0)}%`}
                    desc="Calculated Health Score"
                    icon={<Activity className="h-4 w-4 text-emerald-500" />}
                />
                <KpiCard
                    title="Avg Latency"
                    value={`${stats?.avgLatency.toFixed(0)} ms`}
                    desc={`Over last ${range}`}
                    icon={<Calendar className="h-4 w-4 text-blue-500" />}
                />
                <KpiCard
                    title="Avg Signal (RSSI)"
                    value={`${stats?.avgRssi.toFixed(0)} dBm`}
                    desc="Signal Strength"
                    icon={<Signal className="h-4 w-4 text-purple-500" />}
                />
                <KpiCard
                    title="Max Packet Loss"
                    value={`${stats?.maxLoss.toFixed(1)}%`}
                    desc="Worst Recorded Spike"
                    icon={<TrendingDown className="h-4 w-4 text-amber-500" />}
                />
            </div>

            {/* --- Main Charts Area --- */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">

                {/* Latency & Loss Chart (Big) */}
                <Card className="lg:col-span-4 bg-card/50">
                    <CardHeader>
                        <CardTitle>Latency vs Packet Loss</CardTitle>
                        <CardDescription>Correlation between response time and data drops.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={history}>
                                    <defs>
                                        <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorLoss" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                    <XAxis
                                        dataKey="timestamp"
                                        stroke="#888888"
                                        fontSize={12}
                                        tickFormatter={(str) => new Date(str).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    />
                                    <YAxis yAxisId="left" stroke="#888888" fontSize={12} tickFormatter={(val) => `${val}ms`} />
                                    <YAxis yAxisId="right" orientation="right" stroke="#888888" fontSize={12} tickFormatter={(val) => `${val}%`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                                        labelFormatter={(label) => new Date(label).toLocaleString()}
                                    />
                                    <Legend />
                                    <Area
                                        yAxisId="left"
                                        type="monotone"
                                        dataKey="avg_latency"
                                        name="Latency (ms)"
                                        stroke="#3b82f6"
                                        fillOpacity={1}
                                        fill="url(#colorLatency)"
                                    />
                                    <Area
                                        yAxisId="right"
                                        type="monotone"
                                        dataKey="packet_loss"
                                        name="Packet Loss (%)"
                                        stroke="#f59e0b"
                                        fillOpacity={1}
                                        fill="url(#colorLoss)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Signal Strength Trend (Side) */}
                <Card className="lg:col-span-3 bg-card/50">
                    <CardHeader>
                        <CardTitle>Signal Quality (RSSI)</CardTitle>
                        <CardDescription>Signal strength consistency over time.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={history}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                    <XAxis
                                        dataKey="timestamp"
                                        stroke="#888888"
                                        fontSize={12}
                                        hide
                                    />
                                    <YAxis stroke="#888888" fontSize={12} domain={[-90, -30]} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="avg_rssi"
                                        name="RSSI (dBm)"
                                        stroke="#10b981"
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    )
}

// --- Helper Components ---

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

function RangeButton({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`px-3 py-1 text-xs font-medium rounded-sm transition-all ${
                active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
            }`}
        >
            {label}
        </button>
    )
}

// --- Mock Data Generator (Remove this when API is ready) ---
function generateMockData(range: TimeRange) {
    const points = range === '1h' ? 12 : range === '24h' ? 24 : 7;
    const now = new Date();
    const data = [];

    for (let i = points; i >= 0; i--) {
        const time = new Date(now.getTime() - i * (range === '1h' ? 5*60000 : range === '24h' ? 3600000 : 86400000));
        data.push({
            timestamp: time.toISOString(),
            avg_latency: 20 + Math.random() * 50,
            packet_loss: Math.random() > 0.8 ? Math.random() * 5 : 0, // Occasional spikes
            avg_rssi: -40 - Math.random() * 30,
        });
    }
    return data;
}