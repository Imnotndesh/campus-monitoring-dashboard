import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from "sonner";
import {
    Card, CardContent, CardHeader, CardTitle, CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
    Plus, MapPin, Clock, Wifi, MoreVertical, Radio, RefreshCw,
    Settings, Trash2, CheckCircle, XCircle, AlertCircle,
    Activity, FileJson, Terminal, Save
} from 'lucide-react';

// --- Types ---
interface Probe {
    probe_id: string;
    location: string;
    building: string;
    floor: string;
    department: string;
    status: string;
    firmware_version: string;
    last_seen: string;
}

interface Command {
    id: number;
    command_type: string;
    status: string;
    issued_at: string;
    executed_at?: string;
    result?: any; // The Deep Scan JSON lives here
}

export default function Probes() {
    const queryClient = useQueryClient();

    // Dialogs & Sheets State
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [managingProbe, setManagingProbe] = useState<Probe | null>(null); // Controls the Side Sheet
    const [filterStatus, setFilterStatus] = useState<string>('all');

    // Forms
    const [addForm, setAddForm] = useState({
        probe_id: '', location: '', building: '', floor: '', department: '', firmware_version: '1.0.0',
    });

    // --- Queries & Mutations ---

    const { data: probes, isLoading } = useQuery<Probe[]>({
        queryKey: ['probes'],
        queryFn: async () => {
            const res = await fetch('/api/v1/probes');
            if (!res.ok) throw new Error('Failed to fetch probes');
            return res.json();
        },
        refetchInterval: 10000,
    });

    const addProbeMutation = useMutation({
        mutationFn: async (data: typeof addForm) => {
            const res = await fetch('/api/v1/probes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error(await res.text());
            return res.json();
        },
        onSuccess: () => {
            toast.success('Probe added');
            setIsAddDialogOpen(false);
            setAddForm({ probe_id: '', location: '', building: '', floor: '', department: '', firmware_version: '1.0.0' });
            queryClient.invalidateQueries({ queryKey: ['probes'] });
        },
        onError: (e) => toast.error(e.message)
    });

    const sendCommandMutation = useMutation({
        mutationFn: async ({ probeId, command, params }: { probeId: string; command: string; params?: any }) => {
            const res = await fetch(`/api/v1/probes/${probeId}/command`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command, payload: params || {} }),
            });
            if (!res.ok) throw new Error(await res.text());
        },
        onSuccess: (_, v) => toast.success(`Command '${v.command}' sent`),
        onError: (e) => toast.error(e.message)
    });

    const deleteProbeMutation = useMutation({
        mutationFn: async (probeId: string) => {
            const res = await fetch(`/api/v1/probes/${probeId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');
        },
        onSuccess: () => {
            toast.success('Probe deleted');
            queryClient.invalidateQueries({ queryKey: ['probes'] });
        },
    });

    // Helper for Status Badge
    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'active': return { color: 'default', icon: <CheckCircle className="h-3 w-3 mr-1" /> };
            case 'pending': return { color: 'secondary', icon: <AlertCircle className="h-3 w-3 mr-1" /> };
            case 'unknown': return { color: 'secondary', icon: <AlertCircle className="h-3 w-3 mr-1" /> };
            default: return { color: 'destructive', icon: <XCircle className="h-3 w-3 mr-1" /> };
        }
    };

    if (isLoading) return <div className="p-10 text-center animate-pulse">Loading fleet data...</div>;

    const filteredProbes = (probes || []).filter(p => filterStatus === 'all' || p.status === filterStatus);

    return (
        <div className="p-6 space-y-6 animate-in fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Probes</h1>
                    <p className="text-muted-foreground">Network sensors and diagnostic units.</p>
                </div>
                <div className="flex gap-2">
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="offline">Offline</SelectItem>
                        </SelectContent>
                    </Select>
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button><Plus className="h-4 w-4 mr-2" /> New Probe</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Register New Probe</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right">Probe ID</Label>
                                    <Input className="col-span-3" value={addForm.probe_id} onChange={e => setAddForm({...addForm, probe_id: e.target.value})} />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right">Location</Label>
                                    <Input className="col-span-3" value={addForm.location} onChange={e => setAddForm({...addForm, location: e.target.value})} />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={() => addProbeMutation.mutate(addForm)}>Register</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Probe Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProbes.map((probe) => {
                    const statusInfo = getStatusInfo(probe.status);
                    return (
                        <Card key={probe.probe_id} className="group hover:border-primary/50 transition-all">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-base font-mono">{probe.probe_id}</CardTitle>
                                        <CardDescription className="text-xs mt-1 flex items-center gap-1">
                                            <Wifi className="h-3 w-3" /> {probe.firmware_version}
                                        </CardDescription>
                                    </div>
                                    <Badge variant={statusInfo.color as any} className="flex items-center">
                                        {statusInfo.icon} {probe.status}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 text-sm text-muted-foreground mb-4">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-primary" />
                                        <span className="truncate">{probe.building} - {probe.location}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4" />
                                        <span>{new Date(probe.last_seen).toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        variant="secondary"
                                        className="w-full"
                                        onClick={() => setManagingProbe(probe)} // Opens the Sheet
                                    >
                                        Manage & Details
                                    </Button>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                                            <DropdownMenuItem onClick={() => sendCommandMutation.mutate({ probeId: probe.probe_id, command: 'deep_scan' })}>
                                                <Radio className="mr-2 h-4 w-4" /> Deep Scan
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => sendCommandMutation.mutate({ probeId: probe.probe_id, command: 'reboot' })}>
                                                <RefreshCw className="mr-2 h-4 w-4" /> Reboot
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-destructive" onClick={() => deleteProbeMutation.mutate(probe.probe_id)}>
                                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* --- The Management Drawer (Sheet) --- */}
            <Sheet open={!!managingProbe} onOpenChange={(open) => !open && setManagingProbe(null)}>
                <SheetContent className="w-[400px] sm:w-[640px] overflow-y-auto">
                    {managingProbe && <ProbeDetails probe={managingProbe} onClose={() => setManagingProbe(null)} />}
                </SheetContent>
            </Sheet>
        </div>
    );
}

// --- Sub-Component: Probe Details & History ---
function ProbeDetails({ probe, onClose }: { probe: Probe, onClose: () => void }) {
    const queryClient = useQueryClient();

    // Fetch History (Including Deep Scan Results)
    const { data: commands } = useQuery<Command[]>({
        queryKey: ['commands', probe.probe_id],
        queryFn: async () => {
            const res = await fetch(`/api/v1/commands/probe/${probe.probe_id}`);
            if (!res.ok) return [];
            return res.json();
        },
        refetchInterval: 5000 // Poll for scan results completion
    });

    // Update Probe Mutation
    const updateMutation = useMutation({
        mutationFn: async (updatedData: any) => {
            const res = await fetch(`/api/v1/probes/${probe.probe_id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData),
            });
            if (!res.ok) throw new Error('Update failed');
        },
        onSuccess: () => {
            toast.success('Probe updated');
            queryClient.invalidateQueries({ queryKey: ['probes'] });
        }
    });

    const [editForm, setEditForm] = useState({
        location: probe.location,
        building: probe.building,
        floor: probe.floor,
        department: probe.department,
        status: probe.status // Maintain status
    });

    return (
        <div className="h-full flex flex-col">
            <SheetHeader className="mb-4">
                <SheetTitle className="flex items-center gap-2 text-xl">
                    <Activity className="h-5 w-5 text-primary" />
                    {probe.probe_id}
                </SheetTitle>
                <SheetDescription>
                    Device Management and Diagnostic History
                </SheetDescription>
            </SheetHeader>

            <Tabs defaultValue="overview" className="flex-1">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">Info & Config</TabsTrigger>
                    <TabsTrigger value="scans">Deep Scans</TabsTrigger>
                    <TabsTrigger value="history">Cmd History</TabsTrigger>
                </TabsList>

                {/* TAB 1: Edit Details & Config */}
                <TabsContent value="overview" className="space-y-4 mt-4">
                    <Card>
                        <CardHeader><CardTitle>Location Details</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            <div className="grid gap-2">
                                <Label>Building</Label>
                                <Input value={editForm.building} onChange={e => setEditForm({...editForm, building: e.target.value})} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Floor</Label>
                                <Input value={editForm.floor} onChange={e => setEditForm({...editForm, floor: e.target.value})} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Location / Room</Label>
                                <Input value={editForm.location} onChange={e => setEditForm({...editForm, location: e.target.value})} />
                            </div>
                            <Button className="w-full mt-2" onClick={() => updateMutation.mutate(editForm)}>
                                <Save className="h-4 w-4 mr-2" /> Save Changes
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 2: Deep Scan Visualizer */}
                <TabsContent value="scans" className="mt-4 h-full">
                    <ScrollArea className="h-[500px] pr-4">
                        <div className="space-y-4">
                            {commands?.filter(c => c.command_type === 'deep_scan').length === 0 && (
                                <div className="text-center text-muted-foreground py-10">No deep scans found. Trigger one from Quick Actions.</div>
                            )}

                            {commands?.filter(c => c.command_type === 'deep_scan').map(cmd => (
                                <Card key={cmd.id} className="border-l-4 border-l-purple-500">
                                    <CardHeader className="py-3">
                                        <div className="flex justify-between">
                                            <CardTitle className="text-sm">Scan Report #{cmd.id}</CardTitle>
                                            <span className="text-xs text-muted-foreground">{new Date(cmd.issued_at).toLocaleString()}</span>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pb-3 text-sm">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Badge variant={cmd.status === 'completed' ? 'default' : 'secondary'}>
                                                {cmd.status}
                                            </Badge>
                                        </div>

                                        {/* Result Visualization */}
                                        {cmd.status === 'completed' && cmd.result ? (
                                            <div className="bg-muted p-3 rounded-md font-mono text-xs overflow-x-auto">
                                                {/* If we have specific fields, show them prettily */}
                                                {cmd.result.networks ? (
                                                    <div className="space-y-1">
                                                        <div className="font-bold mb-1">Networks Found: {Array.isArray(cmd.result.networks) ? cmd.result.networks.length : 'N/A'}</div>
                                                        <pre>{JSON.stringify(cmd.result, null, 2)}</pre>
                                                    </div>
                                                ) : (
                                                    <pre>{JSON.stringify(cmd.result, null, 2)}</pre>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-muted-foreground italic">Waiting for probe result...</p>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </ScrollArea>
                </TabsContent>

                {/* TAB 3: Raw History */}
                <TabsContent value="history" className="mt-4">
                    <ScrollArea className="h-[500px]">
                        <div className="space-y-2">
                            {commands?.map(cmd => (
                                <div key={cmd.id} className="flex items-center justify-between p-3 border rounded-md bg-card">
                                    <div className="flex items-center gap-3">
                                        <Terminal className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <div className="font-medium text-sm">{cmd.command_type}</div>
                                            <div className="text-xs text-muted-foreground">{new Date(cmd.issued_at).toLocaleString()}</div>
                                        </div>
                                    </div>
                                    <Badge variant="outline">{cmd.status}</Badge>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </TabsContent>
            </Tabs>
        </div>
    );
}