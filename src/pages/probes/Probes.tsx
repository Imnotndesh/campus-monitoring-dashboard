// Probes.tsx
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
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

import { useProbesViewModel } from "./useProbesViewModel"
import { ProbeCard, ProbeControls, CommandHistoryList, ConfigDialogs } from "./components"

function UnknownProbeCard({ probe, onAdopt }: { probe: any, onAdopt: () => void }) {
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

export default function Probes() {
    const vm = useProbesViewModel()

    const adoptedProbes = vm.probes.filter(p => p.location && p.location !== 'Unknown')
    const unknownProbes = vm.probes.filter(p => !p.location || p.location === 'Unknown')

    const handleConfigSubmit = (data: any) => {
        if (!vm.configDialogType) return

        const commandMap = {
            'wifi': 'set_wifi',
            'mqtt': 'set_mqtt',
            'rename': 'rename_probe',
            'ota': 'ota_update'
        } as const

        vm.sendConfigCommand(commandMap[vm.configDialogType], data)
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
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
                </div>
            </div>

            {unknownProbes.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                        <h3 className="text-lg font-semibold">Unknown Probes - Requires Configuration</h3>
                        <Badge variant="secondary">{unknownProbes.length}</Badge>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {unknownProbes.map((probe) => (
                            <UnknownProbeCard
                                key={probe.probe_id}
                                probe={probe}
                                onAdopt={() => {
                                    vm.setSelectedProbe(probe)
                                    vm.setIsAdoptOpen(true)
                                }}
                            />
                        ))}
                    </div>
                </div>
            )}

            {adoptedProbes.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-lg font-semibold">Active Probes</h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {adoptedProbes.map((probe) => (
                            <ProbeCard
                                key={probe.probe_id}
                                probe={probe}
                                onClick={() => {
                                    vm.setSelectedProbe(probe)
                                    vm.setIsSheetOpen(true)
                                    vm.setStatusOutput(null)
                                }}
                                onDelete={() => vm.deleteProbe(probe.probe_id)}
                            />
                        ))}
                    </div>
                </div>
            )}

            <Dialog open={vm.isAdoptOpen} onOpenChange={vm.setIsAdoptOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Adopt Probe: {vm.selectedProbe?.probe_id}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={(e) => {
                        e.preventDefault()
                        const fd = new FormData(e.currentTarget)
                        vm.updateProbe({
                            probe_id: vm.selectedProbe!.probe_id,
                            location: fd.get('location') as string,
                            building: fd.get('building') as string,
                            floor: fd.get('floor') as string
                        })
                        vm.setIsAdoptOpen(false)
                    }}>
                        <div className="grid gap-4 py-4">
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
                            <Button type="submit">Adopt Probe</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

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
                                <TabsTrigger value="config">Config</TabsTrigger>
                                <TabsTrigger value="history">History</TabsTrigger>
                            </TabsList>

                            <TabsContent value="management" className="mt-4">
                                <ScrollArea className="h-[calc(100vh-200px)]">
                                    <ProbeControls
                                        probeId={vm.selectedProbe.probe_id}
                                        ping={() => vm.pingProbe(vm.selectedProbe!.probe_id)}
                                        isPinging={vm.isPinging}
                                        sendCommand={vm.sendCommand}
                                        isSending={vm.isSendingCommand}
                                        statusOutput={vm.statusOutput}
                                        onConfigDialogOpen={(type) => vm.setConfigDialogType(type)}
                                    />
                                </ScrollArea>
                            </TabsContent>

                            <TabsContent value="config" className="mt-4 space-y-4">
                                <div className="space-y-4 p-1">
                                    <div className="grid gap-2">
                                        <Label>Assigned Location</Label>
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