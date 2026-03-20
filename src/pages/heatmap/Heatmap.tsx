import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {X, Activity, AlertTriangle, FileText} from "lucide-react";
import { useHeatmapViewModel } from "./useHeatmapViewModel";
import TopologyGraph from "@/components/TopologyGraph";
import { cn } from "@/lib/utils";

export default function HeatmapPage() {
    const {
        graphData,
        floorDetails,
        isLoading,
        isFloorDetailsLoading,
        metric,
        setMetric,
        selectedFloor,
        setSelectedFloor,
        generateSiteSurveyReport,
    } = useHeatmapViewModel();

    return (
        <div className="relative w-full h-[calc(100vh-80px)] bg-background/50 border rounded-xl flex flex-col shadow-sm overflow-hidden">
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-background/95 backdrop-blur-md p-2 rounded-lg border shadow-sm">
                <Select value={metric} onValueChange={setMetric}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select Metric" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="rssi">Signal Strength (RSSI)</SelectItem>
                        <SelectItem value="latency">Network Latency</SelectItem>
                        <SelectItem value="packet_loss">Packet Loss</SelectItem>
                    </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={generateSiteSurveyReport}>
                    <FileText className="h-4 w-4 mr-2" />
                    Site Survey
                </Button>
            </div>

            <div className="flex-1">
                <TopologyGraph
                    graphData={graphData}
                    isLoading={isLoading}
                    onNodeClick={(node: any) => {
                        if (node.group === "FLOOR" || node.group === "PROBE") {
                            setSelectedFloor({
                                buildingId: node.buildingId,
                                buildingName: node.buildingName,
                                floorId: node.floorId,
                            });
                        }
                    }}
                />
            </div>

            {selectedFloor && (
                <Card className="absolute top-4 right-4 bottom-4 w-80 z-30 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 border-l-4 border-l-primary bg-background/95 backdrop-blur">
                    <div className="p-4 border-b flex justify-between items-center bg-muted/30">
                        <div>
                            <h3 className="font-bold text-lg">{floorDetails?.building || selectedFloor.buildingName}</h3>
                            <p className="text-sm text-muted-foreground">{floorDetails?.floor || selectedFloor.floorId}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setSelectedFloor(null)} className="rounded-full">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="p-4 overflow-y-auto flex-1 space-y-4">
                        {isFloorDetailsLoading ? (
                            <Activity className="animate-spin h-6 w-6 mx-auto text-muted-foreground mt-10" />
                        ) : floorDetails?.probes.map((p) => (
                            <div key={p.probe_id} className="border rounded-lg p-3 space-y-2 bg-card shadow-sm">
                                <div className="flex justify-between items-center">
                                    <span className="font-mono text-sm font-bold truncate max-w-[180px]">{p.probe_id}</span>
                                    <div
                                        className={cn(
                                            "h-2.5 w-2.5 rounded-full shadow-inner",
                                            p.status === "online" ? "bg-emerald-500" : "bg-red-500"
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="bg-muted/50 p-2 rounded border border-border/50">
                                        <span className="text-muted-foreground block mb-0.5">RSSI</span>
                                        <span className="font-medium text-sm">{p.current_metrics?.rssi || "N/A"} dBm</span>
                                    </div>
                                    <div className="bg-muted/50 p-2 rounded border border-border/50">
                                        <span className="text-muted-foreground block mb-0.5">Latency</span>
                                        <span className="font-medium text-sm">{p.current_metrics?.latency || "N/A"} ms</span>
                                    </div>
                                </div>

                                {p.active_alerts?.length > 0 && (
                                    <div className="mt-2 text-xs text-red-700 bg-red-500/10 border border-red-500/20 p-2 rounded flex items-start gap-1.5 font-medium">
                                        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                                        <span>{p.active_alerts.length} active alerts detected</span>
                                    </div>
                                )}
                            </div>
                        ))}
                        {floorDetails?.probes && floorDetails.probes.length === 0 && (
                            <div className="text-center mt-10 p-4 bg-muted/20 border border-dashed rounded-lg">
                                <p className="text-sm font-medium text-foreground">No Probes Found</p>
                                <p className="text-xs text-muted-foreground mt-1">No telemetry reporting for this level.</p>
                            </div>
                        )}
                    </div>
                </Card>
            )}
        </div>
    );
}