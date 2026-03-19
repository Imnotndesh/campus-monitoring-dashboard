import React, { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Radio,
    AlertCircle,
    Loader2,
    Activity,
    Wifi,
    Thermometer,
    HardDrive,
    Clock,
    Settings,
    Search,
    CheckCircle2,
    XCircle,
    AlertTriangle
} from "lucide-react"
import { cn } from "@/lib/utils"
import {apiFetch} from "../../lib/api.ts";

interface Probe {
    probe_id: string
    location: string
    building?: string
    floor?: string
    status: 'active' | 'inactive' | 'maintenance'
    last_seen: string
    ip_address?: string
    version?: string
    metadata?: Record<string, any>
}

interface ProbeStatusCache {
    probe_id: string
    uptime: number
    free_heap: number
    rssi: number
    ip: string
    ssid: string
    temp_c: number
    timestamp: string
    updated_at: string
}

interface ProbeConfigCache {
    probe_id: string
    wifi: Record<string, any>
    mqtt: Record<string, any>
    heap_free: number
    uptime: number
    updated_at: string
    version?: string
}

// ==================== PROBE STATUS WIDGET ====================
export function ProbeStatusWidget({
                                      probeId,
                                      title = "Probe Status"
                                  }: {
    probeId: string
    title?: string
}) {
    const { data: status, isLoading, isError } = useQuery<ProbeStatusCache>({
        queryKey: ["widget-probe-status", probeId],
        queryFn: async () => {
            const res = await apiFetch(`/api/v1/probes/${probeId}/status`)
            if (!res.ok) throw new Error("Failed to fetch status")
            return res.json()
        },
        enabled: !!probeId && probeId !== "all",
        refetchInterval: 5000
    })

    const formatUptime = (seconds: number) => {
        if (!seconds) return '--'
        const days = Math.floor(seconds / 86400)
        const hours = Math.floor((seconds % 86400) / 3600)
        const mins = Math.floor((seconds % 3600) / 60)
        if (days > 0) return `${days}d ${hours}h`
        if (hours > 0) return `${hours}h ${mins}m`
        return `${mins}m`
    }

    const formatHeap = (bytes: number) => {
        if (!bytes) return '--'
        return `${(bytes / 1024).toFixed(1)} KB`
    }

    if (!probeId || probeId === "all") {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        {title}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                        <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
                        <p className="text-sm">Select a specific probe</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (isError) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        {title}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center h-[200px] text-destructive">
                        <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
                        <p className="text-sm">Failed to load status</p>
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
                        <Activity className="h-4 w-4" />
                        {title}
                    </span>
                    <Badge variant="outline" className="text-xs font-normal font-mono">
                        {probeId}
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex items-center justify-center h-[200px]">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : status ? (
                    <div className="space-y-4">
                        {/* Network Status */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 border rounded-lg bg-background">
                                <div className="flex items-center gap-2 mb-1 text-muted-foreground">
                                    <Wifi className="h-3.5 w-3.5" />
                                    <span className="text-[10px] uppercase font-medium">RSSI</span>
                                </div>
                                <div className="text-lg font-bold">{status.rssi} dBm</div>
                            </div>
                            <div className="p-3 border rounded-lg bg-background">
                                <div className="flex items-center gap-2 mb-1 text-muted-foreground">
                                    <Thermometer className="h-3.5 w-3.5" />
                                    <span className="text-[10px] uppercase font-medium">Temp</span>
                                </div>
                                <div className="text-lg font-bold">{status.temp_c}°C</div>
                            </div>
                        </div>

                        {/* System Resources */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 border rounded-lg bg-background">
                                <div className="flex items-center gap-2 mb-1 text-muted-foreground">
                                    <HardDrive className="h-3.5 w-3.5" />
                                    <span className="text-[10px] uppercase font-medium">Free Heap</span>
                                </div>
                                <div className="text-lg font-bold">{formatHeap(status.free_heap)}</div>
                            </div>
                            <div className="p-3 border rounded-lg bg-background">
                                <div className="flex items-center gap-2 mb-1 text-muted-foreground">
                                    <Clock className="h-3.5 w-3.5" />
                                    <span className="text-[10px] uppercase font-medium">Uptime</span>
                                </div>
                                <div className="text-lg font-bold">{formatUptime(status.uptime)}</div>
                            </div>
                        </div>

                        {/* Network Details */}
                        <div className="p-3 border rounded-lg bg-muted/20">
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">SSID</span>
                                    <span className="font-mono font-medium">{status.ssid || '--'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">IP Address</span>
                                    <span className="font-mono font-medium">{status.ip || '--'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Last Update</span>
                                    <span className="font-medium">{new Date(status.updated_at).toLocaleTimeString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                        <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
                        <p className="text-sm">No status data available</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

// ==================== UNKNOWN PROBES COUNT WIDGET ====================
export function UnknownProbesWidget({
                                        title = "Unknown Probes"
                                    }: {
    title?: string
}) {
    const { data: probes = [], isLoading, isError } = useQuery<Probe[]>({
        queryKey: ["widget-unknown-probes"],
        queryFn: async () => {
            const res = await apiFetch("/api/v1/probes")
            if (!res.ok) throw new Error("Failed to fetch probes")
            return res.json()
        },
        refetchInterval: 10000
    })

    const unknownCount = useMemo(() => {
        return probes.filter(p =>
            p.status === 'inactive' ||
            !p.location ||
            p.location === 'Unknown' ||
            p.location === ''
        ).length
    }, [probes])

    const inactiveProbes = useMemo(() => {
        return probes.filter(p => p.status === 'inactive')
    }, [probes])

    if (isError) {
        return (
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{title}</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
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
                <Radio className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">
                    {isLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    ) : (
                        unknownCount
                    )}
                </div>
                {!isLoading && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                        {inactiveProbes.length > 0 && (
                            <Badge variant="destructive" className="text-[10px] h-5">
                                {inactiveProbes.length} Inactive
                            </Badge>
                        )}
                        {unknownCount === 0 && (
                            <span className="text-xs text-muted-foreground">All probes registered</span>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

// ==================== PROBE CONFIG INFO WIDGET ====================
export function ProbeConfigWidget({
                                      title = "Probe Configuration",
                                      defaultProbeId
                                  }: {
    title?: string
    defaultProbeId?: string
}) {
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [selectedProbeId, setSelectedProbeId] = useState<string>(defaultProbeId || "")
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "maintenance">("all")

    const { data: probes = [] } = useQuery<Probe[]>({
        queryKey: ["widget-probes-list"],
        queryFn: async () => {
            const res = await apiFetch("/api/v1/probes")
            if (!res.ok) throw new Error("Failed to fetch probes")
            return res.json()
        }
    })

    const { data: config, isLoading: isLoadingConfig, isError } = useQuery<ProbeConfigCache>({
        queryKey: ["widget-probe-config", selectedProbeId],
        queryFn: async () => {
            const res = await apiFetch(`/api/v1/probes/${selectedProbeId}/config`)
            if (!res.ok) throw new Error("Failed to fetch config")
            return res.json()
        },
        enabled: !!selectedProbeId && selectedProbeId !== ""
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

    const formatUptime = (seconds: number) => {
        if (!seconds) return '--'
        const days = Math.floor(seconds / 86400)
        const hours = Math.floor((seconds % 86400) / 3600)
        if (days > 0) return `${days}d ${hours}h`
        return `${hours}h`
    }

    const formatHeap = (bytes: number) => {
        if (!bytes) return '--'
        return `${(bytes / 1024).toFixed(1)} KB`
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

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <Settings className="h-4 w-4" />
                            {title}
                        </span>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsDialogOpen(true)}
                        >
                            {selectedProbeId ? "Change Probe" : "Select Probe"}
                        </Button>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {!selectedProbeId ? (
                        <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                            <Settings className="h-8 w-8 mb-2 opacity-50" />
                            <p className="text-sm">Select a probe to view configuration</p>
                        </div>
                    ) : isLoadingConfig ? (
                        <div className="flex items-center justify-center h-[300px]">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : isError ? (
                        <div className="flex flex-col items-center justify-center h-[300px] text-destructive">
                            <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
                            <p className="text-sm">Failed to load configuration</p>
                        </div>
                    ) : config ? (
                        <ScrollArea className="h-[300px]">
                            <div className="space-y-4">
                                {/* Probe Identity */}
                                <div className="p-3 border rounded-lg bg-muted/20">
                                    <div className="text-xs font-medium text-muted-foreground mb-2">Probe Identity</div>
                                    <div className="space-y-1 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Probe ID</span>
                                            <span className="font-mono font-medium">{config.probe_id}</span>
                                        </div>
                                        {config.version && (
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Firmware</span>
                                                <span className="font-mono font-medium">{config.version}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* WiFi Configuration */}
                                {config.wifi && Object.keys(config.wifi).length > 0 && (
                                    <div className="p-3 border rounded-lg bg-background">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Wifi className="h-3.5 w-3.5 text-muted-foreground" />
                                            <span className="text-xs font-medium text-muted-foreground">WiFi Settings</span>
                                        </div>
                                        <div className="space-y-1 text-xs">
                                            {Object.entries(config.wifi).map(([key, value]) => (
                                                <div key={key} className="flex justify-between">
                                                    <span className="text-muted-foreground capitalize">
                                                        {key.replace(/_/g, ' ')}
                                                    </span>
                                                    <span className="font-mono font-medium truncate max-w-[150px]">
                                                        {key.toLowerCase().includes('password') ? '••••••••' : String(value)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* MQTT Configuration */}
                                {config.mqtt && Object.keys(config.mqtt).length > 0 && (
                                    <div className="p-3 border rounded-lg bg-background">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                                            <span className="text-xs font-medium text-muted-foreground">MQTT Settings</span>
                                        </div>
                                        <div className="space-y-1 text-xs">
                                            {Object.entries(config.mqtt).map(([key, value]) => (
                                                <div key={key} className="flex justify-between">
                                                    <span className="text-muted-foreground capitalize">
                                                        {key.replace(/_/g, ' ')}
                                                    </span>
                                                    <span className="font-mono font-medium truncate max-w-[150px]">
                                                        {key.toLowerCase().includes('password') ? '••••••••' : String(value)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* System Info */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 border rounded-lg bg-background">
                                        <div className="flex items-center gap-2 mb-1 text-muted-foreground">
                                            <HardDrive className="h-3.5 w-3.5" />
                                            <span className="text-[10px] uppercase font-medium">Heap</span>
                                        </div>
                                        <div className="text-sm font-bold">{formatHeap(config.heap_free)}</div>
                                    </div>
                                    <div className="p-3 border rounded-lg bg-background">
                                        <div className="flex items-center gap-2 mb-1 text-muted-foreground">
                                            <Clock className="h-3.5 w-3.5" />
                                            <span className="text-[10px] uppercase font-medium">Uptime</span>
                                        </div>
                                        <div className="text-sm font-bold">{formatUptime(config.uptime)}</div>
                                    </div>
                                </div>

                                {/* Last Updated */}
                                <div className="text-[10px] text-muted-foreground text-center pt-2 border-t">
                                    Last updated: {new Date(config.updated_at).toLocaleString()}
                                </div>
                            </div>
                        </ScrollArea>
                    ) : null}
                </CardContent>
            </Card>

            {/* Probe Selection Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Select Probe</DialogTitle>
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

                        {/* Probe List */}
                        <ScrollArea className="h-[400px] border rounded-lg">
                            <div className="p-2 space-y-2">
                                {filteredProbes.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                                        <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
                                        <p className="text-sm">No probes found</p>
                                    </div>
                                ) : (
                                    filteredProbes.map((probe) => (
                                        <div
                                            key={probe.probe_id}
                                            className={cn(
                                                "p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50",
                                                selectedProbeId === probe.probe_id && "bg-primary/5 border-primary"
                                            )}
                                            onClick={() => {
                                                setSelectedProbeId(probe.probe_id)
                                                setIsDialogOpen(false)
                                            }}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    {getStatusIcon(probe.status)}
                                                    <div>
                                                        <div className="font-mono font-medium text-sm">
                                                            {probe.probe_id}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {probe.location || 'Unknown'} {probe.building && `• ${probe.building}`}
                                                        </div>
                                                    </div>
                                                </div>
                                                <Badge
                                                    variant={probe.status === 'active' ? 'default' : 'outline'}
                                                    className="text-[10px] h-5"
                                                >
                                                    {probe.status}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}