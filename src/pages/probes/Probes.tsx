import {
    Plus, Search, Save, MapPin, AlertCircle, UserPlus
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import TopologyGraph from "../../components/TopologyGraph"
import { useHeatmapViewModel } from "@/pages/heatmap/useHeatmapViewModel"
import { useProbesViewModel } from "./useProbesViewModel"
import { ProbeCard, ProbeControls, CommandHistoryList, ConfigDialogs } from "./components"

function ProbeTopologyWidget({ probeId }: { probeId: string }) {
    const { graphData, isLoading } = useHeatmapViewModel();

    return (
        <div className="h-48 w-full border rounded-md overflow-hidden bg-muted/20 relative">
            <TopologyGraph
                graphData={graphData}
                isLoading={isLoading}
                focusedNodeId={probeId}
            />
        </div>
    );
}
export default function Probes() {
    const vm = useProbesViewModel()

    // Handle Config Form Submit
    const handleConfigSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const fd = new FormData(e.target as HTMLFormElement)

        let data: any = {}
        if (vm.configDialogType === 'wifi') {
            data = { ssid: fd.get('ssid'), password: fd.get('password') }
            vm.sendConfigCommand('set_wifi', data)
        } else if (vm.configDialogType === 'mqtt') {
            data = {
                broker: fd.get('broker'),
                port: parseInt(fd.get('port') as string),
                user: fd.get('user'),
                password: fd.get('password')
            }
            vm.sendConfigCommand('set_mqtt', data)
        } else if (vm.configDialogType === 'rename') {
            data = { new_id: fd.get('new_id') }
            vm.sendConfigCommand('rename_probe', data)
        } else if (vm.configDialogType === 'ota') {
            data = { url: fd.get('url') }
            vm.sendConfigCommand('ota_update', data)
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Probe Fleet</h2>
                    <p className="text-muted-foreground">Manage and monitor physical probes</p>
                </div>
                <div className="flex gap-2">
                    <div className="relative w-full md:w-[250px]">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search probes..." className="pl-8" />
                    </div>
                    <Button onClick={() => vm.setIsAddOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Register Probe
                    </Button>
                </div>
            </div>

            {/* Probe Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {vm.probes.map((probe) => (
                    <ProbeCard
                        key={probe.probe_id}
                        probe={probe}
                        onClick={() => {
                            vm.setSelectedProbe(probe)
                            vm.setIsSheetOpen(true)
                            // Clean outputs not needed as VM handles fetching now
                        }}
                        onDelete={() => vm.deleteProbe(probe.probe_id)}
                    />
                ))}
            </div>

            {/* ADD PROBE DIALOG */}
            <Dialog open={vm.isAddOpen} onOpenChange={vm.setIsAddOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Register New Probe</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={(e) => {
                        e.preventDefault()
                        const fd = new FormData(e.currentTarget)
                        vm.addProbe({
                            probe_id: fd.get('probe_id') as string,
                            location: fd.get('location') as string,
                            building: fd.get('building') as string,
                            floor: fd.get('floor') as string
                        })
                    }}>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>Probe ID (Serial)</Label>
                                <Input name="probe_id" placeholder="e.g. PROBE-001" required />
                            </div>
                            <div className="grid gap-2">
                                <Label>Location</Label>
                                <Input name="location" placeholder="e.g. Server Room" required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Building</Label>
                                    <Input name="building" placeholder="Block A" />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Floor</Label>
                                    <Input name="floor" placeholder="2nd Floor" />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit">Register Device</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* PROBE DETAILS SHEET */}
            <Sheet open={vm.isSheetOpen} onOpenChange={vm.setIsSheetOpen}>
                <SheetContent className="w-[400px] sm:w-[540px]">
                    <SheetHeader className="mb-4">
                        <SheetTitle className="flex items-center gap-2">
                            {vm.selectedProbe?.probe_id}
                        </SheetTitle>
                        <SheetDescription>
                            {vm.selectedProbe?.location} • {vm.selectedProbe?.building}
                        </SheetDescription>
                    </SheetHeader>

                    {vm.selectedProbe && (
                        <Tabs defaultValue="management" className="h-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="management">Management</TabsTrigger>
                                <TabsTrigger value="config">Details</TabsTrigger>
                                <TabsTrigger value="history">History</TabsTrigger>
                            </TabsList>

                            {/* TAB: MANAGEMENT */}
                            <TabsContent value="management" className="mt-4">
                                <ScrollArea className="h-[calc(100vh-200px)]">
                                    <ProbeControls
                                        probeId={vm.selectedProbe.probe_id}
                                        ping={() => vm.pingProbe(vm.selectedProbe!.probe_id)}
                                        isPinging={vm.isPinging}
                                        sendCommand={vm.sendCommand}
                                        isSending={vm.isSendingCommand}

                                        // Pass Cached Data from VM
                                        statusOutput={vm.probeStatus}
                                        configOutput={vm.probeConfig}

                                        onConfigDialogOpen={vm.setConfigDialogType}
                                    />
                                </ScrollArea>
                            </TabsContent>

                            {/* TAB: CONFIG/DETAILS */}
                            <TabsContent value="config" className="mt-4 space-y-4">
                                <div className="space-y-4 p-1">
                                    <div className="grid gap-2">
                                        <Label>Assigned Location</Label>
                                        <ProbeTopologyWidget probeId={vm.selectedProbe.probe_id} />
                                        <Label>Change Location</Label>
                                        <div className="relative">
                                            <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                className="pl-9"
                                                defaultValue={vm.selectedProbe.location}
                                                onChange={(e) => vm.setSelectedProbe({...vm.selectedProbe!, location: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label>Building</Label>
                                            <Input
                                                defaultValue={vm.selectedProbe.building}
                                                onChange={(e) => vm.setSelectedProbe({...vm.selectedProbe!, building: e.target.value})}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Floor</Label>
                                            <Input
                                                defaultValue={vm.selectedProbe.floor}
                                                onChange={(e) => vm.setSelectedProbe({...vm.selectedProbe!, floor: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                    <Button className="w-full mt-4" onClick={() => vm.updateProbe(vm.selectedProbe!)}>
                                        <Save className="mr-2 h-4 w-4" /> Save Configuration
                                    </Button>
                                </div>
                            </TabsContent>

                            {/* TAB: HISTORY */}
                            <TabsContent value="history" className="mt-4">
                                <CommandHistoryList history={vm.commandHistory} />
                            </TabsContent>
                        </Tabs>
                    )}
                </SheetContent>
            </Sheet>

            <ConfigDialogs
                probeId={vm.selectedProbe?.probe_id || ''}
                type={vm.configDialogType}
                isOpen={!!vm.configDialogType}
                onClose={() => vm.setConfigDialogType(null)}
                onSubmit={handleConfigSubmit}
                isSubmitting={vm.isSubmittingConfig}
            />
        </div>
    )
}