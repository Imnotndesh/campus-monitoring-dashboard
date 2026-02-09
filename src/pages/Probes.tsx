import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from "sonner"; // Using the toaster we installed earlier
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Plus,
    MapPin,
    Clock,
    Wifi,
    Download,
    MoreVertical,
    Radio,
    RefreshCw,
    Settings,
    Trash2,
    CheckCircle,
    XCircle,
    AlertCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface Probe {
    probe_id: string;
    location: string;
    building: string;
    floor: string;
    department: string;
    status: string;
    firmware_version: string;
    last_seen: string;
    created_at: string;
    updated_at: string;
}

export default function Probes() {
    const queryClient = useQueryClient();
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isAdoptDialogOpen, setIsAdoptDialogOpen] = useState(false);
    const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
    const [selectedProbe, setSelectedProbe] = useState<Probe | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>('all');

    // Form states
    const [addForm, setAddForm] = useState({
        probe_id: '',
        location: '',
        building: '',
        floor: '',
        department: '',
        firmware_version: '1.0.0',
    });

    const [adoptForm, setAdoptForm] = useState({
        location: '',
        building: '',
        floor: '',
        department: '',
    });

    const [configForm, setConfigForm] = useState({
        report_interval: 30,
        mqtt_server: '',
        mqtt_port: 1883,
    });

    // 1. Fetch probes (Using fetch)
    const { data: probes, isLoading } = useQuery({
        queryKey: ['probes'],
        queryFn: async () => {
            const res = await fetch('/api/v1/probes');
            if (!res.ok) throw new Error('Failed to fetch probes');
            return res.json();
        },
        refetchInterval: 30000,
    });

    // 2. Add probe mutation (Using fetch)
    const addProbeMutation = useMutation({
        mutationFn: async (data: typeof addForm) => {
            const res = await fetch('/api/v1/probes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || 'Failed to add probe');
            }
            return res.json();
        },
        onSuccess: () => {
            toast.success('Probe added successfully');
            setIsAddDialogOpen(false);
            setAddForm({
                probe_id: '',
                location: '',
                building: '',
                floor: '',
                department: '',
                firmware_version: '1.0.0',
            });
            queryClient.invalidateQueries({ queryKey: ['probes'] });
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    // 3. Adopt probe mutation (Using fetch & PUT to match backend)
    const adoptProbeMutation = useMutation({
        mutationFn: async ({ probeId, data }: { probeId: string; data: typeof adoptForm }) => {
            // We use PUT /api/v1/probes/:id to update details + status
            const payload = {
                ...data,
                status: 'active'
            };

            const res = await fetch(`/api/v1/probes/${probeId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || 'Failed to adopt probe');
            }
            return res.json();
        },
        onSuccess: () => {
            toast.success('Probe adopted successfully');
            setIsAdoptDialogOpen(false);
            setSelectedProbe(null);
            queryClient.invalidateQueries({ queryKey: ['probes'] });
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    // 4. Send command mutation (Using fetch)
    const sendCommandMutation = useMutation({
        mutationFn: async ({ probeId, command, params }: { probeId: string; command: string; params?: any }) => {
            const res = await fetch(`/api/v1/probes/${probeId}/command`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    command,
                    payload: params || {},
                }),
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || 'Failed to send command');
            }
            return res.json();
        },
        onSuccess: (_, variables) => {
            toast.success(`Command "${variables.command}" sent`);
        },
        onError: (error: Error, variables) => {
            toast.error(`Failed to send command: ${error.message}`);
        },
    });

    // 5. Delete probe mutation (Using fetch)
    const deleteProbeMutation = useMutation({
        mutationFn: async (probeId: string) => {
            const res = await fetch(`/api/v1/probes/${probeId}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete probe');
        },
        onSuccess: () => {
            toast.success('Probe deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['probes'] });
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'default'; // Shadcn default is black/white
            case 'unknown': return 'secondary'; // Grey/Yellowish
            case 'pending': return 'secondary';
            case 'inactive': return 'destructive';
            case 'offline': return 'destructive';
            default: return 'outline';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'active': return <CheckCircle className="h-4 w-4" />;
            case 'unknown':
            case 'pending': return <AlertCircle className="h-4 w-4" />;
            case 'inactive':
            case 'offline': return <XCircle className="h-4 w-4" />;
            default: return null;
        }
    };

    const handleAddProbe = () => {
        addProbeMutation.mutate(addForm);
    };

    const handleAdoptProbe = () => {
        if (selectedProbe) {
            adoptProbeMutation.mutate({
                probeId: selectedProbe.probe_id,
                data: adoptForm,
            });
        }
    };

    const handleSendCommand = (probeId: string, command: string, params?: any) => {
        sendCommandMutation.mutate({ probeId, command, params });
    };

    const handleDeleteProbe = (probeId: string) => {
        if (confirm(`Are you sure you want to delete probe ${probeId}?`)) {
            deleteProbeMutation.mutate(probeId);
        }
    };

    const openAdoptDialog = (probe: Probe) => {
        setSelectedProbe(probe);
        setAdoptForm({
            location: probe.location === 'Unknown' ? '' : probe.location,
            building: probe.building === 'Unknown' ? '' : probe.building,
            floor: probe.floor === 'Unknown' ? '' : probe.floor,
            department: probe.department === 'Unknown' ? '' : probe.department,
        });
        setIsAdoptDialogOpen(true);
    };

    const openConfigDialog = (probe: Probe) => {
        setSelectedProbe(probe);
        setConfigForm({
            report_interval: 30,
            mqtt_server: '',
            mqtt_port: 1883,
        });
        setIsConfigDialogOpen(true);
    };

    const handleSendConfig = () => {
        if (selectedProbe) {
            handleSendCommand(selectedProbe.probe_id, 'config_update', configForm);
            setIsConfigDialogOpen(false);
        }
    };

    // --- Helpers for Date display without date-fns ---
    const formatLastSeen = (dateString: string) => {
        if (!dateString) return "Never";
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    if (isLoading) {
        return (
            <div className="p-6">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-pulse text-muted-foreground">Loading probes...</div>
                </div>
            </div>
        );
    }

    const probesData: Probe[] = probes || [];
    const filteredProbes = filterStatus === 'all'
        ? probesData
        : probesData.filter((p) => p.status === filterStatus);
    const activeCount = probesData.filter((p) => p.status === 'active').length;
    const unknownCount = probesData.filter((p) => p.status === 'unknown' || p.status === 'pending').length;

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Probes</h1>
                    <p className="text-muted-foreground">
                        Manage and monitor network probes ({activeCount} active, {unknownCount} pending)
                    </p>
                </div>
                <div className="flex gap-2">
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Probes</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="unknown">Pending</SelectItem>
                            <SelectItem value="offline">Offline</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Probe
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Probe</DialogTitle>
                                <DialogDescription>
                                    Register a new network monitoring probe in the system.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="probe_id">Probe ID *</Label>
                                    <Input
                                        id="probe_id"
                                        placeholder="PROBE-SEC-05"
                                        value={addForm.probe_id}
                                        onChange={(e) => setAddForm({ ...addForm, probe_id: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="building">Building *</Label>
                                    <Input
                                        id="building"
                                        placeholder="Science Building"
                                        value={addForm.building}
                                        onChange={(e) => setAddForm({ ...addForm, building: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="floor">Floor *</Label>
                                    <Input
                                        id="floor"
                                        placeholder="3rd Floor"
                                        value={addForm.floor}
                                        onChange={(e) => setAddForm({ ...addForm, floor: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="location">Location *</Label>
                                    <Input
                                        id="location"
                                        placeholder="Room 305"
                                        value={addForm.location}
                                        onChange={(e) => setAddForm({ ...addForm, location: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="department">Department</Label>
                                    <Input
                                        id="department"
                                        placeholder="Computer Science"
                                        value={addForm.department}
                                        onChange={(e) => setAddForm({ ...addForm, department: e.target.value })}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleAddProbe} disabled={addProbeMutation.isPending}>
                                    {addProbeMutation.isPending ? 'Adding...' : 'Add Probe'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Probes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProbes.map((probe) => (
                    <Card key={probe.probe_id} className="hover:shadow-lg transition-shadow bg-card">
                        <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        {probe.probe_id}
                                        {(probe.status === 'unknown' || probe.status === 'pending') && (
                                            <Badge variant="secondary" className="text-xs text-amber-500">
                                                Pending
                                            </Badge>
                                        )}
                                    </CardTitle>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant={getStatusColor(probe.status)} className="flex items-center gap-1">
                                        {getStatusIcon(probe.status)}
                                        {probe.status}
                                    </Badge>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            {(probe.status === 'unknown' || probe.status === 'pending') && (
                                                <DropdownMenuItem onClick={() => openAdoptDialog(probe)}>
                                                    <CheckCircle className="mr-2 h-4 w-4" />
                                                    Adopt Probe
                                                </DropdownMenuItem>
                                            )}
                                            {probe.status === 'active' && (
                                                <>
                                                    <DropdownMenuItem onClick={() => handleSendCommand(probe.probe_id, 'deep_scan', { duration: 2 })}>
                                                        <Radio className="mr-2 h-4 w-4" />
                                                        Deep Scan
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => openConfigDialog(probe)}>
                                                        <Settings className="mr-2 h-4 w-4" />
                                                        Update Config
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => handleSendCommand(probe.probe_id, 'restart')}>
                                                        <RefreshCw className="mr-2 h-4 w-4" />
                                                        Restart
                                                    </DropdownMenuItem>
                                                </>
                                            )}
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={() => handleDeleteProbe(probe.probe_id)}
                                                className="text-destructive"
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <MapPin className="h-4 w-4 flex-shrink-0" />
                                    <span className="truncate">
                                        {probe.building || '?'} - {probe.floor || '?'} - {probe.location || '?'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Wifi className="h-4 w-4 flex-shrink-0" />
                                    <span>v{probe.firmware_version}</span>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Clock className="h-4 w-4 flex-shrink-0" />
                                    <span className="truncate">
                                        {formatLastSeen(probe.last_seen)}
                                    </span>
                                </div>
                            </div>
                            {/* NOTE: We keep this Link, assuming you will build a specific Details page later */}
                            <Link to={`/probes/${probe.probe_id}`} className="block">
                                <Button className="w-full" variant="outline" size="sm">
                                    View Details
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {filteredProbes.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">No probes found</p>
                </div>
            )}

            {/* Adopt Probe Dialog */}
            <Dialog open={isAdoptDialogOpen} onOpenChange={setIsAdoptDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Adopt Probe: {selectedProbe?.probe_id}</DialogTitle>
                        <DialogDescription>
                            Provide location details to adopt this probe into the monitoring system.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="adopt_building">Building *</Label>
                            <Input
                                id="adopt_building"
                                placeholder="Science Building"
                                value={adoptForm.building}
                                onChange={(e) => setAdoptForm({ ...adoptForm, building: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="adopt_floor">Floor *</Label>
                            <Input
                                id="adopt_floor"
                                placeholder="3rd Floor"
                                value={adoptForm.floor}
                                onChange={(e) => setAdoptForm({ ...adoptForm, floor: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="adopt_location">Location *</Label>
                            <Input
                                id="adopt_location"
                                placeholder="Room 305"
                                value={adoptForm.location}
                                onChange={(e) => setAdoptForm({ ...adoptForm, location: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="adopt_department">Department</Label>
                            <Input
                                id="adopt_department"
                                placeholder="Computer Science"
                                value={adoptForm.department}
                                onChange={(e) => setAdoptForm({ ...adoptForm, department: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAdoptDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAdoptProbe} disabled={adoptProbeMutation.isPending}>
                            {adoptProbeMutation.isPending ? 'Adopting...' : 'Adopt Probe'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Config Update Dialog */}
            <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Update Configuration: {selectedProbe?.probe_id}</DialogTitle>
                        <DialogDescription>
                            Update the probe's operational parameters.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="report_interval">Report Interval (seconds)</Label>
                            <Input
                                id="report_interval"
                                type="number"
                                placeholder="30"
                                value={configForm.report_interval}
                                onChange={(e) => setConfigForm({ ...configForm, report_interval: parseInt(e.target.value) })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="mqtt_server">MQTT Server (optional)</Label>
                            <Input
                                id="mqtt_server"
                                placeholder="192.168.1.100"
                                value={configForm.mqtt_server}
                                onChange={(e) => setConfigForm({ ...configForm, mqtt_server: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="mqtt_port">MQTT Port</Label>
                            <Input
                                id="mqtt_port"
                                type="number"
                                placeholder="1883"
                                value={configForm.mqtt_port}
                                onChange={(e) => setConfigForm({ ...configForm, mqtt_port: parseInt(e.target.value) })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsConfigDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSendConfig} disabled={sendCommandMutation.isPending}>
                            {sendCommandMutation.isPending ? 'Sending...' : 'Update Config'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}