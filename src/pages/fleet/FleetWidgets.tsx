import { useQuery } from "@tanstack/react-query"
import {
    Activity, CheckCircle2, Loader2, Server,
    Users, XCircle, Zap, WifiOff,
    ServerOff,Plus, RotateCcw,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import type {FleetStatusResponse, FleetProbe, FleetCommand, FleetGroup, FleetCommandRequest} from "./types"
import {useState} from "react";

// ─── Fleet Overview KPI Widget ───────────────────────────────────────────────

export function FleetOverviewWidget() {
    const { data: status, isLoading } = useQuery<FleetStatusResponse>({
        queryKey: ["fleet-status-widget"],
        queryFn: async () => {
            const res = await fetch("/api/v1/fleet/status")
            if (!res.ok) throw new Error("Failed to fetch fleet status")
            return res.json()
        },
        refetchInterval: 15000,
    })

    const onlinePct = status && status.total_managed > 0
        ? (status.online / status.total_managed) * 100
        : 0

    if (isLoading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center h-[140px]">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fleet Health</CardTitle>
                <Server className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex items-end justify-between">
                    <div>
                        <div className="text-2xl font-bold">{status?.online ?? "--"}</div>
                        <p className="text-xs text-muted-foreground">of {status?.total_managed ?? 0} online</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground space-y-1">
                        {status?.in_maintenance !== undefined && status.in_maintenance > 0 && (
                            <div className="text-amber-600">{status.in_maintenance} in maintenance</div>
                        )}
                        {status?.offline !== undefined && status.offline > 0 && (
                            <div className="text-rose-600">{status.offline} offline</div>
                        )}
                    </div>
                </div>
                <Progress value={onlinePct} className="h-1.5" />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{status?.groups ?? 0} groups</span>
                    <span>{status?.templates ?? 0} templates</span>
                    <span>{status?.active_rollouts ?? 0} active rollouts</span>
                </div>
            </CardContent>
        </Card>
    )
}

// ─── Fleet Probe List Widget ──────────────────────────────────────────────────

export function FleetProbeListWidget({ maxItems = 8 }: { maxItems?: number }) {
    const { data: probes = [], isLoading } = useQuery<FleetProbe[]>({
        queryKey: ["fleet-probes-widget"],
        queryFn: async () => {
            const res = await fetch("/api/v1/fleet/probes")
            if (!res.ok) throw new Error("Failed to fetch fleet probes")
            return res.json()
        },
        refetchInterval: 10000,
    })

    const displayed = probes.slice(0, maxItems)
    const onlineCount = probes.filter(p => p.mqtt_connected).length

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium">Managed Probes</CardTitle>
                <div className="flex items-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs text-muted-foreground">{onlineCount}/{probes.length}</span>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {isLoading ? (
                    <div className="flex items-center justify-center h-[180px]">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : probes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[180px] text-muted-foreground">
                        <Server className="h-6 w-6 opacity-30 mb-1" />
                        <p className="text-xs">No managed probes</p>
                    </div>
                ) : (
                    <ScrollArea className="h-[220px]">
                        <div className="divide-y">
                            {displayed.map(probe => (
                                <div key={probe.probe_id} className="flex items-center gap-3 px-4 py-2.5">
                                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                        probe.mqtt_connected ? "bg-emerald-500" : "bg-rose-500"
                                    }`} />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-mono text-xs font-medium truncate">{probe.probe_id}</div>
                                        {probe.location && (
                                            <div className="text-[10px] text-muted-foreground truncate">{probe.location}</div>
                                        )}
                                    </div>
                                    {probe.wifi_rssi !== undefined && (
                                        <span className={`text-[10px] font-mono font-medium ${
                                            probe.wifi_rssi > -60 ? "text-emerald-600"
                                                : probe.wifi_rssi > -75 ? "text-yellow-600"
                                                    : "text-rose-600"
                                        }`}>{probe.wifi_rssi} dBm</span>
                                    )}
                                    {probe.groups?.slice(0, 1).map(g => (
                                        <Badge key={g} variant="secondary" className="text-[9px] h-4 hidden md:flex">{g}</Badge>
                                    ))}
                                </div>
                            ))}
                            {probes.length > maxItems && (
                                <div className="px-4 py-2 text-center text-[10px] text-muted-foreground">
                                    +{probes.length - maxItems} more probes
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    )
}

// ─── Active Rollouts Widget ───────────────────────────────────────────────────

export function ActiveRolloutsWidget() {
    const { data: commands = [], isLoading } = useQuery<FleetCommand[]>({
        queryKey: ["fleet-commands-active-widget"],
        queryFn: async () => {
            const res = await fetch("/api/v1/fleet/commands?status=in_progress&limit=10")
            if (!res.ok) throw new Error("Failed to fetch commands")
            return res.json()
        },
        refetchInterval: 5000,
    })

    const statusIcon = (status: string) => {
        if (status === "completed") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        if (status === "failed") return <XCircle className="h-3.5 w-3.5 text-rose-500" />
        if (status === "in_progress") return <Activity className="h-3.5 w-3.5 text-primary animate-pulse" />
        return <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium">Active Rollouts</CardTitle>
                <Zap className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent className="p-0">
                {isLoading ? (
                    <div className="flex items-center justify-center h-[160px]">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : commands.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[160px] text-muted-foreground">
                        <CheckCircle2 className="h-6 w-6 opacity-30 mb-1" />
                        <p className="text-xs">No active rollouts</p>
                    </div>
                ) : (
                    <ScrollArea className="h-[180px]">
                        <div className="divide-y">
                            {commands.map(cmd => {
                                const pct = cmd.total_targets > 0
                                    ? (cmd.completed_count / cmd.total_targets) * 100
                                    : 0
                                return (
                                    <div key={cmd.id} className="px-4 py-3 space-y-2">
                                        <div className="flex items-center gap-2">
                                            {statusIcon(cmd.status)}
                                            <span className="font-mono text-xs font-medium flex-1 truncate">{cmd.command_type}</span>
                                            <span className="text-[10px] text-muted-foreground">
                                                {cmd.completed_count}/{cmd.total_targets}
                                            </span>
                                        </div>
                                        <Progress value={pct} className="h-1" />
                                    </div>
                                )
                            })}
                        </div>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    )
}

// ─── Fleet Groups Summary Widget ──────────────────────────────────────────────

export function FleetGroupsWidget() {
    const { data: probes = [] } = useQuery<FleetProbe[]>({
        queryKey: ["fleet-probes-groups-widget"],
        queryFn: async () => {
            const res = await fetch("/api/v1/fleet/probes")
            if (!res.ok) return []
            return res.json()
        },
        refetchInterval: 30000,
    })

    // Build group summary from probes
    const groupMap = new Map<string, { total: number; online: number }>()
    probes.forEach(probe => {
        probe.groups?.forEach(g => {
            const curr = groupMap.get(g) ?? { total: 0, online: 0 }
            curr.total++
            if (probe.mqtt_connected) curr.online++
            groupMap.set(g, curr)
        })
    })

    const groupEntries = Array.from(groupMap.entries())

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium">Groups</CardTitle>
                <Users className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent className="p-0">
                {groupEntries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[140px] text-muted-foreground">
                        <Users className="h-6 w-6 opacity-30 mb-1" />
                        <p className="text-xs">No groups</p>
                    </div>
                ) : (
                    <ScrollArea className="h-[180px]">
                        <div className="divide-y">
                            {groupEntries.map(([name, { total, online }]) => (
                                <div key={name} className="flex items-center gap-3 px-4 py-2.5">
                                    <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                                        <Users className="h-3 w-3 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-medium truncate">{name}</div>
                                        <Progress value={(online / total) * 100} className="h-1 mt-1" />
                                    </div>
                                    <div className="text-[10px] text-right flex-shrink-0">
                                        <span className="text-emerald-600 font-medium">{online}</span>
                                        <span className="text-muted-foreground">/{total}</span>
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

// ─── Offline Probes Alert Widget ──────────────────────────────────────────────

export function OfflineProbesWidget() {
    const { data: probes = [], isLoading } = useQuery<FleetProbe[]>({
        queryKey: ["fleet-probes-offline-widget"],
        queryFn: async () => {
            const res = await fetch("/api/v1/fleet/probes")
            if (!res.ok) return []
            return res.json()
        },
        refetchInterval: 15000,
    })

    const offline = probes.filter(p => !p.mqtt_connected)

    return (
        <Card className={offline.length > 0 ? "border-rose-500/30" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Offline Probes</CardTitle>
                <WifiOff className={`h-4 w-4 ${offline.length > 0 ? "text-rose-500" : "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex items-center justify-center h-[80px]">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                ) : offline.length === 0 ? (
                    <div className="flex items-center gap-2 text-emerald-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-sm">All probes online</span>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div className="text-2xl font-bold text-rose-600">{offline.length}</div>
                        <ScrollArea className="h-[100px]">
                            {offline.map(p => (
                                <div key={p.probe_id} className="flex items-center gap-2 py-1 text-xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                                    <span className="font-mono">{p.probe_id}</span>
                                    {p.location && <span className="text-muted-foreground truncate">{p.location}</span>}
                                </div>
                            ))}
                        </ScrollArea>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
export function UnenrolledCountWidget() {
    const { data: unenrolled = [], isLoading } = useQuery({
        queryKey: ["fleet-unenrolled-probes"],
        queryFn: async () => {
            const res = await fetch("/api/v1/fleet/unenrolled-probes")
            if (!res.ok) throw new Error("Failed to fetch unenrolled probes")
            return res.json()
        },
        refetchInterval: 15000,
    })

    if (isLoading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center h-[140px]">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Adoption</CardTitle>
                <ServerOff className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="text-2xl font-bold">{unenrolled.length}</div>
                <p className="text-xs text-muted-foreground">Probes awaiting fleet enrollment</p>
                <Progress value={unenrolled.length > 0 ? 100 : 0} className="h-1.5 opacity-50" />
            </CardContent>
        </Card>
    )
}

// ─── Unenrolled Probes List Widget ───────────────────────────────────────────
export function UnenrolledListWidget({ onEnrollClick }: { onEnrollClick: (probe: any) => void }) {
    const { data: unenrolled = [], isLoading } = useQuery({
        queryKey: ["fleet-unenrolled-probes"],
        queryFn: async () => {
            const res = await fetch("/api/v1/fleet/unenrolled-probes")
            if (!res.ok) throw new Error("Failed to fetch unenrolled probes")
            return res.json()
        },
        refetchInterval: 10000,
    })

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-sm font-medium">Available for Adoption</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                {isLoading ? (
                    <div className="flex items-center justify-center h-[200px]">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : unenrolled.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                        <ServerOff className="h-8 w-8 mb-2 opacity-50" />
                        <p className="text-sm">No new probes detected</p>
                    </div>
                ) : (
                    <ScrollArea className="h-[200px] px-4">
                        <div className="space-y-3 pb-4">
                            {unenrolled.map((probe: any) => (
                                <div key={probe.probe_id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                                    <div>
                                        <div className="text-sm font-mono font-medium">{probe.probe_id}</div>
                                        <div className="text-xs text-muted-foreground">{probe.building || probe.location || "Unknown Location"}</div>
                                    </div>
                                    <Button size="sm" variant="secondary" onClick={() => onEnrollClick(probe)}>
                                        <Plus className="w-4 h-4 mr-1"/> Enroll
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    )
}

// ─── Fleet Quick Actions Widget ──────────────────────────────────────────────
export function FleetQuickActionsWidget({
                                            groups,
                                            onSend,
                                            isSending
                                        }: {
    groups: FleetGroup[],
    onSend: (req: FleetCommandRequest) => void,
    isSending: boolean
}) {
    const [selectedGroup, setSelectedGroup] = useState<string>("")

    const handleAction = (cmdType: string) => {
        if (!selectedGroup) return
        onSend({
            command_type: cmdType,
            target_all: false,
            groups: [selectedGroup],
            probe_ids: [],
            strategy: "immediate",
            payload: {}
        })
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-sm font-medium">Quick Group Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label className="text-xs">Target Group</Label>
                    <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                        <SelectTrigger><SelectValue placeholder="Select a group..." /></SelectTrigger>
                        <SelectContent>
                            {groups.map(g => (
                                <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        disabled={!selectedGroup || isSending}
                        onClick={() => handleAction("fleet_reboot")}
                    >
                        <RotateCcw className="w-4 h-4 mr-2 text-rose-500" /> Reboot
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        disabled={!selectedGroup || isSending}
                        onClick={() => handleAction("fleet_status")}
                    >
                        <Activity className="w-4 h-4 mr-2 text-primary" /> Ping Status
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start col-span-2"
                        disabled={!selectedGroup || isSending}
                        onClick={() => handleAction("fleet_deep_scan")}
                    >
                        <Zap className="w-4 h-4 mr-2 text-amber-500" /> Force Deep Scan
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}