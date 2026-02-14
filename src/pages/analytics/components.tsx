import React from "react"
import { AlertCircle, AlertTriangle, ArrowDownUp, Radio, Signal, TrendingDown, Wifi, Zap } from "lucide-react"
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