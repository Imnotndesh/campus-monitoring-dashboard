import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Check, X } from "lucide-react"

type Probe = {
    probe_id: string
    status: "active" | "pending" | "offline"
    location: string
    last_seen: string
    firmware_version: string
}

export default function Probes() {
    const queryClient = useQueryClient()
    const [selectedProbe, setSelectedProbe] = useState<Probe | null>(null)
    const [locationInput, setLocationInput] = useState("")

    // Fetch all probes
    const { data: probes } = useQuery<Probe[]>({
        queryKey: ["probes"],
        queryFn: async () => (await fetch("/api/v1/probes")).json(),
        refetchInterval: 5000,
    })

    // Mutation to "Adopt" (Update) a probe
    const adoptMutation = useMutation({
        mutationFn: async ({ id, location }: { id: string; location: string }) => {
            const res = await fetch(`/api/v1/probes/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status: "active",
                    location: location
                }),
            })
            if (!res.ok) throw new Error("Failed to update probe")
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["probes"] })
            setSelectedProbe(null)
            setLocationInput("")
        },
    })

    const pendingProbes = probes?.filter(p => p.status === "pending") || []
    const activeProbes = probes?.filter(p => p.status !== "pending") || []

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Probe Inventory</h2>
                    <p className="text-zinc-400">Manage and authorize network probes.</p>
                </div>
                {pendingProbes.length > 0 && (
                    <Badge variant="destructive" className="animate-pulse">
                        {pendingProbes.length} Pending Actions
                    </Badge>
                )}
            </div>

            <Tabs defaultValue="active" className="w-full">
                <TabsList className="bg-zinc-900 border border-zinc-800">
                    <TabsTrigger value="active">Active Fleet ({activeProbes.length})</TabsTrigger>
                    <TabsTrigger value="pending" className="data-[state=active]:text-amber-500">
                        Pending Adoption ({pendingProbes.length})
                    </TabsTrigger>
                </TabsList>

                {/* --- Active Probes Tab --- */}
                <TabsContent value="active" className="mt-4">
                    <div className="rounded-md border border-zinc-800 bg-zinc-900/50">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-zinc-800 hover:bg-transparent">
                                    <TableHead>Probe ID</TableHead>
                                    <TableHead>Location</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Last Seen</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {activeProbes.map((probe) => (
                                    <TableRow key={probe.probe_id} className="border-zinc-800">
                                        <TableCell className="font-mono">{probe.probe_id}</TableCell>
                                        <TableCell>{probe.location || "Unknown"}</TableCell>
                                        <TableCell>
                                            <Badge variant={probe.status === 'active' ? 'default' : 'destructive'}>
                                                {probe.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right text-zinc-500">
                                            {new Date(probe.last_seen).toLocaleTimeString()}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                {/* --- Pending Probes Tab --- */}
                <TabsContent value="pending" className="mt-4">
                    <div className="rounded-md border border-zinc-800 bg-zinc-900/50">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-zinc-800 hover:bg-transparent">
                                    <TableHead>Probe ID</TableHead>
                                    <TableHead>First Detected</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pendingProbes.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center text-zinc-500">
                                            No pending probes found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    pendingProbes.map((probe) => (
                                        <TableRow key={probe.probe_id} className="border-zinc-800">
                                            <TableCell className="font-mono text-amber-500">{probe.probe_id}</TableCell>
                                            <TableCell>{new Date(probe.last_seen).toLocaleString()}</TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="border-emerald-900 text-emerald-500 hover:bg-emerald-900/50 hover:text-emerald-400"
                                                    onClick={() => setSelectedProbe(probe)}
                                                >
                                                    <Check className="mr-2 h-4 w-4" /> Adopt
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>
            </Tabs>

            {/* --- Adoption Dialog --- */}
            <Dialog open={!!selectedProbe} onOpenChange={() => setSelectedProbe(null)}>
                <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                    <DialogHeader>
                        <DialogTitle>Adopt Probe {selectedProbe?.probe_id}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid w-full items-center gap-1.5">
                            <Label htmlFor="location">Assign Location</Label>
                            <Input
                                id="location"
                                placeholder="e.g. Science Hall - Room 304"
                                className="bg-zinc-950 border-zinc-800"
                                value={locationInput}
                                onChange={(e) => setLocationInput(e.target.value)}
                            />
                        </div>
                        <p className="text-sm text-zinc-400">
                            This will authorize the probe to send telemetry and mark it as 'Active'.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setSelectedProbe(null)}>Cancel</Button>
                        <Button
                            onClick={() => selectedProbe && adoptMutation.mutate({ id: selectedProbe.probe_id, location: locationInput })}
                            disabled={adoptMutation.isPending}
                        >
                            {adoptMutation.isPending ? "Adopting..." : "Confirm Adoption"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}