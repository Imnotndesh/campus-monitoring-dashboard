import {useEffect, useState} from "react"
import {
    Activity, CheckCircle2, ChevronRight,
    Clock, Layers, Loader2, MoreHorizontal, Play,
    Plus, RefreshCw, Send, Server,
    Tag, Terminal, Trash2, Users, XCircle, Zap,
    Radio, RotateCcw, Download, FileText, MapPin, X
} from "lucide-react"

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
import type {BaseProbe, FleetCommandRequest, FleetProbe} from "./types"
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

// ─── Send Command Dialog ──────────────────────────────────────────────────────

function SendCommandDialog({
                               open, onOpenChange, groups, probes, onSend, isSending
                           }: {
    open: boolean
    onOpenChange: (v: boolean) => void
    groups: ReturnType<typeof useFleetViewModel>["groups"] | null | undefined
    probes: FleetProbe[]
    onSend: (req: FleetCommandRequest) => void
    isSending: boolean
}) {
    const [cmdType, setCmdType] = useState("fleet_status")
    const [targetType, setTargetType] = useState<"all" | "groups" | "probes">("all")
    const [selectedGroups, setSelectedGroups] = useState<string[]>([])
    const [selectedProbes, setSelectedProbes] = useState<string[]>([])
    const [strategy, setStrategy] = useState("immediate")
    const [payloadJson, setPayloadJson] = useState("{}")
    const [payloadError, setPayloadError] = useState("")

    const toggleGroup = (g: string) =>
        setSelectedGroups(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])

    const toggleProbe = (p: string) =>
        setSelectedProbes(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])

    const handleSend = () => {
        let payload: Record<string, any> = {}
        try {
            payload = JSON.parse(payloadJson)
            setPayloadError("")
        } catch {
            setPayloadError("Invalid JSON payload")
            return
        }

        const req: FleetCommandRequest = {
            command_type: cmdType,
            payload,
            strategy: strategy as any,
            target_all: targetType === "all",
            groups: targetType === "groups" ? selectedGroups : [],
            probe_ids: targetType === "probes" ? selectedProbes : [],
        }
        onSend(req)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Terminal className="h-4 w-4" /> Send Fleet Command
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Command Type */}
                    <div className="space-y-1.5">
                        <Label>Command Type</Label>
                        <Select value={cmdType} onValueChange={setCmdType}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {[
                                    { v: "fleet_status",       l: "Status Report" },
                                    { v: "fleet_deep_scan",    l: "Deep Scan" },
                                    { v: "fleet_reboot",       l: "Reboot" },
                                    { v: "fleet_ota",          l: "OTA Update" },
                                    { v: "fleet_config",       l: "Push Config" },
                                    { v: "fleet_factory_reset",l: "Factory Reset" },
                                    { v: "fleet_maintenance",  l: "Set Maintenance Window" },
                                    { v: "fleet_groups",       l: "Update Groups" },
                                    { v: "fleet_tags",         l: "Set Tags" },
                                ].map(({ v, l }) => (
                                    <SelectItem key={v} value={v}>{l}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Target */}
                    <div className="space-y-2">
                        <Label>Target</Label>
                        <div className="flex gap-2">
                            {(["all", "groups", "probes"] as const).map(t => (
                                <Button
                                    key={t}
                                    size="sm"
                                    variant={targetType === t ? "default" : "outline"}
                                    onClick={() => setTargetType(t)}
                                    className="capitalize"
                                >
                                    {t === "all" ? "All Probes" : t}
                                </Button>
                            ))}
                        </div>

                        {targetType === "groups" && (
                            <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/20">
                                {(groups ?? []).map(g => (
                                    <Badge
                                        key={g.id}
                                        variant={selectedGroups.includes(g.name) ? "default" : "outline"}
                                        className="cursor-pointer"
                                        onClick={() => toggleGroup(g.name)}
                                    >
                                        {g.name}
                                    </Badge>
                                ))}
                            </div>
                        )}

                        {targetType === "probes" && (
                            <ScrollArea className="h-[120px] border rounded-lg p-2">
                                {probes.map(p => (
                                    <div
                                        key={p.probe_id}
                                        className={`flex items-center gap-2 p-2 rounded cursor-pointer text-sm ${
                                            selectedProbes.includes(p.probe_id) ? "bg-primary/10" : "hover:bg-muted"
                                        }`}
                                        onClick={() => toggleProbe(p.probe_id)}
                                    >
                                        <StatusDot online={!!p.mqtt_connected} />
                                        <span className="font-mono text-xs">{p.probe_id}</span>
                                        <span className="text-muted-foreground text-xs">{p.location}</span>
                                    </div>
                                ))}
                            </ScrollArea>
                        )}
                    </div>

                    {/* Strategy */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>Rollout Strategy</Label>
                            <Select value={strategy} onValueChange={setStrategy}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="immediate">Immediate</SelectItem>
                                    <SelectItem value="canary">Canary</SelectItem>
                                    <SelectItem value="staggered">Staggered</SelectItem>
                                    <SelectItem value="maintenance">Maintenance Window</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Payload */}
                    <div className="space-y-1.5">
                        <Label>Payload (JSON)</Label>
                        <Textarea
                            value={payloadJson}
                            onChange={e => { setPayloadJson(e.target.value); setPayloadError("") }}
                            className="font-mono text-xs h-[80px] resize-none"
                            placeholder="{}"
                        />
                        {payloadError && <p className="text-xs text-destructive">{payloadError}</p>}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSend} disabled={isSending} className="gap-2">
                        {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Dispatch Command
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

// ─── Create Template Dialog ───────────────────────────────────────────────────

function CreateTemplateDialog({
                                  open, onOpenChange, onCreate, isCreating
                              }: {
    open: boolean
    onOpenChange: (v: boolean) => void
    onCreate: (t: any) => void
    isCreating: boolean
}) {
    const [name, setName] = useState("")
    const [desc, setDesc] = useState("")
    const [configJson, setConfigJson] = useState('{\n  "report_interval": 60\n}')
    const [jsonError, setJsonError] = useState("")

    const handleCreate = () => {
        try {
            const config = JSON.parse(configJson)
            setJsonError("")
            onCreate({ name, description: desc, config })
            onOpenChange(false)
        } catch {
            setJsonError("Invalid JSON")
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-4 w-4" /> Create Config Template
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-2">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label>Template Name</Label>
                            <Input placeholder="e.g. default-campus" value={name} onChange={e => setName(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Description</Label>
                            <Input placeholder="Optional" value={desc} onChange={e => setDesc(e.target.value)} />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label>Config (JSON) — Use <code className="text-xs bg-muted px-1 rounded">${"{probe_id}"}</code> for variables</Label>
                        <Textarea
                            value={configJson}
                            onChange={e => { setConfigJson(e.target.value); setJsonError("") }}
                            className="font-mono text-xs h-[160px] resize-none"
                        />
                        {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleCreate} disabled={!name || isCreating}>
                        {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
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
                                <div className="grid grid-cols-2 gap-3">
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
                                    <div className="p-3 bg-muted/40 rounded-lg border">
                                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">WiFi RSSI</div>
                                        <div className={`font-mono text-sm ${
                                            (liveStatus.wifi_rssi || -100) > -60 ? "text-emerald-500" :
                                                (liveStatus.wifi_rssi || -100) > -75 ? "text-yellow-500" : "text-rose-500"
                                        }`}>
                                            {liveStatus.wifi_rssi ? `${liveStatus.wifi_rssi} dBm` : "--"}
                                        </div>
                                    </div>
                                    <div className="p-3 bg-muted/40 rounded-lg border">
                                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">IP Address</div>
                                        <div className="font-mono text-sm">
                                            {liveStatus.ip_address || "--"}
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
                                <div className="font-mono text-right">{probe?.current_firmware ?? "latest"}</div>

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
                                   availableGroups = []
                               }: {
    probe: any | null,
    open: boolean,
    onOpenChange: (open: boolean) => void,
    availableGroups: any[]
}) {
    const vm = useFleetViewModel()
    const [selectedGroups, setSelectedGroups] = useState<string[]>([])
    const [tags, setTags] = useState<Record<string, string>>({})

    // State for manual inputs
    const [tagKey, setTagKey] = useState("")
    const [tagVal, setTagVal] = useState("")

    useEffect(() => {
        if (probe && open) {
            const suggestions = vm.getSmartSuggestions(probe.building || probe.location)
            setSelectedGroups(suggestions.groups || [])
            setTags(suggestions.tags || {})
            setTagKey("")
            setTagVal("")
        }
    }, [probe?.probe_id, open])

    const handleEnroll = () => {
        if (!probe) return
        vm.enrollMutation.mutate({
            probeId: probe.probe_id,
            req: {
                groups: selectedGroups,
                tags: tags,
                location: probe.location,
            }
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
                    <Button onClick={handleEnroll} disabled={vm.enrollMutation.isPending}>
                        {vm.enrollMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Confirm Enrollment
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
                    <Button variant="outline" size="sm" className="gap-2">
                        <RefreshCw className="h-4 w-4" /> Refresh
                    </Button>
                    <Button size="sm" className="gap-2" onClick={() => setSendCmdOpen(true)}>
                        <Send className="h-4 w-4" /> Send Command
                    </Button>
                </div>
            </div>

            {/* ── KPI Row ── */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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
                <KpiCard
                    title="Active Rollouts"
                    value={vm.fleetStatus?.active_rollouts ?? "--"}
                    desc={vm.fleetStatus?.last_command ? `Last: ${vm.fleetStatus.last_command}` : "No recent commands"}
                    icon={<Zap className="h-4 w-4 text-amber-500" />}
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
                        <Card className={vm.selectedCommandId ? "lg:col-span-4" : "lg:col-span-7"}>
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
                                    <ScrollArea className="h-[480px]">
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
                                                            <CommandStatusBadge status={cmd.status} />
                                                        </div>
                                                        <div className="text-xs text-muted-foreground mt-0.5">
                                                            {new Date(cmd.issued_at).toLocaleString()} · {cmd.total_targets} targets
                                                            {cmd.issued_by && ` · by ${cmd.issued_by}`}
                                                        </div>
                                                    </div>

                                                    {/* Mini progress */}
                                                    {cmd.total_targets > 0 && (
                                                        <div className="w-24 hidden md:block">
                                                            <Progress
                                                                value={(cmd.completed_count / cmd.total_targets) * 100}
                                                                className="h-1.5"
                                                            />
                                                            <div className="text-[10px] text-muted-foreground text-right mt-0.5">
                                                                {cmd.completed_count}/{cmd.total_targets}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {(cmd.status === "pending" || cmd.status === "in_progress") && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive"
                                                            onClick={e => { e.stopPropagation(); vm.cancelCommand(cmd.id) }}
                                                        >
                                                            <XCircle className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                )}
                            </CardContent>
                        </Card>

                        {/* Rollout Status Panel */}
                        {vm.selectedCommandId && (
                            <Card className="lg:col-span-3 flex flex-col overflow-hidden border-t-4 border-t-primary/30">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm flex items-center justify-between">
                                        Rollout Status
                                        <Button
                                            variant="ghost" size="icon" className="h-6 w-6"
                                            onClick={() => vm.setSelectedCommandId(null)}
                                        >
                                            <XCircle className="h-3.5 w-3.5" />
                                        </Button>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex-1">
                                    {vm.commandStatus ? (
                                        <div className="space-y-5">
                                            <RolloutProgressBar status={vm.commandStatus} />
                                            <Separator />
                                            <div className="space-y-2 text-xs">
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Started</span>
                                                    <span>{new Date(vm.commandStatus.timeline.started_at).toLocaleTimeString()}</span>
                                                </div>
                                                {vm.commandStatus.timeline.completed_at && (
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Completed</span>
                                                        <span>{new Date(vm.commandStatus.timeline.completed_at).toLocaleTimeString()}</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Command ID</span>
                                                    <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">
                                                        {vm.selectedCommandId}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center h-[200px]">
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
            />
        </div>
    )
}