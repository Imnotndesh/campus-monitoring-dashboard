import React from "react"
import {
    Activity,
    AlertCircle,
    AlertTriangle,
    ArrowDownUp,
    Calendar,
    Signal,
    TrendingDown,
    Wifi,
    Zap
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import type {Command} from "./types"

export function NoData() {
    return (
        <div className="flex h-full items-center justify-center text-muted-foreground bg-muted/10 rounded-md border border-dashed">
            No Data Available
        </div>
    )
}

export function KpiCard({ title, value, desc, icon }: {
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

export function StatBox({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
    return (
        <div className="p-3 border rounded bg-background flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-1 text-muted-foreground">
                {icon} <span className="text-[10px] uppercase">{label}</span>
            </div>
            <div className="text-lg font-bold">{value}</div>
        </div>
    )
}

export function DeepScanVisualizer({ scan }: { scan: Command }) {
    // 1. Safe Parsing
    const raw = scan.result || {}
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw

    // 2. Exact Key Mapping based on your Postman response
    // { bssid, ch, dns, epoch, lat, loss, noise, phy, pid, qual, rssi, snr, tput, ts, type, up, util }
    const {
        bssid,
        ch: channel,
        lat: latency,
        loss: packetLoss,
        noise: noiseFloor,
        phy: phyMode,
        qual: linkQuality,
        rssi,
        snr,
        tput: throughput,
        util: utilization,
        up: uptime
    } = data

    // 3. Formatting Helpers
    const formatUptime = (seconds: number) => {
        if (!seconds) return '--'
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        return `${h}h ${m}m`
    }

    const isError = !rssi && !channel && !bssid

    if (isError) {
        return (
            <div className="p-6 flex flex-col items-center justify-center h-full text-center">
                <AlertCircle className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
                <p className="text-muted-foreground mb-2">Analysis data unavailable</p>
                <div className="text-[10px] text-muted-foreground bg-muted p-2 rounded max-w-[200px] truncate">
                    ID: {scan.id} | Status: {scan.status}
                </div>
            </div>
        )
    }

    const getQualityColor = (q: number) =>
        q > 80 ? "bg-emerald-500" : q > 50 ? "bg-yellow-500" : "bg-red-500"

    return (
        <div className="flex flex-col h-full bg-card">
            {/* Header: Identity */}
            <div className="py-3 px-6 border-b flex justify-between items-center bg-muted/20">
                <div className="flex flex-col">
                    <span className="text-xs font-mono text-muted-foreground uppercase">Target AP</span>
                    <span className="font-bold flex items-center gap-2">
                        {bssid || 'Unknown BSSID'}
                        {phyMode && <Badge variant="secondary" className="text-[10px] h-5">{phyMode}</Badge>}
                    </span>
                </div>
                <div className="text-right">
                    <span className="text-xs text-muted-foreground block">Channel</span>
                    <span className="text-xl font-bold font-mono">{channel ?? '--'}</span>
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-6 space-y-6">
                    {/* Section 1: Connection Health (Link Quality) */}
                    {linkQuality !== undefined && (
                        <div className="relative pt-2">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-sm font-medium text-muted-foreground">Link Quality</span>
                                <span className="text-2xl font-bold">{Number(linkQuality).toFixed(0)}%</span>
                            </div>
                            <Progress
                                value={Number(linkQuality)}
                                className={`h-3 ${getQualityColor(Number(linkQuality))}`}
                            />
                        </div>
                    )}

                    {/* Section 2: RF Signal Metrics */}
                    <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3 flex items-center gap-2">
                            <Signal className="h-3 w-3" /> RF Environment
                        </h4>
                        <div className="grid grid-cols-3 gap-3">
                            <StatBox label="Signal" value={rssi ? `${rssi} dBm` : '--'} icon={<Wifi className="h-4 w-4" />} />
                            <StatBox label="Noise Floor" value={noiseFloor ? `${noiseFloor} dBm` : '--'} icon={<TrendingDown className="h-4 w-4" />} />
                            <StatBox label="SNR" value={snr ? `${snr} dB` : '--'} icon={<Zap className="h-4 w-4" />} />
                        </div>
                    </div>

                    {/* Section 3: Performance Metrics */}
                    <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3 flex items-center gap-2">
                            <Activity className="h-3 w-3" /> Performance
                        </h4>
                        <div className="grid grid-cols-3 gap-3">
                            <StatBox
                                label="Throughput"
                                value={throughput ? `${throughput} kbps` : '--'}
                                icon={<ArrowDownUp className="h-4 w-4" />}
                            />
                            <StatBox
                                label="Latency"
                                value={latency !== undefined ? `${latency} ms` : '--'}
                                icon={<Calendar className="h-4 w-4" />}
                            />
                            <StatBox
                                label="Packet Loss"
                                value={packetLoss !== undefined ? `${packetLoss}%` : '--'}
                                icon={<AlertTriangle className="h-4 w-4" />}
                            />
                        </div>
                    </div>

                    {/* Section 4: Spectrum Health & Uptime */}
                    <div className="grid grid-cols-2 gap-4">
                        {utilization !== undefined && (
                            <div className="bg-muted/10 p-4 rounded border border-dashed col-span-2 md:col-span-1">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-medium">Channel Util</span>
                                    <span className="text-sm font-bold">{Number(utilization).toFixed(1)}%</span>
                                </div>
                                <Progress value={Number(utilization)} className="h-1.5 bg-muted" />
                            </div>
                        )}
                        {uptime !== undefined && (
                            <div className="bg-muted/10 p-4 rounded border border-dashed col-span-2 md:col-span-1 flex flex-col justify-center">
                                <div className="text-xs font-medium text-muted-foreground mb-1">Device Uptime</div>
                                <div className="text-lg font-bold">{formatUptime(uptime)}</div>
                            </div>
                        )}
                    </div>
                </div>
            </ScrollArea>
        </div>
    )
}