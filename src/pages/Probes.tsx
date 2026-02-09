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
    Plus, MapPin, Clock, Wifi, MoreVertical, RefreshCw,
    Settings, Trash2, CheckCircle, XCircle, AlertCircle,
    Activity, Terminal, Save, ShieldAlert
} from 'lucide-react';

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
}

export default function Probes() {
    const queryClient = useQueryClient();
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [managingProbe, setManagingProbe] = useState<Probe | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [addForm, setAddForm] = useState({
        probe_id: '', location: '', building: '', floor: '', department: '', firmware_version: '1.0.0',
    });

    const { data: probes, isLoading } = useQuery<Probe[]>({
        queryKey: ['probes'],
        queryFn: async () => (await fetch('/api/v1/probes')).json(),
        refetchInterval: 5000,
    });

    const addProbeMutation = useMutation({
        mutationFn: async (data: typeof addForm) => {
            const res = await fetch('/api/v1/probes', { method: 'POST', body: JSON.stringify(data) });
            if (!res.ok) throw new Error(await res.text());
        },
        onSuccess: () => {
            toast.success('Probe registered');
            setIsAddDialogOpen(false);
            queryClient.invalidateQueries({ queryKey: ['probes'] });
        },
        onError: (e) => toast.error(e.message)
    });

    const sendCommandMutation = useMutation({
        mutationFn: async ({ probeId, command }: { probeId: string; command: string }) => {
            await fetch(`/api/v1/probes/${probeId}/command`, {
                method: 'POST',
                body: JSON.stringify({ command, payload: {} })
            });
        },
        onSuccess: (_, v) => toast.success(`Command '${v.command}' sent`),
    });

    const deleteProbeMutation = useMutation({
        mutationFn: async (probeId: string) => {
            await fetch(`/api/v1/probes/${probeId}`, { method: 'DELETE' });
        },
        onSuccess: () => {
            toast.success('Probe deleted');
            queryClient.invalidateQueries({ queryKey: ['probes'] });
        },
    });

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'active': return { color: 'default', icon: <CheckCircle className="h-3 w-3 mr-1" /> };
            case 'unknown': return { color: 'destructive', icon: <ShieldAlert className="h-3 w-3 mr-1" /> };
            case 'pending': return { color: 'secondary', icon: <AlertCircle className="h-3 w-3 mr-1" /> };
            default: return { color: 'outline', icon: <XCircle className="h-3 w-3 mr-1" /> };
        }
    };

    if (isLoading) return <div className="p-10 text-center animate-pulse">Loading fleet...</div>;

    const filteredProbes = (probes || []).filter(p => filterStatus === 'all' || p.status === filterStatus);

    return (
        <div className="p-6 space-y-6 animate-in fade-in">
            <div className="flex flex-col md:flex-row justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Probe Management</h1>
                    <p className="text-muted-foreground">Configure fleet devices and view operational status.</p>
                </div>
                <div className="flex gap-2">
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="unknown">Pending Adoption</SelectItem>
                        </SelectContent>
                    </Select>
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Manual Add</Button></DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Register Probe</DialogTitle></DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2"><Label>Probe ID</Label><Input value={addForm.probe_id} onChange={e => setAddForm({...addForm, probe_id: e.target.value})} /></div>
                            </div>
                            <DialogFooter><Button onClick={() => addProbeMutation.mutate(addForm)}>Register</Button></DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProbes.map((probe) => {
                    const statusInfo = getStatusInfo(probe.status);
                    return (
                        <Card key={probe.probe_id} className={`transition-all ${probe.status === 'unknown' ? 'border-amber-500/50 bg-amber-500/5' : ''}`}>
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-base font-mono">{probe.probe_id}</CardTitle>
                                        <CardDescription className="text-xs mt-1 flex items-center gap-1">
                                            <Wifi className="h-3 w-3" /> {probe.firmware_version}
                                        </CardDescription>
                                    </div>
                                    <Badge variant={statusInfo.color as any} className="flex items-center">
                                        {statusInfo.icon} {probe.status === 'unknown' ? 'Unregistered' : probe.status}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 text-sm text-muted-foreground mb-4">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4" />
                                        <span className="truncate">{probe.building || 'Unknown'} - {probe.location || 'Unknown'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4" />
                                        <span>{new Date(probe.last_seen).toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Button variant="secondary" className="w-full" onClick={() => setManagingProbe(probe)}>
                                        {probe.status === 'unknown' ? 'Adopt Probe' : 'Manage'}
                                    </Button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
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

            <Sheet open={!!managingProbe} onOpenChange={(open) => !open && setManagingProbe(null)}>
                <SheetContent className="w-[400px] sm:w-[540px]">
                    {managingProbe && <ProbeManager probe={managingProbe} onClose={() => setManagingProbe(null)} />}
                </SheetContent>
            </Sheet>
        </div>
    );
}

function ProbeManager({ probe, onClose }: { probe: Probe, onClose: () => void }) {
    const queryClient = useQueryClient();
    const [editForm, setEditForm] = useState({
        location: probe.location, building: probe.building, floor: probe.floor, department: probe.department
    });

    const updateMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/v1/probes/${probe.probe_id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...editForm, status: 'active' }), // Auto-activate on save
            });
            if (!res.ok) throw new Error('Update failed');
        },
        onSuccess: () => {
            toast.success('Configuration saved');
            queryClient.invalidateQueries({ queryKey: ['probes'] });
            onClose(); // <-- AUTO CLOSE FIX
        }
    });

    const { data: history } = useQuery<Command[]>({
        queryKey: ['cmd_history', probe.probe_id],
        queryFn: async () => (await fetch(`/api/v1/commands/probe/${probe.probe_id}`)).json()
    });

    return (
        <div className="h-full flex flex-col">
            <SheetHeader className="mb-6">
                <SheetTitle>Manage {probe.probe_id}</SheetTitle>
                <SheetDescription>Update device details and view command logs.</SheetDescription>
            </SheetHeader>

            <Tabs defaultValue="config" className="flex-1">
                <TabsList className="w-full">
                    <TabsTrigger value="config" className="flex-1">Configuration</TabsTrigger>
                    <TabsTrigger value="history" className="flex-1">History</TabsTrigger>
                </TabsList>

                <TabsContent value="config" className="mt-4 space-y-4">
                    <div className="grid gap-4 p-4 border rounded-md bg-muted/20">
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
                    </div>
                    <Button className="w-full" onClick={() => updateMutation.mutate()}>
                        <Save className="mr-2 h-4 w-4" /> Save & Activate
                    </Button>
                </TabsContent>

                <TabsContent value="history" className="mt-4">
                    <ScrollArea className="h-[400px]">
                        <div className="space-y-2">
                            {history?.map(cmd => (
                                <div key={cmd.id} className="flex justify-between p-3 border rounded text-sm">
                                    <div className="flex items-center gap-2">
                                        <Terminal className="h-4 w-4 text-muted-foreground" />
                                        <span>{cmd.command_type}</span>
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