import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {Activity, Clock, ShieldAlert, CheckCircle2, FileText} from "lucide-react";
import { useAlertsViewModel } from "./useAlertsViewModel";
import { useAlertGlobal } from "../../components/AlertProvider";
import { cn } from "@/lib/utils";

export default function AlertsPage() {
    const {
        alerts,
        isLoading,
        connectionStatus,
        filter,
        setFilter,
        acknowledge
    } = useAlertsViewModel();
    const { setUnreadCount } = useAlertGlobal();
    const vm = useAlertsViewModel()

    useEffect(() => {
        setUnreadCount(0);
    }, [setUnreadCount]);

    const getSeverityStyles = (severity: string) => {
        switch (severity) {
            case "CRITICAL":
                return "bg-red-500/10 text-red-500 border-red-500/20";
            case "WARNING":
                return "bg-amber-500/10 text-amber-500 border-amber-500/20";
            default:
                return "bg-blue-500/10 text-blue-500 border-blue-500/20";
        }
    };

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            {/* --- HEADER SECTION --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">System Alerts</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <div className={cn(
                            "h-2 w-2 rounded-full",
                            connectionStatus === 'connected' ? "bg-emerald-500 animate-pulse" : "bg-red-500"
                        )} />
                        <span className="text-xs text-muted-foreground uppercase font-medium tracking-wider">
                            {connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
                        </span>
                    </div>
                    <Button variant="outline" size="sm" onClick={vm.generateReport}>
                        <FileText className="h-4 w-4 mr-2" />
                        Generate Report
                    </Button>
                </div>

                {/* --- CATEGORY FILTERS --- */}
                <Tabs value={filter} onValueChange={setFilter} className="w-full md:w-auto">
                    <TabsList className="grid grid-cols-4 w-full md:w-auto">
                        <TabsTrigger value="ALL">All</TabsTrigger>
                        <TabsTrigger value="SIGNAL">Signal</TabsTrigger>
                        <TabsTrigger value="NETWORK">Network</TabsTrigger>
                        <TabsTrigger value="SYSTEM">System</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* --- ALERTS GRID --- */}
            <div className="grid gap-4">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                        <Activity className="h-8 w-8 animate-spin mb-4 opacity-20" />
                        <p>Synchronizing with campus probes...</p>
                    </div>
                ) : alerts.length === 0 ? (
                    <Card className="flex flex-col items-center justify-center h-64 border-dashed bg-muted/20">
                        <CheckCircle2 className="h-10 w-10 text-emerald-500/50 mb-2" />
                        <p className="text-muted-foreground font-medium">System Clear</p>
                        <p className="text-xs text-muted-foreground">No active {filter !== 'ALL' ? filter.toLowerCase() : ''} alerts detected.</p>
                    </Card>
                ) : (
                    alerts.map((alert) => (
                        <Card key={alert.id} className="overflow-hidden border-l-4 border-l-primary hover:bg-muted/30 transition-colors">
                            <div className="flex flex-col sm:flex-row p-4 gap-4 items-start sm:items-center">
                                {/* Severity Icon/Badge */}
                                <div className={cn("p-2 rounded-full", getSeverityStyles(alert.severity))}>
                                    <ShieldAlert className="h-5 w-5" />
                                </div>

                                {/* Content Body */}
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Badge variant="outline" className="font-mono bg-background">
                                            {alert.probe_id}
                                        </Badge>
                                        <span className="text-muted-foreground">•</span>
                                        <span className="text-sm font-semibold tracking-tight uppercase">
                                            {alert.metric_key || alert.category}
                                        </span>
                                        <Badge className={cn("text-[10px] h-5", getSeverityStyles(alert.severity))}>
                                            {alert.severity}
                                        </Badge>
                                    </div>
                                    <p className="text-sm font-medium leading-relaxed">
                                        {alert.message}
                                    </p>
                                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        <span>{new Date(alert.created_at).toLocaleString()}</span>
                                        {alert.occurrences > 1 && (
                                            <Badge variant="secondary" className="text-[10px] h-4">
                                                {alert.occurrences} Events
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                {/* Action Button */}
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-xs text-muted-foreground hover:text-foreground"
                                    onClick={() => acknowledge(alert.id)}
                                >
                                    Mark Read
                                </Button>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}