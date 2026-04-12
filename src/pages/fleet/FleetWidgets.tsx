import { useQuery } from "@tanstack/react-query";
import {
    Activity,
    CheckCircle2,
    Loader2,
    Server,
    Users,
    XCircle,
    Zap,
    WifiOff,
    ServerOff,
    Plus,
    Play,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { FleetStatusResponse, FleetProbe, FleetCommand, FleetGroup, FleetCommandRequest } from "./types";
import { useState } from "react";
import { apiFetch } from "../../lib/api";

export function FleetOverviewWidget() {
    const { data: status, isLoading } = useQuery<FleetStatusResponse>({
        queryKey: ["fleet-status-widget"],
        queryFn: async () => await apiFetch("/api/v1/fleet/status"),
        refetchInterval: 15000,
    });

    const onlinePct = status && status.total_managed > 0 ? (status.online / status.total_managed) * 100 : 0;

    if (isLoading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center h-[140px]">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
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
    );
}

export function FleetProbeListWidget({ maxItems = 8 }: { maxItems?: number }) {
    const { data: probes = [], isLoading } = useQuery<FleetProbe[]>({
        queryKey: ["fleet-probes-widget"],
        queryFn: async () => await apiFetch("/api/v1/fleet/probes"),
        refetchInterval: 10000,
    });

    const displayed = probes.slice(0, maxItems);
    const onlineCount = probes.filter((p) => p.mqtt_connected).length;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium">Managed Probes</CardTitle>
                <div className="flex items-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs text-muted-foreground">
                        {onlineCount}/{probes.length}
                    </span>
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
                            {displayed.map((probe) => (
                                <div key={probe.probe_id} className="flex items-center gap-3 px-4 py-2.5">
                                    <span
                                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                            probe.mqtt_connected ? "bg-emerald-500" : "bg-rose-500"
                                        }`}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-mono text-xs font-medium truncate">{probe.probe_id}</div>
                                        {probe.location && (
                                            <div className="text-[10px] text-muted-foreground truncate">{probe.location}</div>
                                        )}
                                    </div>
                                    {probe.wifi_rssi !== undefined && (
                                        <span
                                            className={`text-[10px] font-mono font-medium ${
                                                probe.wifi_rssi > -60
                                                    ? "text-emerald-600"
                                                    : probe.wifi_rssi > -75
                                                        ? "text-yellow-600"
                                                        : "text-rose-600"
                                            }`}
                                        >
                                            {probe.wifi_rssi} dBm
                                        </span>
                                    )}
                                    {probe.groups?.slice(0, 1).map((g) => (
                                        <Badge key={g} variant="secondary" className="text-[9px] h-4 hidden md:flex">
                                            {g}
                                        </Badge>
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
    );
}

export function ActiveRolloutsWidget() {
    const { data: commands = [], isLoading } = useQuery<FleetCommand[]>({
        queryKey: ["fleet-commands-active-widget"],
        queryFn: async () => await apiFetch("/api/v1/fleet/commands?status=in_progress&limit=10"),
        refetchInterval: 5000,
    });

    const statusIcon = (status: string) => {
        if (status === "completed") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
        if (status === "failed") return <XCircle className="h-3.5 w-3.5 text-rose-500" />;
        if (status === "in_progress") return <Activity className="h-3.5 w-3.5 text-primary animate-pulse" />;
        return <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" />;
    };

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
                            {commands.map((cmd) => {
                                const pct = cmd.total_targets > 0 ? (cmd.completed_count / cmd.total_targets) * 100 : 0;
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
                                );
                            })}
                        </div>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
}

export function FleetGroupsWidget() {
    const { data: probes = [] } = useQuery<FleetProbe[]>({
        queryKey: ["fleet-probes-groups-widget"],
        queryFn: async () => await apiFetch("/api/v1/fleet/probes"),
        refetchInterval: 30000,
    });

    const groupMap = new Map<string, { total: number; online: number }>();
    probes.forEach((probe) => {
        probe.groups?.forEach((g) => {
            const curr = groupMap.get(g) ?? { total: 0, online: 0 };
            curr.total++;
            if (probe.mqtt_connected) curr.online++;
            groupMap.set(g, curr);
        });
    });

    const groupEntries = Array.from(groupMap.entries());

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
    );
}

export function OfflineProbesWidget() {
    const { data: probes = [], isLoading } = useQuery<FleetProbe[]>({
        queryKey: ["fleet-probes-offline-widget"],
        queryFn: async () => await apiFetch("/api/v1/fleet/probes"),
        refetchInterval: 15000,
    });

    const offline = probes.filter((p) => !p.mqtt_connected);

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
                            {offline.map((p) => (
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
    );
}

export function UnenrolledCountWidget() {
    const { data: unenrolled, isLoading } = useQuery({
        queryKey: ["fleet-unenrolled-probes"],
        queryFn: async () => await apiFetch("/api/v1/fleet/unenrolled-probes"),
        refetchInterval: 15000,
    });

    const unenrolledCount = Array.isArray(unenrolled) ? unenrolled.length : 0;

    if (isLoading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center h-[140px]">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Adoption</CardTitle>
                <ServerOff className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="text-2xl font-bold">{unenrolledCount}</div>
                <p className="text-xs text-muted-foreground">Probes awaiting fleet enrollment</p>
                <Progress value={unenrolledCount > 0 ? 100 : 0} className="h-1.5 opacity-50" />
            </CardContent>
        </Card>
    );
}

export function UnenrolledListWidget({ onEnrollClick }: { onEnrollClick: (probe: any) => void }) {
    const { data: unenrolled, isLoading } = useQuery({
        queryKey: ["fleet-unenrolled-probes"],
        queryFn: async () => await apiFetch("/api/v1/fleet/unenrolled-probes"),
        refetchInterval: 10000,
    });

    // Ensure unenrolled is an array
    const unenrolledList = Array.isArray(unenrolled) ? unenrolled : [];

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
                ) : unenrolledList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                        <ServerOff className="h-8 w-8 mb-2 opacity-50" />
                        <p className="text-sm">No new probes detected</p>
                    </div>
                ) : (
                    <ScrollArea className="h-[200px] px-4">
                        <div className="space-y-3 pb-4">
                            {unenrolledList.map((probe: any) => (
                                <div
                                    key={probe.probe_id}
                                    className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                                >
                                    <div>
                                        <div className="text-sm font-mono font-medium">{probe.probe_id}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {probe.building || probe.location || "Unknown Location"}
                                        </div>
                                    </div>
                                    <Button size="sm" variant="secondary" onClick={() => onEnrollClick(probe)}>
                                        <Plus className="w-4 h-4 mr-1" /> Enroll
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
}

export function FleetQuickActionsWidget({
                                            groups,
                                            onSend,
                                            isSending,
                                        }: {
    groups: FleetGroup[];
    onSend: (req: FleetCommandRequest) => void;
    isSending: boolean;
}) {
    const [selectedGroup, setSelectedGroup] = useState<string>("");
    const [cmdType, setCmdType] = useState<string>("fleet_status");
    const [payloadVal, setPayloadVal] = useState<string>("");

    const handleExecute = () => {
        if (!selectedGroup) return;
        let payload: Record<string, any> = {};

        if (cmdType === "fleet_ota") payload = { url: payloadVal };
        else if (cmdType === "fleet_deep_scan") payload = { target_ip: payloadVal || "8.8.8.8" };
        else if (cmdType === "fleet_location") payload = { location: payloadVal };
        else if (cmdType === "fleet_maintenance") payload = { window: payloadVal };
        else if (cmdType === "fleet_config") {
            try {
                payload = JSON.parse(payloadVal);
            } catch (e) {
                alert("Invalid JSON format");
                return;
            }
        }

        onSend({
            command_type: cmdType,
            target_all: false,
            groups: [selectedGroup],
            probe_ids: [],
            strategy: "immediate",
            payload: payload,
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-sm font-medium">Quick Group Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label className="text-xs">Target Group</Label>
                    <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a group..." />
                        </SelectTrigger>
                        <SelectContent>
                            {groups.map((g) => (
                                <SelectItem key={g.id} value={g.name}>
                                    {g.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs">Fleet Action</Label>
                    <Select
                        value={cmdType}
                        onValueChange={(val) => {
                            setCmdType(val);
                            setPayloadVal("");
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="fleet_status">Status Check</SelectItem>
                            <SelectItem value="fleet_reboot">Reboot Group</SelectItem>
                            <SelectItem value="fleet_deep_scan">Deep Scan</SelectItem>
                            <SelectItem value="fleet_ota">OTA Update</SelectItem>
                            <SelectItem value="fleet_config">Update Config</SelectItem>
                            <SelectItem value="fleet_location">Set Location</SelectItem>
                            <SelectItem value="fleet_maintenance">Set Maint. Window</SelectItem>
                            <SelectItem value="fleet_factory_reset">Factory Reset</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {["fleet_ota", "fleet_deep_scan", "fleet_location", "fleet_maintenance", "fleet_config"].includes(
                    cmdType
                ) && (
                    <div className="space-y-2 bg-muted/30 p-2 rounded border">
                        <Label className="text-xs text-primary">
                            {cmdType === "fleet_ota"
                                ? "Firmware URL"
                                : cmdType === "fleet_deep_scan"
                                    ? "Target IP (Default: 8.8.8.8)"
                                    : cmdType === "fleet_location"
                                        ? "Location Label"
                                        : cmdType === "fleet_maintenance"
                                            ? "Window (e.g. 02:00-04:00)"
                                            : "JSON Config"}
                        </Label>
                        {cmdType === "fleet_config" ? (
                            <Textarea
                                className="text-xs font-mono h-20"
                                placeholder='{"setting": "value"}'
                                value={payloadVal}
                                onChange={(e) => setPayloadVal(e.target.value)}
                            />
                        ) : (
                            <Input
                                className="h-8 text-xs"
                                value={payloadVal}
                                onChange={(e) => setPayloadVal(e.target.value)}
                            />
                        )}
                    </div>
                )}

                <Button
                    className="w-full gap-2"
                    size="sm"
                    disabled={!selectedGroup || isSending}
                    onClick={handleExecute}
                >
                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    Dispatch to Group
                </Button>
            </CardContent>
        </Card>
    );
}