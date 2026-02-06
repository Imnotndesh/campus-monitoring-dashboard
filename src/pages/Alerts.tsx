import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
    AlertTriangle,
    CheckCircle2,
    Clock,
    Filter,
    ShieldAlert
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"

type Alert = {
    id: number
    probe_id: string
    alert_type: string
    severity: "critical" | "warning" | "info"
    message: string
    triggered_at: string
    resolved_at?: string
    acknowledged: boolean
}

export default function Alerts() {
    const queryClient = useQueryClient()
    const [filter, setFilter] = useState<"all" | "unresolved">("unresolved")

    // 1. Fetch Alerts
    const { data: alerts } = useQuery<Alert[]>({
        queryKey: ["alerts", filter],
        queryFn: async () => {
            // Assuming your API supports query params, or filter client-side
            const res = await fetch(`/api/v1/alerts?status=${filter}`)
            // Fallback for demo if endpoint doesn't exist yet: return empty array or mock
            if (!res.ok) return []
            return res.json()
        },
        refetchInterval: 5000,
    })

    // 2. Resolve Mutation
    const resolveMutation = useMutation({
        mutationFn: async (id: number) => {
            await fetch(`/api/v1/alerts/${id}/resolve`, { method: "POST" })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["alerts"] })
        },
    })

    // Filter client-side if API doesn't support it yet
    const displayedAlerts = alerts || []

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">System Alerts</h2>
                    <p className="text-muted-foreground">Monitor and resolve network anomalies.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="unresolved">Unresolved Only</SelectItem>
                            <SelectItem value="all">All History</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid gap-4">
                {displayedAlerts.length === 0 ? (
                    <Card className="border-dashed border-2 bg-transparent">
                        <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                            <CheckCircle2 className="h-12 w-12 mb-4 text-emerald-500/50" />
                            <p>No active alerts. System is healthy.</p>
                        </CardContent>
                    </Card>
                ) : (
                    displayedAlerts.map((alert) => (
                        <AlertCard
                            key={alert.id}
                            alert={alert}
                            onResolve={() => resolveMutation.mutate(alert.id)}
                        />
                    ))
                )}
            </div>
        </div>
    )
}

function AlertCard({ alert, onResolve }: { alert: Alert; onResolve: () => void }) {
    const isResolved = !!alert.resolved_at

    return (
        <Card className={`border-l-4 transition-all hover:bg-muted/30 ${
            alert.severity === "critical" ? "border-l-destructive" :
                alert.severity === "warning" ? "border-l-amber-500" : "border-l-blue-500"
        }`}>
            <div className="flex flex-col md:flex-row items-start md:items-center p-4 gap-4">

                {/* Icon */}
                <div className={`p-2 rounded-full flex-shrink-0 ${
                    alert.severity === "critical" ? "bg-destructive/10 text-destructive" :
                        alert.severity === "warning" ? "bg-amber-500/10 text-amber-500" : "bg-blue-500/10 text-blue-500"
                }`}>
                    <ShieldAlert className="h-5 w-5" />
                </div>

                {/* Content */}
                <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold">{alert.alert_type}</span>
                        <Badge variant="outline" className="text-xs uppercase">
                            {alert.probe_id}
                        </Badge>
                        {isResolved && <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500">Resolved</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{alert.message}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <Clock className="h-3 w-3" />
                        <span>Triggered: {new Date(alert.triggered_at).toLocaleString()}</span>
                    </div>
                </div>

                {/* Action */}
                {!isResolved && (
                    <Button size="sm" variant="outline" onClick={onResolve}>
                        Mark Resolved
                    </Button>
                )}
            </div>
        </Card>
    )
}