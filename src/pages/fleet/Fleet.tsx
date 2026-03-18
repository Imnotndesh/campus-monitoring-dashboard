import {useEffect, useState} from "react"
import {
    Activity, CheckCircle2, ChevronRight, Clock, Layers, Loader2, MoreHorizontal, Play, Plus,
    RefreshCw, Send, Server, Tag, Terminal, Trash2, Users, XCircle, Radio, RotateCcw,
    FileText, MapPin, X }
    from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { Separator } from "@/components/ui/separator"

import { useFleetViewModel } from "./useFleetViewModel"
import type {
    BaseProbe,
    FleetCommandRequest,
    FleetGroup,
    FleetProbe,
    MQTTConfig,
    ScanSettings,
    WiFiConfig
} from "./types"
import {FleetQuickActionsWidget, UnenrolledCountWidget, UnenrolledListWidget} from "./FleetWidgets.tsx";
import {useQuery} from "@tanstack/react-query";

// ─── Helpers ────────────────────────────────────────────────────────────────

function StatusDot({ online }: { online: boolean }) {
    return (
        <span className={`inline-block w-2 h-2 rounded-full ${online ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
    )
}

function CommandStatusBadge({ status }: { status: string }) {
    const map: Record<string, { label: string; className: string }> = {
        pending:     { label: "Pending",     className: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30" },
        scheduled:   { label: "Scheduled",   className: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
        in_progress: { label: "In Progress", className: "bg-primary/15 text-primary border-primary/30" },
        completed:   { label: "Completed",   className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
        failed:      { label: "Failed",      className: "bg-rose-500/15 text-rose-600 border-rose-500/30" },
        cancelled:   { label: "Cancelled",   className: "bg-muted text-muted-foreground" },
    }
    const { label, className } = map[status] || { label: status, className: "bg-muted text-muted-foreground" }
    return <Badge variant="outline" className={`text-[10px] h-5 ${className}`}>{label}</Badge>
}

function KpiCard({
                     title, value, desc, icon, trend
                 }: { title: string; value: string | number; desc: string; icon: React.ReactNode; trend?: "up" | "down" | "neutral" }) {
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

function RolloutProgressBar({ status }: { status: NonNullable<ReturnType<typeof useFleetViewModel>["commandStatus"]> }) {
    const { progress } = status
    const completedPct = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0
    const failedPct = progress.total > 0 ? (progress.failed / progress.total) * 100 : 0

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{status.command_type}</span>
                <CommandStatusBadge status={status.status} />
            </div>
            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                <div
                    className="absolute left-0 top-0 h-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${completedPct}%` }}
                />
                <div
                    className="absolute top-0 h-full bg-rose-500 transition-all duration-500"
                    style={{ left: `${completedPct}%`, width: `${failedPct}%` }}
                />
            </div>
            <div className="grid grid-cols-4 gap-2 text-[11px]">
                {[
                    { label: "Total",     val: progress.total,        color: "text-foreground" },
                    { label: "Done",      val: progress.completed,    color: "text-emerald-600" },
                    { label: "Failed",    val: progress.failed,       color: "text-rose-600" },
                    { label: "Pending",   val: progress.pending,      color: "text-muted-foreground" },
                ].map(({ label, val, color }) => (
                    <div key={label} className="text-center">
                        <div className={`font-bold text-base ${color}`}>{val}</div>
                        <div className="text-muted-foreground">{label}</div>
                    </div>
                ))}
            </div>
        </div>
    )
}


