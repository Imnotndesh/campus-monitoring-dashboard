import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAlertsViewModel } from "./useAlertsViewModel";
import { Bell, Loader2, PlayCircle } from "lucide-react";
import {Tabs, TabsList, TabsTrigger} from "../../components/ui/tabs.tsx";

export default function AlertsPage() {
    const { alerts, connectionStatus, filter, setFilter, acknowledge } = useAlertsViewModel();
    const getSeverityColor = (s: string) => {
        if (s === "CRITICAL") return "bg-red-500/10 text-red-500 border-red-500/50";
        if (s === "WARNING") return "bg-amber-500/10 text-amber-500 border-amber-500/50";
        return "bg-blue-500/10 text-blue-500 border-blue-500/50";
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">System Alerts</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <div className={`h-2 w-2 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                        <span className="text-xs text-muted-foreground uppercase font-medium">{connectionStatus}</span>
                    </div>
                </div>

                <Tabs value={filter} onValueChange={setFilter} className="w-auto">
                    <TabsList>
                        <TabsTrigger value="ALL">All</TabsTrigger>
                        <TabsTrigger value="SIGNAL">Signal</TabsTrigger>
                        <TabsTrigger value="NETWORK">Network</TabsTrigger>
                        <TabsTrigger value="SYSTEM">System</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            <div className="grid gap-4">
                {/* Safety check: ensure alerts is an array before mapping */}
                {Array.isArray(alerts) ? (
                    alerts.map((alert) => (
                        <Card key={alert.id} className="overflow-hidden border-l-4 border-l-primary">
                            <div className="flex p-4 gap-4">
                                <Badge className={getSeverityColor(alert.severity)}>
                                    {alert.severity}
                                </Badge>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono font-bold">{alert.probe_id}</span>
                                        <span className="text-muted-foreground">•</span>
                                        <span className="text-sm">{alert.category}</span>
                                    </div>
                                    <p className="mt-1 text-sm font-medium">{alert.message}</p>
                                    <div className="mt-2 text-xs text-muted-foreground">
                                        {new Date(alert.created_at).toLocaleString()}
                                    </div>
                                </div>
                                <Button size="sm" variant="ghost" onClick={() => acknowledge(alert.id)}>
                                    Mark Read
                                </Button>
                            </div>
                        </Card>
                    ))
                ) : (
                    <div className="text-center py-10 text-muted-foreground">
                        No active alerts or failed to load data.
                    </div>
                )}
            </div>
        </div>
    );
}