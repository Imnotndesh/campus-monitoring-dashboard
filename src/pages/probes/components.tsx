// components.tsx
import React, { useState } from "react"
import {
    Activity, Clock, MapPin, MoreVertical, Wifi,
    ShieldCheck, RefreshCw, RotateCcw, Loader2,
    Terminal, AlertTriangle, Download, Network, Cpu,
    Settings, Zap, Trash2, Edit3, Radio,
    UserPlus, AlertCircle
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import type {PingStatus, Probe, ProbeCommand, ProbeConfigCache, ProbeStatusCache} from "./types"
import { Progress } from "@/components/ui/progress"
import {useQuery} from "@tanstack/react-query";
import {apiFetch} from "../../lib/api.ts";

export function ProbeStatusBadge({ status }: { status: string }) {
    const styles = {
        active: "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 border-emerald-200",
        inactive: "bg-red-500/15 text-red-700 hover:bg-red-500/25 border-red-200",
        maintenance: "bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 border-amber-200"
    }
    const s = status as keyof typeof styles
    return <Badge className={styles[s] || styles.inactive} variant="outline">{status}</Badge>
}

function PingStatusLight({ probeId }: { probeId: string }) {
    const { data: pingStatus } = useQuery<PingStatus>({
        queryKey: ["probe_ping", probeId],
        queryFn: async () => await apiFetch(`/api/v1/probes/${probeId}/status`),
        refetchInterval: 10000,
    });

    if (!pingStatus) {
        return (
            <div className="flex items-center gap-1.5" title="Checking...">
                <div className="h-2.5 w-2.5 rounded-full bg-slate-300 animate-pulse" />
                <span className="text-[10px] text-muted-foreground">Syncing</span>
            </div>
        );
    }

    if (pingStatus.online) {
        return (
            <div
                className="flex items-center gap-1.5"
                title={`Online (Last seen: ${new Date(pingStatus.last_seen).toLocaleTimeString()})`}
            >
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                <span className="text-[10px] text-muted-foreground">Online</span>
            </div>
        );
    } else {
        return (
            <div
                className="flex items-center gap-1.5"
                title={`Offline (Last seen: ${new Date(pingStatus.last_seen).toLocaleTimeString()})`}
            >
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse" />
                <span className="text-[10px] text-amber-600 font-medium">Offline</span>
            </div>
        );
    }
}

function ProbeStatusDashboard({ data }: { data: ProbeStatusCache }) {
    if (!data) return null

    // Helper: Format Uptime (Seconds -> Human Readable)
    const formatUptime = (seconds: number) => {
        if (!seconds) return '--'
        const d = Math.floor(seconds / 86400)
        const h = Math.floor((seconds % 86400) / 3600)
        const m = Math.floor((seconds % 3600) / 60)

        const parts = []
        if (d > 0) parts.push(`${d}d`)
        if (h > 0) parts.push(`${h}h`)
        if (m > 0) parts.push(`${m}m`)
        return parts.length > 0 ? parts.join(' ') : `${seconds}s`
    }

    const getSignalColor = (rssi: number) => {
        if (rssi >= -50) return "text-emerald-500"
        if (rssi >= -70) return "text-yellow-500"
        return "text-red-500"
    }

    const totalHeapEst = 300000
    const usedHeap = totalHeapEst - (data.free_heap || 0)
    const heapPercent = Math.min(100, Math.max(0, (usedHeap / totalHeapEst) * 100))

    return (
        <div className="grid grid-cols-2 gap-3 mb-4 animate-in slide-in-from-top-2 duration-300">
            {/* ... (Same JSX as before, just using data properties) ... */}
            <div className="bg-card border rounded-lg p-3 flex flex-col justify-between shadow-sm">
                <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase">
                    <Wifi className="h-3 w-3" /> Signal (RSSI)
                </div>
                <div className="flex items-end justify-between mt-2">
                    <span className={`text-xl font-bold ${getSignalColor(data.rssi)}`}>
                        {data.rssi} <span className="text-xs font-normal text-muted-foreground">dBm</span>
                    </span>
                    <Activity className={`h-4 w-4 ${getSignalColor(data.rssi)}`} />
                </div>
            </div>

            <div className="bg-card border rounded-lg p-3 flex flex-col justify-between shadow-sm">
                <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase">
                    <Clock className="h-3 w-3" /> Uptime
                </div>
                <div className="mt-2 text-xl font-bold truncate" title={formatUptime(data.uptime)}>
                    {formatUptime(data.uptime)}
                </div>
            </div>

            <div className="bg-card border rounded-lg p-3 flex flex-col justify-between shadow-sm col-span-2">
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase">
                        <Cpu className="h-3 w-3" /> Memory Load
                    </div>
                    <span className="text-xs font-mono">{((data.free_heap || 0) / 1024).toFixed(0)}KB Free</span>
                </div>
                <Progress value={heapPercent} className="h-2" />
            </div>

            <div className="bg-card border rounded-lg p-3 col-span-2 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="bg-blue-500/10 p-2 rounded-full">
                        <Network className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground uppercase">IP Address</div>
                        <div className="font-mono font-bold">{data.ip || "Unknown"}</div>
                    </div>
                </div>
                {/* Use SSID if available */}
                <Badge variant="outline" className="font-mono text-[10px]">
                    {data.ssid || "WiFi"}
                </Badge>
            </div>
        </div>
    )
}

export function UnknownProbeCard({ probe, onAdopt }: { probe: any, onAdopt: () => void }) {
    return (
        <Card className="border-dashed border-2 border-yellow-500/50 hover:border-yellow-500 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    <Badge variant="outline" className="text-yellow-600">Unknown</Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    <div>
                        <p className="text-sm font-medium">Probe ID</p>
                        <p className="text-xl font-bold">{probe.probe_id}</p>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                        <p>Last seen: {new Date(probe.last_seen).toLocaleString()}</p>
                        {probe.ip_address && <p>IP: {probe.ip_address}</p>}
                    </div>
                    <Button onClick={onAdopt} className="w-full" variant="outline">
                        <UserPlus className="mr-2 h-4 w-4" /> Adopt & Configure
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}

export function ProbeCard({
                              probe,
                              onClick,
                              onDelete
                          }: {
    probe: Probe,
    onClick: () => void,
    onDelete: () => void
}) {
    return (
        <Card className="hover:shadow-md transition-all cursor-pointer group relative overflow-hidden" onClick={onClick}>
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${probe.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`} />

            <CardHeader className="flex flex-row items-start justify-between pb-2 pl-5">
                <div className="space-y-1">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                        <Wifi className="h-4 w-4 text-primary" />
                        {probe.probe_id}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1 text-xs">
                        <MapPin className="h-3 w-3" /> {probe.location || "Unassigned"}
                    </CardDescription>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClick(); }}>
                            View Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600" onClick={(e) => {
                            e.stopPropagation();
                            if(confirm("Are you sure?")) onDelete();
                        }}>
                            Delete Probe
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardHeader>
            <CardContent className="pl-5">
                <div className="flex items-center gap-1 text-xs text-muted-foreground" title="Last DB Record">
                    <Clock className="h-3 w-3" />
                    Last Seen ({new Date(probe.last_seen).toLocaleString([], {})})
                </div>
            </CardContent>
        </Card>
    )
}

export function ProbeControls({
                                  probeId,
                                  sendCommand,
                                  isSending,
                                  statusOutput,
                                  configOutput,
                                  onConfigDialogOpen
                              }: {
    probeId: string
    sendCommand: (params: any) => void
    isSending: boolean
    statusOutput: ProbeStatusCache | undefined
    configOutput: ProbeConfigCache | undefined
    onConfigDialogOpen: (type: 'wifi' | 'mqtt' | 'rename' | 'ota') => void
}) {
    return (
        <div className="space-y-6 py-4">
            {/* 1. Status Dashboard (Now Live/Cached) */}
            {statusOutput ? (
                <ProbeStatusDashboard data={statusOutput} />
            ) : (
                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg text-muted-foreground bg-muted/10">
                    <Activity className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">No recent status data</p>
                    <Button
                        variant="link"
                        size="sm"
                        onClick={() => sendCommand({ id: probeId, type: 'get_status' })}
                        className="mt-1"
                    >
                        Request Status
                    </Button>
                </div>
            )}

            {/* 2. Config Output Display */}
            {configOutput && (
                <Card className="border-blue-200 bg-blue-50/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Terminal className="h-4 w-4 text-blue-500" />
                            Device Configuration
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs font-mono">
                        <div className="flex justify-between border-b pb-1">
                            <span className="text-muted-foreground">Probe ID:</span>
                            <span className="font-bold">{configOutput.probe_id}</span>
                        </div>
                        {configOutput.wifi && (
                            <div className="flex justify-between border-b pb-1">
                                <span className="text-muted-foreground">WiFi SSID:</span>
                                <span>{configOutput.wifi.ssid}</span>
                            </div>
                        )}
                        {configOutput.mqtt && (
                            <div className="flex justify-between border-b pb-1">
                                <span className="text-muted-foreground">MQTT Broker:</span>
                                <span>{configOutput.mqtt.broker}:{configOutput.mqtt.port}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Last Updated:</span>
                            <span>{new Date(configOutput.updated_at).toLocaleTimeString()}</span>
                        </div>
                    </CardContent>
                </Card>
            )}
            <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase text-muted-foreground">Configuration</h4>
                <div className="grid grid-cols-1 gap-2">
                    <Button
                        variant="secondary"
                        className="justify-start"
                        onClick={() => onConfigDialogOpen('wifi')}
                        disabled={isSending}
                    >
                        <Radio className="h-4 w-4 mr-2" />
                        Configure WiFi
                    </Button>

                    <Button
                        variant="secondary"
                        className="justify-start"
                        onClick={() => onConfigDialogOpen('mqtt')}
                        disabled={isSending}
                    >
                        <Network className="h-4 w-4 mr-2" />
                        Configure MQTT
                    </Button>

                    <Button
                        variant="secondary"
                        className="justify-start"
                        onClick={() => onConfigDialogOpen('rename')}
                        disabled={isSending}
                    >
                        <Edit3 className="h-4 w-4 mr-2" />
                        Rename Probe
                    </Button>

                    <Button
                        variant="secondary"
                        className="justify-start"
                        onClick={() => onConfigDialogOpen('ota')}
                        disabled={isSending}
                    >
                        <Download className="h-4 w-4 mr-2" />
                        OTA Update
                    </Button>
                </div>
            </div>

            <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase text-muted-foreground">System Control</h4>
                <Button
                    variant="secondary"
                    className="w-full justify-start"
                    onClick={() => {
                        if (confirm("Reboot this probe?")) sendCommand({ id: probeId, type: 'restart', payload: { delay: 2000 } })
                    }}
                    disabled={isSending}
                >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reboot Probe
                </Button>
            </div>

            <div className="pt-6 border-t mt-6">
                <h4 className="text-xs font-bold text-red-500 uppercase mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-3 w-3" /> Danger Zone
                </h4>
                <Button
                    variant="destructive"
                    className="w-full justify-start"
                    onClick={() => {
                        if (confirm("CRITICAL WARNING: This will factory reset the probe and wipe all configuration. Continue?")) {
                            sendCommand({ id: probeId, type: 'factory_reset' })
                        }
                    }}
                    disabled={isSending}
                >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Factory Reset Probe
                </Button>
            </div>
        </div>
    )
}

export function CommandHistoryList({ history }: { history: ProbeCommand[] }) {
    if (history.length === 0) return <div className="text-center text-muted-foreground p-4 text-sm">No recent commands</div>

    const getStatusColor = (status: string) => {
        switch(status) {
            case 'completed': return 'bg-green-500/15 text-green-700 border-green-200'
            case 'failed': return 'bg-red-500/15 text-red-700 border-red-200'
            case 'processing': return 'bg-blue-500/15 text-blue-700 border-blue-200'
            case 'sent': return 'bg-purple-500/15 text-purple-700 border-purple-200'
            default: return 'bg-gray-500/15 text-gray-700 border-gray-200'
        }
    }

    return (
        <ScrollArea className="h-[400px]">
            <div className="space-y-2 pr-4">
                {history.map(cmd => (
                    <div key={cmd.id} className="flex flex-col p-3 border rounded text-sm bg-card hover:bg-muted/50 transition-colors">
                        <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-2 font-medium">
                                <Terminal className="h-3 w-3 text-muted-foreground" />
                                <span className="capitalize">{cmd.command_type.replace(/_/g, ' ')}</span>
                            </div>
                            <Badge className={getStatusColor(cmd.status)} variant="outline">
                                {cmd.status}
                            </Badge>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>ID: #{cmd.id}</span>
                            <span>{new Date(cmd.issued_at).toLocaleString()}</span>
                        </div>
                        {cmd.result && Object.keys(cmd.result).length > 0 && (
                            <div className="mt-2 p-2 bg-muted/50 rounded text-xs font-mono">
                                <pre className="whitespace-pre-wrap break-all">
                                    {JSON.stringify(cmd.result, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </ScrollArea>
    )
}

export function ConfigDialogs({
                                  probeId,
                                  type,
                                  isOpen,
                                  onClose,
                                  onSubmit,
                                  isSubmitting
                              }: {
    probeId: string,
    type: 'wifi' | 'mqtt' | 'rename' | 'ota' | null,
    isOpen: boolean,
    onClose: () => void,
    onSubmit: (data: any) => void,
    isSubmitting: boolean
}) {
    const [formData, setFormData] = useState<any>({})

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSubmit(formData)
        setFormData({})
    }

    if (!type) return null

    const dialogs = {
        wifi: {
            title: "Configure WiFi",
            description: "Update WiFi credentials for this probe",
            fields: (
                <>
                    <div className="grid gap-2">
                        <Label>SSID</Label>
                        <Input
                            placeholder="Network Name"
                            value={formData.ssid || ''}
                            onChange={(e) => setFormData({...formData, ssid: e.target.value})}
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>Password</Label>
                        <Input
                            type="password"
                            placeholder="Network Password"
                            value={formData.password || ''}
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                            required
                        />
                    </div>
                </>
            )
        },
        mqtt: {
            title: "Configure MQTT",
            description: "Update MQTT broker settings",
            fields: (
                <>
                    <div className="grid gap-2">
                        <Label>Broker Address</Label>
                        <Input
                            placeholder="mqtt.example.com"
                            value={formData.broker || ''}
                            onChange={(e) => setFormData({...formData, broker: e.target.value})}
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>Port</Label>
                        <Input
                            type="number"
                            placeholder="1883"
                            value={formData.port || 1883}
                            onChange={(e) => setFormData({...formData, port: parseInt(e.target.value)})}
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>Username (Optional)</Label>
                        <Input
                            placeholder="mqtt_user"
                            value={formData.user || ''}
                            onChange={(e) => setFormData({...formData, user: e.target.value})}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>Password (Optional)</Label>
                        <Input
                            type="password"
                            placeholder="mqtt_password"
                            value={formData.password || ''}
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                        />
                    </div>
                </>
            )
        },
        rename: {
            title: "Rename Probe",
            description: "Change the probe identifier",
            fields: (
                <div className="grid gap-2">
                    <Label>New Probe ID</Label>
                    <Input
                        placeholder="PROBE-NEW-ID"
                        value={formData.new_id || ''}
                        onChange={(e) => setFormData({...formData, new_id: e.target.value})}
                        required
                    />
                    <p className="text-xs text-muted-foreground">
                        Note: Probe will reboot after renaming
                    </p>
                </div>
            )
        },
        ota: {
            title: "OTA Firmware Update",
            description: "Upload new firmware to this probe",
            fields: (
                <div className="grid gap-2">
                    <Label>Firmware URL</Label>
                    <Input
                        placeholder="https://example.com/firmware.bin"
                        value={formData.url || ''}
                        onChange={(e) => setFormData({...formData, url: e.target.value})}
                        required
                    />
                    <p className="text-xs text-muted-foreground">
                        ⚠️ Ensure the URL is accessible from the probe's network
                    </p>
                </div>
            )
        }
    }

    const config = dialogs[type]

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{config.title}</DialogTitle>
                    <DialogDescription>{config.description}</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        {config.fields}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Apply Changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}