export function SendCommandDialog({
                                      open,
                                      onOpenChange,
                                      groups,
                                      probes,
                                      onSend,
                                      isSending
                                  }: {
    open: boolean,
    onOpenChange: (open: boolean) => void,
    groups: FleetGroup[],
    probes: FleetProbe[],
    onSend: (req: FleetCommandRequest) => void,
    isSending: boolean
}) {
    const [cmdType, setCmdType] = useState<string>("fleet_status")
    const [targetMode, setTargetMode] = useState<string>("all")
    const [targetGroup, setTargetGroup] = useState<string>("")
    const [targetProbe, setTargetProbe] = useState<string>("")

    // Dynamic Payload States
    const [otaUrl, setOtaUrl] = useState("")
    const [scanIp, setScanIp] = useState("8.8.8.8")
    const [locationStr, setLocationStr] = useState("")
    const [maintWindow, setMaintWindow] = useState("02:00-04:00")
    const [configJson, setConfigJson] = useState("{}")

    const handleSend = () => {
        let payload: Record<string, any> = {}

        // Build the payload based on command type
        if (cmdType === "fleet_ota") payload = { url: otaUrl }
        if (cmdType === "fleet_deep_scan") payload = { target_ip: scanIp }
        if (cmdType === "fleet_location") payload = { location: locationStr }
        if (cmdType === "fleet_maintenance") payload = { window: maintWindow }
        if (cmdType === "fleet_config") {
            try { payload = JSON.parse(configJson) }
            catch (e) { alert("Invalid JSON format"); return; }
        }

        onSend({
            command_type: cmdType,
            target_all: targetMode === "all",
            groups: targetMode === "group" && targetGroup ? [targetGroup] : [],
            probe_ids: targetMode === "specific" && targetProbe ? [targetProbe] : [],
            strategy: targetMode === "canary" ? "staggered" : "immediate",
            payload: payload
        })
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Dispatch Fleet Command</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label>Command Action</Label>
                        <Select value={cmdType} onValueChange={setCmdType}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="fleet_status">Status Check</SelectItem>
                                <SelectItem value="fleet_reboot">Reboot Probe</SelectItem>
                                <SelectItem value="fleet_deep_scan">Deep Scan</SelectItem>
                                <SelectItem value="fleet_ota">OTA Update</SelectItem>
                                <SelectItem value="fleet_config">Update Config</SelectItem>
                                <SelectItem value="fleet_location">Set Location</SelectItem>
                                <SelectItem value="fleet_maintenance">Set Maint. Window</SelectItem>
                                <SelectItem value="fleet_factory_reset">Factory Reset</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Dynamic Payload Inputs */}
                    {cmdType === "fleet_ota" && (
                        <div className="space-y-2">
                            <Label>Firmware URL</Label>
                            <Input placeholder="http://server/firmware.bin" value={otaUrl} onChange={e => setOtaUrl(e.target.value)} />
                        </div>
                    )}
                    {cmdType === "fleet_deep_scan" && (
                        <div className="space-y-2">
                            <Label>Target IP</Label>
                            <Input placeholder="8.8.8.8" value={scanIp} onChange={e => setScanIp(e.target.value)} />
                        </div>
                    )}
                    {cmdType === "fleet_location" && (
                        <div className="space-y-2">
                            <Label>Location Label</Label>
                            <Input placeholder="Server Room A" value={locationStr} onChange={e => setLocationStr(e.target.value)} />
                        </div>
                    )}
                    {cmdType === "fleet_maintenance" && (
                        <div className="space-y-2">
                            <Label>Maintenance Window</Label>
                            <Input placeholder="02:00-04:00" value={maintWindow} onChange={e => setMaintWindow(e.target.value)} />
                        </div>
                    )}
                    {cmdType === "fleet_config" && (
                        <div className="space-y-2">
                            <Label>JSON Configuration</Label>
                            <Textarea className="font-mono text-xs" value={configJson} onChange={e => setConfigJson(e.target.value)} rows={4} />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Target Selection</Label>
                        <Select value={targetMode} onValueChange={setTargetMode}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Entire Fleet (Rolling)</SelectItem>
                                <SelectItem value="group">Specific Group</SelectItem>
                                <SelectItem value="specific">Specific Probe</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {targetMode === "group" && (
                        <Select value={targetGroup} onValueChange={setTargetGroup}>
                            <SelectTrigger><SelectValue placeholder="Select Group" /></SelectTrigger>
                            <SelectContent>
                                {groups.map(g => <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}

                    {targetMode === "specific" && (
                        <Select value={targetProbe} onValueChange={setTargetProbe}>
                            <SelectTrigger><SelectValue placeholder="Select Probe" /></SelectTrigger>
                            <SelectContent>
                                {probes.map(p => <SelectItem key={p.probe_id} value={p.probe_id}>{p.probe_id}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSend} disabled={isSending}>
                        {isSending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Send Command
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ─── Create Group Dialog ──────────────────────────────────────────────────────

function CreateGroupDialog({
                               open, onOpenChange, onCreate, isCreating
                           }: {
    open: boolean
    onOpenChange: (v: boolean) => void
    onCreate: (name: string, desc: string) => void
    isCreating: boolean
}) {
    const [name, setName] = useState("")
    const [desc, setDesc] = useState("")

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="h-4 w-4" /> Create Group
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-2">
                    <div className="space-y-1.5">
                        <Label>Group Name</Label>
                        <Input placeholder="e.g. library-floor-2" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Description</Label>
                        <Input placeholder="Optional description" value={desc} onChange={e => setDesc(e.target.value)} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={() => { onCreate(name, desc); onOpenChange(false) }} disabled={!name || isCreating}>
                        {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Create
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// Replace the old CreateTemplateDialog function with this:

function CreateTemplateDialog({
                                  open,
                                  onOpenChange,
                                  onCreate,
                                  isCreating,
                                  groups,
                                  locationOptions,
                              }: {
    open: boolean
    onOpenChange: (v: boolean) => void
    onCreate: (t: any) => void
    isCreating: boolean
    groups: FleetGroup[]
    locationOptions: any
}) {
    // Form state
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")

    // WiFi
    const [wifi, setWifi] = useState<WiFiConfig>({ ssid: "", password: "", security: "WPA2" })
    // MQTT
    const [mqtt, setMqtt] = useState<MQTTConfig>({ broker: "", port: 1883, username: "", password: "", topic: "" })
    // Scan Settings
    const [scanSettings, setScanSettings] = useState<ScanSettings>({ interval: 60, targets: ["8.8.8.8"] })
    // Defaults
    const [defaultGroups, setDefaultGroups] = useState<string[]>([])
    const [defaultTags, setDefaultTags] = useState<Record<string, string>>({})
    const [defaultLocation, setDefaultLocation] = useState("")

    // Local state for tag input
    const [tagKey, setTagKey] = useState("")
    const [tagVal, setTagVal] = useState("")

    // Active tab
    const [activeTab, setActiveTab] = useState("wifi")

    // Helper to build the merged config (what the firmware expects)
    const buildConfig = (): Record<string, any> => {
        return {
            wifi: wifi.ssid ? { ssid: wifi.ssid, password: wifi.password, security: wifi.security } : undefined,
            mqtt: mqtt.broker ? mqtt : undefined,
            scan: scanSettings.interval ? scanSettings : undefined,
            // Add any other top‑level keys your firmware expects
        }
    }

    const handleCreate = () => {
        if (!name) return

        const templateData = {
            name,
            description,
            wifi: wifi.ssid ? wifi : undefined,
            mqtt: mqtt.broker ? mqtt : undefined,
            scan_settings: scanSettings.interval ? scanSettings : undefined,
            default_groups: defaultGroups.length ? defaultGroups : undefined,
            default_tags: Object.keys(defaultTags).length ? defaultTags : undefined,
            default_location: defaultLocation || undefined,
            config: buildConfig(), // merged config
        }
        onCreate(templateData)
        onOpenChange(false)
    }

    // Handlers for tags
    const addTag = () => {
        if (tagKey && tagVal) {
            setDefaultTags({ ...defaultTags, [tagKey]: tagVal })
            setTagKey("")
            setTagVal("")
        }
    }
    const removeTag = (key: string) => {
        const newTags = { ...defaultTags }
        delete newTags[key]
        setDefaultTags(newTags)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-4 w-4" /> Create Config Template
                    </DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
                    <TabsList className="grid grid-cols-5 w-full">
                        <TabsTrigger value="general">General</TabsTrigger>
                        <TabsTrigger value="wifi">WiFi</TabsTrigger>
                        <TabsTrigger value="mqtt">MQTT</TabsTrigger>
                        <TabsTrigger value="scan">Scan</TabsTrigger>
                        <TabsTrigger value="defaults">Defaults</TabsTrigger>
                    </TabsList>

                    {/* General */}
                    <TabsContent value="general" className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Template Name *</Label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. default-campus"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Input
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Optional description"
                            />
                        </div>
                    </TabsContent>

                    {/* WiFi */}
                    <TabsContent value="wifi" className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>SSID</Label>
                            <Input
                                value={wifi.ssid}
                                onChange={(e) => setWifi({ ...wifi, ssid: e.target.value })}
                                placeholder="Network name"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Password</Label>
                            <Input
                                type="password"
                                value={wifi.password}
                                onChange={(e) => setWifi({ ...wifi, password: e.target.value })}
                                placeholder="Leave blank to keep existing"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Security</Label>
                            <Select
                                value={wifi.security}
                                onValueChange={(v) => setWifi({ ...wifi, security: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select security mode" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="WPA2">WPA2</SelectItem>
                                    <SelectItem value="WPA3">WPA3</SelectItem>
                                    <SelectItem value="none">None (open)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </TabsContent>

                    {/* MQTT */}
                    <TabsContent value="mqtt" className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>Broker</Label>
                                <Input
                                    value={mqtt.broker}
                                    onChange={(e) => setMqtt({ ...mqtt, broker: e.target.value })}
                                    placeholder="mqtt.example.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Port</Label>
                                <Input
                                    type="number"
                                    value={mqtt.port}
                                    onChange={(e) => setMqtt({ ...mqtt, port: parseInt(e.target.value) || 1883 })}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>Username (optional)</Label>
                                <Input
                                    value={mqtt.username}
                                    onChange={(e) => setMqtt({ ...mqtt, username: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Password (optional)</Label>
                                <Input
                                    type="password"
                                    value={mqtt.password}
                                    onChange={(e) => setMqtt({ ...mqtt, password: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Topic Prefix (optional)</Label>
                            <Input
                                value={mqtt.topic}
                                onChange={(e) => setMqtt({ ...mqtt, topic: e.target.value })}
                                placeholder="campus/probes"
                            />
                        </div>
                    </TabsContent>

                    {/* Scan Settings */}
                    <TabsContent value="scan" className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Interval (seconds)</Label>
                            <Input
                                type="number"
                                value={scanSettings.interval}
                                onChange={(e) => setScanSettings({ ...scanSettings, interval: parseInt(e.target.value) || 60 })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Targets (comma separated)</Label>
                            <Input
                                value={scanSettings.targets.join(", ")}
                                onChange={(e) => setScanSettings({
                                    ...scanSettings,
                                    targets: e.target.value.split(",").map(s => s.trim()).filter(Boolean)
                                })}
                                placeholder="8.8.8.8, 1.1.1.1"
                            />
                        </div>
                    </TabsContent>

                    {/* Defaults */}
                    <TabsContent value="defaults" className="space-y-4 py-4">
                        {/* Groups */}
                        <div className="space-y-2">
                            <Label>Default Groups</Label>
                            <Select onValueChange={(value) => setDefaultGroups([...defaultGroups, value])}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Add a group" />
                                </SelectTrigger>
                                <SelectContent>
                                    {groups.map(g => (
                                        <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {defaultGroups.map(g => (
                                    <Badge key={g} variant="secondary" className="flex items-center gap-1">
                                        {g}
                                        <button onClick={() => setDefaultGroups(defaultGroups.filter(x => x !== g))}>
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        {/* Location with suggestions */}
                        <div className="space-y-2">
                            <Label>Default Location</Label>
                            <Input
                                value={defaultLocation}
                                onChange={(e) => setDefaultLocation(e.target.value)}
                                placeholder="e.g. Server Room A"
                                list="location-suggestions"
                            />
                            <datalist id="location-suggestions">
                                {locationOptions?.rooms?.map((r: string) => (
                                    <option key={r} value={r} />
                                ))}
                            </datalist>
                        </div>

                        {/* Tags */}
                        <div className="space-y-2">
                            <Label>Default Tags</Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Key"
                                    value={tagKey}
                                    onChange={(e) => setTagKey(e.target.value)}
                                />
                                <Input
                                    placeholder="Value"
                                    value={tagVal}
                                    onChange={(e) => setTagVal(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addTag()}
                                />
                                <Button size="sm" onClick={addTag} disabled={!tagKey || !tagVal}>
                                    Add
                                </Button>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {Object.entries(defaultTags).map(([k, v]) => (
                                    <Badge key={k} variant="outline" className="flex items-center gap-1">
                                        {k}: {v}
                                        <button onClick={() => removeTag(k)}>
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>

                {/* Preview of merged config (read‑only) */}
                <div className="mt-4 p-3 bg-muted/30 rounded border">
                    <div className="text-xs font-medium mb-1">Merged Config (sent to probes):</div>
                    <pre className="text-[10px] font-mono overflow-auto max-h-32">
                        {JSON.stringify(buildConfig(), null, 2)}
                    </pre>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleCreate} disabled={!name || isCreating}>
                        {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Template
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ─── Probe Detail Panel ───────────────────────────────────────────────────────

function ProbeDetailPanel({
                              probe, onUnenroll, onClose, groups, onSendCommand
                          }: {

    probe: FleetProbe
    onUnenroll: () => void
    onClose: () => void
    groups: ReturnType<typeof useFleetViewModel>["groups"]
    onSendCommand: (req: FleetCommandRequest) => void
}) {
    const { data: liveStatus, isLoading: isStatusLoading } = useQuery({
        queryKey: ["probe-live-status", probe.probe_id],
        queryFn: async () => {
            const res = await fetch(`/api/v1/probes/${probe.probe_id}/status`)
            if (!res.ok) throw new Error("Status not available")
            return res.json()
        },
        refetchInterval: 5000,
        retry: false,
    })
    const [confirmUnenroll, setConfirmUnenroll] = useState(false)

    const statRow = (label: string, value: React.ReactNode) => (
        <div className="flex items-center justify-between py-2 border-b last:border-0">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="text-xs font-medium">{value}</span>
        </div>
    )

    const formatUptime = (s?: number) => {
        if (!s) return "--"
        const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
        return `${h}h ${m}m`
    }

    return (
        <>
            <div className="flex flex-col h-full bg-card">
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between bg-muted/20">
                    <div>
                        <div className="flex items-center gap-2">
                            <StatusDot online={!!probe.mqtt_connected} />
                            <span className="font-bold font-mono text-sm">{probe.probe_id}</span>
                        </div>
                        {probe.location && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                <MapPin className="h-3 w-3" /> {probe.location}
                            </div>
                        )}
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                        <XCircle className="h-4 w-4" />
                    </Button>
                </div>

                <ScrollArea className="flex-1 p-4">
                    <div className="space-y-6">

                        {/* ── LIVE STATS SECTION ── */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Activity className="h-4 w-4 text-primary" />
                                <h4 className="text-sm font-medium">Broadcasted Stats</h4>
                                {isStatusLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground ml-2" />}
                            </div>

                            {!liveStatus ? (
                                <div className="text-xs text-muted-foreground bg-muted/50 p-4 rounded-md text-center">
                                    {isStatusLoading ? "Fetching latest status..." : "No recent broadcast data available."}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3">
                                    <div className="p-3 bg-muted/40 rounded-lg border">
                                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Heap / Memory</div>
                                        <div className="font-mono text-sm">
                                            {liveStatus.free_heap ? `${(liveStatus.free_heap / 1024).toFixed(1)} KB` : "--"}
                                        </div>
                                    </div>
                                    <div className="p-3 bg-muted/40 rounded-lg border">
                                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Uptime</div>
                                        <div className="font-mono text-sm">
                                            {liveStatus.uptime ? `${Math.floor(liveStatus.uptime / 60)}m ${liveStatus.uptime % 60}s` : "--"}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <Separator />

                        {/* ── FLEET INFO SECTION ── */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-medium flex items-center gap-2">
                                <Server className="h-4 w-4 text-primary" /> Fleet Identity
                            </h4>
                            <div className="grid grid-cols-2 gap-y-2 text-xs">
                                <div className="text-muted-foreground">Location</div>
                                <div className="font-medium text-right">{probe.location || "--"}</div>

                                <div className="text-muted-foreground">Enrolled By</div>
                                <div className="font-medium text-right truncate">{probe?.managed_by ?? "--"}</div>

                                <div className="text-muted-foreground">Current Firmware</div>
                                <div className="font-mono text-right">{probe?.current_firmware ?? probe?.firmware_version?? "latest"}</div>

                                <div className="text-muted-foreground">Target Firmware</div>
                                <div className="font-mono text-right">{probe?.target_firmware ?? "latest"}</div>
                            </div>

                            {/* Tags Display */}
                            {probe.tags && Object.keys(probe.tags).length > 0 && (
                                <div className="pt-2">
                                    <div className="text-xs text-muted-foreground mb-2">Assigned Tags</div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {Object.entries(probe.tags).map(([k, v]) => (
                                            <Badge key={k} variant="outline" className="text-[10px] font-mono">
                                                {k}: {v as string}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </ScrollArea>
                <Separator />
                {/* Footer actions */}
                <div className="p-4 border-t">
                    <Button
                        variant="destructive"
                        size="sm"
                        className="w-full gap-2"
                        onClick={() => setConfirmUnenroll(true)}
                    >
                        <XCircle className="h-4 w-4" /> Unenroll from Fleet
                    </Button>
                </div>
            </div>

            <AlertDialog open={confirmUnenroll} onOpenChange={setConfirmUnenroll}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Unenroll {probe.probe_id}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will remove the probe from fleet management. It will continue operating independently.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { onUnenroll(); onClose() }}>Unenroll</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}

function SmartEnrollmentDialog({
                                   probe,
                                   open,
                                   onOpenChange,
                                   availableGroups = [],
                                   onEnroll,
                                   isEnrolling,
                                   getSmartSuggestions
                               }: {
    probe: any | null,
    open: boolean,
    onOpenChange: (open: boolean) => void,
    availableGroups: any[]
    onEnroll: (probeId: string, req: any) => void
    isEnrolling: boolean
    getSmartSuggestions: (loc: string) => { groups: string[]; tags: Record<string, string> }
}) {
    const [selectedGroups, setSelectedGroups] = useState<string[]>([])
    const [tags, setTags] = useState<Record<string, string>>({})

    // State for manual inputs
    const [tagKey, setTagKey] = useState("")
    const [tagVal, setTagVal] = useState("")

    useEffect(() => {
        if (probe && open) {
            const suggestions = getSmartSuggestions(probe.building || probe.location)
            setSelectedGroups(suggestions.groups || [])
            setTags(suggestions.tags || {})
            setTagKey("")
            setTagVal("")
        }
    }, [probe?.probe_id, open])

    const handleEnroll = () => {
        if (!probe) return
        onEnroll(probe.probe_id, {
            groups: selectedGroups,
            tags: tags,
            location: probe.location,
        })
        onOpenChange(false)
    }

    // Handlers for manual entry
    const addGroup = (groupName: string) => {
        if (groupName && !selectedGroups.includes(groupName)) {
            setSelectedGroups([...selectedGroups, groupName])
        }
    }

    const removeGroup = (groupName: string) => {
        setSelectedGroups(selectedGroups.filter(g => g !== groupName))
    }

    const addTag = () => {
        if (tagKey && tagVal) {
            setTags({ ...tags, [tagKey]: tagVal })
            setTagKey("")
            setTagVal("")
        }
    }

    const removeTag = (key: string) => {
        const newTags = { ...tags }
        delete newTags[key]
        setTags(newTags)
    }

    if (!probe) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Enroll Probe: {probe.probe_id}</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                        <MapPin className="inline w-4 h-4 mr-1 text-primary"/>
                        Detected in <strong>{probe.building || probe.location || "Unknown"}</strong>.
                    </div>

                    {/* ── GROUPS SECTION ── */}
                    <div className="space-y-3">
                        <Label>Assign Groups</Label>
                        <Select onValueChange={addGroup}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a group to add..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableGroups.map(g => (
                                    <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="flex flex-wrap gap-2 mt-2">
                            {selectedGroups.length > 0 ? selectedGroups.map(g => (
                                <Badge key={g} variant="secondary" className="flex items-center gap-1 pr-1">
                                    {g}
                                    <button onClick={() => removeGroup(g)} className="hover:bg-muted-foreground/20 rounded-full p-0.5">
                                        <X className="w-3 h-3" />
                                    </button>
                                </Badge>
                            )) : <span className="text-xs text-muted-foreground">No groups assigned</span>}
                        </div>
                    </div>

                    {/* ── TAGS SECTION ── */}
                    <div className="space-y-3">
                        <Label>Assign Tags</Label>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Key (e.g. floor)"
                                value={tagKey}
                                onChange={e => setTagKey(e.target.value)}
                                className="h-9"
                            />
                            <Input
                                placeholder="Value (e.g. 2nd)"
                                value={tagVal}
                                onChange={e => setTagVal(e.target.value)}
                                className="h-9"
                                onKeyDown={(e) => e.key === 'Enter' && addTag()}
                            />
                            <Button type="button" size="sm" onClick={addTag} disabled={!tagKey || !tagVal} className="h-9">
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-2">
                            {Object.entries(tags).length > 0 ? Object.entries(tags).map(([k, v]) => (
                                <Badge key={k} variant="outline" className="flex items-center gap-1 pr-1">
                                    <Tag className="w-3 h-3 mr-1"/>{k}: {v}
                                    <button onClick={() => removeTag(k)} className="hover:bg-muted-foreground/10 rounded-full p-0.5 ml-1">
                                        <X className="w-3 h-3" />
                                    </button>
                                </Badge>
                            )) : <span className="text-xs text-muted-foreground">No tags assigned</span>}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleEnroll} disabled={isEnrolling}>
                        {isEnrolling && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Confirm Enrollment
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
function CreateRoutineDialog({
                                 open,
                                 onOpenChange,
                                 probeId,
                                 onCreate,
                                 isCreating,
                             }: {
    open: boolean
    onOpenChange: (v: boolean) => void
    probeId: string
    onCreate: (task: any) => void
    isCreating: boolean
}) {
    const [commandType, setCommandType] = useState("ping")
    const [scheduleType, setScheduleType] = useState<"one-time" | "recurring">("one-time")
    const [executeAt, setExecuteAt] = useState("")
    const [cron, setCron] = useState("@daily")
    const [payloadJson, setPayloadJson] = useState("{}")
    const [jsonError, setJsonError] = useState("")

    const handleCreate = () => {
        let payload: Record<string, any> = {}
        try {
            payload = JSON.parse(payloadJson)
            setJsonError("")
        } catch {
            setJsonError("Invalid JSON")
            return
        }

        const schedule: any = {
            type: scheduleType,
        }

        if (scheduleType === "one-time") {
            if (!executeAt) {
                setJsonError("Execution time required")
                return
            }
            schedule.execute_at = executeAt + ":00Z"
        } else {
            schedule.cron = cron
        }

        const task = {
            probe_id: probeId,
            command_type: commandType,
            payload,
            schedule,
        }
        onCreate(task)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Schedule a Routine</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label>Command Type</Label>
                        <Select value={commandType} onValueChange={setCommandType}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ping">Ping</SelectItem>
                                <SelectItem value="deep_scan">Deep Scan</SelectItem>
                                <SelectItem value="get_status">Get Status</SelectItem>
                                <SelectItem value="restart">Restart</SelectItem>
                                <SelectItem value="ota_update">OTA Update</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Payload (JSON)</Label>
                        <Textarea
                            value={payloadJson}
                            onChange={(e) => setPayloadJson(e.target.value)}
                            className="font-mono text-xs h-24"
                        />
                        {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label>Schedule Type</Label>
                        <Select value={scheduleType} onValueChange={(v: any) => setScheduleType(v)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="one-time">One-time</SelectItem>
                                <SelectItem value="recurring">Recurring</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {scheduleType === "one-time" ? (
                        <div className="space-y-2">
                            <Label>Execute At</Label>
                            <Input
                                type="datetime-local"
                                value={executeAt}
                                onChange={(e) => setExecuteAt(e.target.value)}
                            />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <Label>Cron Pattern</Label>
                            <Select value={cron} onValueChange={setCron}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="@hourly">Hourly</SelectItem>
                                    <SelectItem value="@daily">Daily</SelectItem>
                                    <SelectItem value="@weekly">Weekly</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleCreate} disabled={isCreating}>
                        {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
// ─── Main Fleet Page ──────────────────────────────────────────────────────────

export default function Fleet() {
    const vm = useFleetViewModel()

    // Guard all arrays against null/undefined before first query resolves
    const probes = vm.probes ?? []
    const groups = vm.groups ?? []
    const templates = vm.templates ?? []
    const commands = vm.commands ?? []
    const [probeToEnroll, setProbeToEnroll] = useState<any | null>(null)

    const [sendCmdOpen, setSendCmdOpen] = useState(false)
    const [createGroupOpen, setCreateGroupOpen] = useState(false)
    const [createTemplateOpen, setCreateTemplateOpen] = useState(false)
    const [createRoutineOpen, setCreateRoutineOpen] = useState(false)

    const selectedProbeObj = vm.selectedProbeId
        ? probes.find(p => p.probe_id === vm.selectedProbeId) ?? vm.selectedProbe
        : null

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Fleet Management</h2>
                    <p className="text-muted-foreground">
                        Orchestrate, configure, and monitor your probe fleet at scale
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-2" onClick={vm.refreshAll}>
                        <RefreshCw className="h-4 w-4" /> Refresh
                    </Button>
                    <Button size="sm" className="gap-2" onClick={() => setSendCmdOpen(true)}>
                        <Send className="h-4 w-4" /> Send Command
                    </Button>
                </div>
            </div>

            {/* ── KPI Row ── */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <KpiCard
                    title="Managed Probes"
                    value={vm.fleetStatus?.total_managed ?? "--"}
                    desc={`${vm.fleetStatus?.online ?? 0} online · ${vm.fleetStatus?.offline ?? 0} offline`}
                    icon={<Server className="h-4 w-4 text-primary" />}
                />
                <KpiCard
                    title="Groups"
                    value={groups.length ?? 0}
                    desc="Active probe groups"
                    icon={<Users className="h-4 w-4 text-blue-500" />}
                />
                <KpiCard
                    title="Config Templates"
                    value={vm.fleetStatus?.templates ?? "--"}
                    desc="Reusable configurations"
                    icon={<Layers className="h-4 w-4 text-purple-500" />}
                />
                <UnenrolledCountWidget />
            </div>

            {/* ── Main Content ── */}
            <Tabs defaultValue="probes" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="probes">
                        <Server className="h-3.5 w-3.5 mr-1.5" /> Probes
                    </TabsTrigger>
                    <TabsTrigger value="commands">
                        <Terminal className="h-3.5 w-3.5 mr-1.5" /> Commands
                    </TabsTrigger>
                    <TabsTrigger value="groups">
                        <Users className="h-3.5 w-3.5 mr-1.5" /> Groups
                    </TabsTrigger>
                    <TabsTrigger value="templates">
                        <Layers className="h-3.5 w-3.5 mr-1.5" /> Templates
                    </TabsTrigger>
                    <TabsTrigger value="routines"><Clock className="h-3.5 w-3.5 mr-1.5" /> Routines</TabsTrigger>
                </TabsList>

                {/* ═══════════════════ TAB: PROBES ═══════════════════ */}
                <TabsContent value="probes" className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Select value={vm.groupFilter} onValueChange={vm.setGroupFilter}>
                            <SelectTrigger className="w-[180px] bg-background">
                                <SelectValue placeholder="Filter by group" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Groups</SelectItem>
                                {groups.map(g => (
                                    <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <div className="flex-1" />
                        <Badge variant="outline" className="text-xs">
                            {probes.length} probes
                        </Badge>
                    </div>

                    {/* Changed grid to 12 columns for better splitting */}
                    <div className="grid gap-4 lg:grid-cols-12">

                        {/* Left Side: Probe List (Always takes 8 columns) */}
                        <Card className="lg:col-span-8">
                            <CardContent className="p-0">
                                {vm.isProbesLoading ? (
                                    <div className="flex items-center justify-center h-[300px]">
                                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                    </div>
                                ) : probes.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                                        <Server className="h-8 w-8 opacity-30 mb-2" />
                                        <p className="text-sm">No managed probes</p>
                                        <p className="text-xs mt-1">Enroll probes from the Probes page</p>
                                    </div>
                                ) : (
                                    <ScrollArea className="h-[480px]">
                                        <div className="divide-y">
                                            {probes.map(probe => (
                                                <div
                                                    key={probe.probe_id}
                                                    className={`flex items-center gap-4 px-4 py-3 hover:bg-muted/40 cursor-pointer transition-colors group ${
                                                        vm.selectedProbeId === probe.probe_id ? "bg-primary/5 border-l-2 border-l-primary" : ""
                                                    }`}
                                                    onClick={() => vm.setSelectedProbeId(
                                                        vm.selectedProbeId === probe.probe_id ? null : probe.probe_id
                                                    )}
                                                >
                                                    {/* Status */}
                                                    <div className="flex-shrink-0">
                                                        <StatusDot online={!!probe.mqtt_connected} />
                                                    </div>

                                                    {/* Identity */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono font-medium text-sm">{probe.probe_id}</span>
                                                            {probe.groups?.slice(0, 2).map(g => (
                                                                <Badge key={g} variant="secondary" className="text-[9px] h-4">{g}</Badge>
                                                            ))}
                                                            {probe.groups?.length > 2 && (
                                                                <Badge variant="secondary" className="text-[9px] h-4">+{probe.groups.length - 2}</Badge>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground truncate mt-0.5">
                                                            {probe.location && <span className="mr-2">{probe.location}</span>}
                                                            {probe.firmware_version && <span className="font-mono">v{probe.firmware_version}</span>}
                                                        </div>
                                                    </div>

                                                    {/* RSSI */}
                                                    {probe.wifi_rssi !== undefined && (
                                                        <div className="text-right hidden md:block">
                                                            <div className={`text-sm font-mono font-medium ${
                                                                probe.wifi_rssi > -60 ? "text-emerald-600"
                                                                    : probe.wifi_rssi > -75 ? "text-yellow-600"
                                                                        : "text-rose-600"
                                                            }`}>{probe.wifi_rssi} dBm</div>
                                                            <div className="text-[10px] text-muted-foreground">RSSI</div>
                                                        </div>
                                                    )}

                                                    {/* Actions */}
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={e => {
                                                                e.stopPropagation()
                                                                vm.sendCommand({ command_type: "fleet_status", probe_ids: [probe.probe_id], strategy: "immediate" })
                                                            }}>
                                                                <Activity className="h-4 w-4 mr-2" /> Request Status
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={e => {
                                                                e.stopPropagation()
                                                                vm.sendCommand({ command_type: "fleet_deep_scan", probe_ids: [probe.probe_id], strategy: "immediate" })
                                                            }}>
                                                                <Radio className="h-4 w-4 mr-2" /> Deep Scan
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={e => {
                                                                e.stopPropagation()
                                                                vm.sendCommand({ command_type: "fleet_reboot", probe_ids: [probe.probe_id], strategy: "immediate" })
                                                            }}>
                                                                <RotateCcw className="h-4 w-4 mr-2" /> Reboot
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                className="text-destructive"
                                                                onClick={e => {
                                                                    e.stopPropagation()
                                                                    vm.unenrollProbe(probe.probe_id)
                                                                }}
                                                            >
                                                                <XCircle className="h-4 w-4 mr-2" /> Unenroll
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>

                                                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                )}
                            </CardContent>
                        </Card>

                        {/* Right Side: Dynamic Panel (Takes 4 columns) */}
                        <div className="lg:col-span-4 space-y-4">
                            {selectedProbeObj ? (
                                <Card className="flex flex-col overflow-hidden border-t-4 border-t-primary/30 h-full">
                                    <ProbeDetailPanel
                                        probe={selectedProbeObj}
                                        onUnenroll={() => vm.unenrollProbe(selectedProbeObj.probe_id)}
                                        onClose={() => vm.setSelectedProbeId(null)}
                                        groups={groups}
                                        onSendCommand={vm.sendCommand}
                                    />
                                </Card>
                            ) : (
                                <>
                                    <FleetQuickActionsWidget
                                        groups={groups}
                                        onSend={vm.sendCommand}
                                        isSending={vm.isSendingCommand}
                                    />
                                    <UnenrolledListWidget
                                        onEnrollClick={(probe) => setProbeToEnroll(probe)}
                                    />
                                </>
                            )}
                        </div>
                    </div>
                </TabsContent>
                {/* ═══════════════════ TAB: COMMANDS ═══════════════════ */}
                <TabsContent value="commands" className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="flex bg-muted p-1 rounded-md">
                            {(["all", "pending", "in_progress", "completed", "failed"] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => vm.setCommandFilter(f)}
                                    className={`px-3 py-1 text-xs font-medium rounded-sm transition-all capitalize ${
                                        vm.commandFilter === f
                                            ? "bg-background shadow-sm"
                                            : "text-muted-foreground hover:text-foreground"
                                    }`}
                                >
                                    {f.replace("_", " ")}
                                </button>
                            ))}
                        </div>
                        <div className="flex-1" />
                        <Button size="sm" className="gap-2" onClick={() => setSendCmdOpen(true)}>
                            <Plus className="h-4 w-4" /> New Command
                        </Button>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-7">
                        {/* Commands list */}
                        <Card className={vm.selectedCommandId ? "lg:col-span-3" : "lg:col-span-7"}>
                            <CardContent className="p-0">
                                {vm.isCommandsLoading ? (
                                    <div className="flex items-center justify-center h-[300px]">
                                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                    </div>
                                ) : commands.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                                        <Terminal className="h-8 w-8 opacity-30 mb-2" />
                                        <p className="text-sm">No fleet commands</p>
                                    </div>
                                ) : (
                                    <ScrollArea className="h-[600px]">
                                        <div className="divide-y">
                                            {commands.map(cmd => (
                                                <div
                                                    key={cmd.id}
                                                    className={`flex items-center gap-4 px-4 py-3 hover:bg-muted/40 cursor-pointer transition-colors group ${
                                                        vm.selectedCommandId === cmd.id ? "bg-primary/5 border-l-2 border-l-primary" : ""
                                                    }`}
                                                    onClick={() => vm.setSelectedCommandId(
                                                        vm.selectedCommandId === cmd.id ? null : cmd.id
                                                    )}
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono text-sm font-medium">{cmd.command_type}</span>
                                                            <Badge variant={cmd.status === "completed" ? "default" : cmd.status === "failed" ? "destructive" : "secondary"} className="text-[10px] h-4">
                                                                {cmd.status}
                                                            </Badge>
                                                        </div>
                                                        <div className="text-xs text-muted-foreground mt-0.5">
                                                            {new Date(cmd.issued_at).toLocaleString()} · {cmd.total_targets} targets
                                                        </div>
                                                    </div>

                                                    {cmd.total_targets > 0 && (
                                                        <div className="w-20 hidden lg:block">
                                                            <Progress value={(cmd.completed_count / cmd.total_targets) * 100} className="h-1.5" />
                                                            <div className="text-[10px] text-muted-foreground text-right mt-0.5">
                                                                {cmd.completed_count}/{cmd.total_targets}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                )}
                            </CardContent>
                        </Card>

                        {/* Rollout Status & Responses Panel */}
                        {vm.selectedCommandId && (
                            <Card className="lg:col-span-4 flex flex-col overflow-hidden border-t-4 border-t-primary/30 h-[600px]">
                                <CardHeader className="pb-2 bg-muted/20 border-b">
                                    <CardTitle className="text-sm flex items-center justify-between">
                                        Execution Details
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => vm.setSelectedCommandId(null)}>
                                            <XCircle className="h-4 w-4" />
                                        </Button>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex-1 p-0 flex flex-col">
                                    {vm.commandStatus ? (
                                        <>
                                            {/* Overall Summary */}
                                            <div className="p-4 border-b space-y-4">
                                                <div className="space-y-2 text-xs">
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Command ID</span>
                                                        <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{vm.selectedCommandId}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Issued At</span>
                                                        <span>{new Date(vm.commandStatus.timeline.started_at).toLocaleString()}</span>
                                                    </div>
                                                    {vm.commandStatus.payload && Object.keys(vm.commandStatus.payload).length > 0 && (
                                                        <div className="mt-2 bg-muted/50 p-2 rounded border font-mono text-[10px] break-all">
                                                            <span className="text-muted-foreground block mb-1">Payload Sent:</span>
                                                            {JSON.stringify(vm.commandStatus.payload, null, 2)}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Detailed Probe Responses */}
                                            <div className="flex-1 overflow-hidden flex flex-col">
                                                <div className="px-4 py-2 bg-muted/30 text-xs font-semibold border-b">
                                                    Target Responses
                                                </div>
                                                <ScrollArea className="flex-1">
                                                    {vm.commandStatus.targets && vm.commandStatus.targets.length > 0 ? (
                                                        <div className="divide-y">
                                                            {vm.commandStatus.targets.map((target: any) => (
                                                                <div key={target.probe_id} className="p-4 space-y-2">
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="font-mono font-medium text-sm">{target.probe_id}</span>
                                                                        <Badge variant={target.status === "completed" ? "default" : target.status === "failed" ? "destructive" : "secondary"}>
                                                                            {target.status}
                                                                        </Badge>
                                                                    </div>
                                                                    {target.response_payload && (
                                                                        <div className="bg-black/90 text-green-400 p-3 rounded-md font-mono text-[10px] whitespace-pre-wrap overflow-x-auto">
                                                                            {typeof target.response_payload === 'object'
                                                                                ? JSON.stringify(target.response_payload, null, 2)
                                                                                : target.response_payload}
                                                                        </div>
                                                                    )}
                                                                    {target.error && (
                                                                        <div className="bg-rose-500/10 text-rose-500 p-2 rounded border border-rose-500/20 text-xs">
                                                                            {target.error}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="p-8 text-center text-muted-foreground text-sm">
                                                            Waiting for target assignments...
                                                        </div>
                                                    )}
                                                </ScrollArea>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex items-center justify-center h-full">
                                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </TabsContent>

                {/* ═══════════════════ TAB: GROUPS ═══════════════════ */}
                <TabsContent value="groups" className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">{groups.length} groups configured</p>
                        <Button size="sm" className="gap-2" onClick={() => setCreateGroupOpen(true)}>
                            <Plus className="h-4 w-4" /> New Group
                        </Button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {vm.isGroupsLoading ? (
                            <div className="col-span-3 flex items-center justify-center h-[200px]">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : groups.length === 0 ? (
                            <div className="col-span-3 flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                                <Users className="h-8 w-8 opacity-30 mb-2" />
                                <p className="text-sm">No groups yet</p>
                            </div>
                        ) : (
                            groups.map(group => {
                                const probeCount = probes.filter(p => p.groups?.includes(group.name)).length
                                const onlineCount = probes.filter(p => p.groups?.includes(group.name) && p.mqtt_connected).length

                                return (
                                    <Card key={group.id} className="relative group">
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                                        <Users className="h-4 w-4 text-primary" />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-sm">{group.name}</div>
                                                        {group.description && (
                                                            <div className="text-xs text-muted-foreground">{group.description}</div>
                                                        )}
                                                    </div>
                                                </div>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => {
                                                            vm.sendCommand({
                                                                command_type: "fleet_status",
                                                                groups: [group.name],
                                                                strategy: "immediate"
                                                            })
                                                        }}>
                                                            <Send className="h-4 w-4 mr-2" /> Send Command to Group
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-destructive"
                                                            onClick={() => vm.deleteGroup(group.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>

                                            <div className="mt-4 flex items-center gap-4 text-sm">
                                                <div className="text-center">
                                                    <div className="font-bold text-lg">{probeCount}</div>
                                                    <div className="text-[10px] text-muted-foreground uppercase">Probes</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="font-bold text-lg text-emerald-600">{onlineCount}</div>
                                                    <div className="text-[10px] text-muted-foreground uppercase">Online</div>
                                                </div>
                                                {probeCount > 0 && (
                                                    <div className="flex-1">
                                                        <Progress value={(onlineCount / probeCount) * 100} className="h-1.5" />
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })
                        )}
                    </div>
                </TabsContent>

                {/* ═══════════════════ TAB: TEMPLATES ═══════════════════ */}
                <TabsContent value="templates" className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">{templates.length} templates available</p>
                        <Button size="sm" className="gap-2" onClick={() => setCreateTemplateOpen(true)}>
                            <Plus className="h-4 w-4" /> New Template
                        </Button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {vm.isTemplatesLoading ? (
                            <div className="col-span-3 flex items-center justify-center h-[200px]">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : templates.length === 0 ? (
                            <div className="col-span-3 flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                                <Layers className="h-8 w-8 opacity-30 mb-2" />
                                <p className="text-sm">No templates yet</p>
                            </div>
                        ) : (
                            templates.map(tmpl => (
                                <Card key={tmpl.id} className="relative group">
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                                    <FileText className="h-4 w-4 text-purple-500" />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-sm">{tmpl.name}</div>
                                                    {tmpl.description && (
                                                        <div className="text-xs text-muted-foreground">{tmpl.description}</div>
                                                    )}
                                                </div>
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => {
                                                        // Apply to all managed probes
                                                        vm.applyTemplate(tmpl.id, probes.map(p => p.probe_id))
                                                    }}>
                                                        <Play className="h-4 w-4 mr-2" /> Apply to All
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-destructive"
                                                        onClick={() => vm.deleteTemplate(tmpl.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>

                                        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                                            {tmpl.usage_count !== undefined && (
                                                <span className="flex items-center gap-1">
                                                    <CheckCircle2 className="h-3 w-3" /> {tmpl.usage_count} uses
                                                </span>
                                            )}
                                            {tmpl.created_by && (
                                                <span>by {tmpl.created_by}</span>
                                            )}
                                        </div>

                                        <div className="mt-3 p-2 bg-muted/50 rounded text-[10px] font-mono text-muted-foreground truncate">
                                            {JSON.stringify(tmpl.config)}
                                        </div>

                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="w-full mt-3 gap-2 text-xs"
                                            onClick={() => {
                                                const ids = probes.map(p => p.probe_id)
                                                if (ids.length > 0) vm.applyTemplate(tmpl.id, ids)
                                            }}
                                            disabled={vm.isApplyingTemplate || probes.length === 0}
                                        >
                                            {vm.isApplyingTemplate
                                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                : <Play className="h-3.5 w-3.5" />
                                            }
                                            Apply to All Probes
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </TabsContent>
                {/* Routines Tab */}
                <TabsContent value="routines" className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Select value={vm.routineProbeId} onValueChange={vm.setRoutineProbeId}>
                            <SelectTrigger className="w-[250px]">
                                <SelectValue placeholder="Select a probe" />
                            </SelectTrigger>
                            <SelectContent>
                                {probes.map(p => (
                                    <SelectItem key={p.probe_id} value={p.probe_id}>
                                        {p.probe_id} ({p.location || "Unknown"})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button size="sm" onClick={() => setCreateRoutineOpen(true)} disabled={!vm.routineProbeId}>
                            <Plus className="h-4 w-4 mr-2" /> New Routine
                        </Button>
                    </div>

                    {vm.routineProbeId && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Scheduled Tasks for {vm.routineProbeId}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {vm.isRoutineSchedulesLoading ? (
                                    <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
                                ) : vm.probeSchedulesForRoutine.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No scheduled tasks for this probe.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {vm.probeSchedulesForRoutine.map(schedule => (
                                            <div key={schedule.id} className="flex items-center justify-between p-3 border rounded-lg">
                                                <div>
                                                    <div className="font-medium">{schedule.type}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {schedule.recurring ? (
                                                            <>Recurring {schedule.cron || "@daily"}</>
                                                        ) : schedule.execute_at ? (
                                                            <>One-time at {new Date(schedule.execute_at * 1000).toLocaleString()}</>
                                                        ) : (
                                                            "Unknown schedule"
                                                        )}
                                                    </div>
                                                    {schedule.parameters && Object.keys(schedule.parameters).length > 0 && (
                                                        <pre className="text-[9px] mt-1 bg-black/90 text-green-400 p-1 rounded">
                                            {JSON.stringify(schedule.parameters, null, 2)}
                                        </pre>
                                                    )}
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => vm.deleteSchedule({ probeId: vm.routineProbeId, scheduleId: schedule.id })}
                                                    disabled={vm.isDeletingSchedule}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>

            {/* ── Dialogs ── */}
            <SendCommandDialog
                open={sendCmdOpen}
                onOpenChange={setSendCmdOpen}
                groups={groups}
                probes={probes}
                onSend={vm.sendCommand}
                isSending={vm.isSendingCommand}
            />
            <SmartEnrollmentDialog
                probe={probeToEnroll}
                open={!!probeToEnroll}
                onOpenChange={(isOpen) => !isOpen && setProbeToEnroll(null)}
                availableGroups={groups}
                onEnroll={vm.enrollProbe}
                isEnrolling={vm.isEnrolling}
                getSmartSuggestions={vm.getSmartSuggestions}
            />
            <CreateGroupDialog
                open={createGroupOpen}
                onOpenChange={setCreateGroupOpen}
                onCreate={vm.createGroup}
                isCreating={vm.isCreatingGroup}
            />
            <CreateTemplateDialog
                open={createTemplateOpen}
                onOpenChange={setCreateTemplateOpen}
                onCreate={vm.createTemplate}
                isCreating={vm.isCreatingTemplate}
                groups={groups}
                locationOptions={vm.locationOptions}
            />
            <CreateRoutineDialog
                open={createRoutineOpen}
                onOpenChange={setCreateRoutineOpen}
                probeId={vm.routineProbeId}
                onCreate={vm.createRoutine}
                isCreating={vm.isCreatingRoutine}
            />
        </div>
    )
}