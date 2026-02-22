import { useRef, useEffect, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Activity, AlertTriangle } from "lucide-react";
import { useHeatmapViewModel } from "./useHeatmapViewModel";
import { cn } from "@/lib/utils";

export default function HeatmapPage() {
    const {
        graphData, floorDetails, isLoading, isFloorDetailsLoading,
        metric, setMetric, selectedFloor, setSelectedFloor
    } = useHeatmapViewModel();

    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

    // Auto-resize the canvas when the window changes
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.offsetWidth,
                    height: containerRef.current.offsetHeight
                });
            }
        };
        window.addEventListener("resize", updateDimensions);
        updateDimensions(); // Initial calculation

        // Small delay to ensure flexbox has settled
        setTimeout(updateDimensions, 100);
        return () => window.removeEventListener("resize", updateDimensions);
    }, []);

    if (isLoading && graphData.nodes.length === 0) return (
        <div className="p-8 flex items-center justify-center h-full">
            <Activity className="animate-spin h-8 w-8 text-muted-foreground" />
        </div>
    );

    return (
        <div className="relative w-full h-[calc(100vh-80px)] bg-background/50 border rounded-xl flex flex-col shadow-sm overflow-hidden" ref={containerRef}>

            {/* --- TOP CONTROLS --- */}
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
            </div>

            {/* --- OBSIDIAN STYLE GRAPH --- */}
            <div className="flex-1 cursor-grab active:cursor-grabbing">
                <ForceGraph2D
                    width={dimensions.width}
                    height={dimensions.height}
                    graphData={graphData}
                    nodeRelSize={6}
                    linkColor={() => "rgba(150, 150, 150, 0.4)"}
                    linkWidth={1.5}
                    // Custom Node Rendering to draw the text right next to the node dot
                    nodeCanvasObject={(node: any, ctx, globalScale) => {
                        const label = node.name;
                        const fontSize = 12 / globalScale;
                        ctx.font = `${fontSize}px Sans-Serif`;

                        // Draw Node Circle
                        ctx.beginPath();
                        ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI, false);
                        ctx.fillStyle = node.color;
                        ctx.fill();

                        // Draw Alert Ring if active alerts exist
                        if (node.activeAlerts > 0) {
                            ctx.beginPath();
                            ctx.arc(node.x, node.y, node.val + 2, 0, 2 * Math.PI, false);
                            ctx.strokeStyle = "rgba(239, 68, 68, 0.8)"; // Red ring
                            ctx.lineWidth = 2 / globalScale;
                            ctx.stroke();
                        }

                        // Draw Text Label
                        ctx.fillStyle = "rgba(100, 100, 100, 0.9)"; // Adjust for dark/light mode as needed
                        ctx.textAlign = "left";
                        ctx.textBaseline = "middle";

                        // Only label Server and Buildings permanently, or hover effects
                        if (node.group === 'SERVER' || node.group === 'BUILDING' || globalScale > 2) {
                            ctx.fillText(label, node.x + node.val + 2, node.y);
                        }
                    }}
                    onNodeClick={(node: any) => {
                        if (node.group === 'FLOOR') {
                            setSelectedFloor({
                                buildingId: node.buildingId,
                                buildingName: node.buildingName,
                                floorId: node.floorId
                            });
                        }
                    }}
                    // Force physics engine tuning
                    d3VelocityDecay={0.3}
                />
            </div>

            {/* --- SIDE PANEL (DRILL DOWN) --- */}
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
                        ) : floorDetails?.probes.map(p => (
                            <div key={p.probe_id} className="border rounded-lg p-3 space-y-2 bg-card shadow-sm">
                                <div className="flex justify-between items-center">
                                    <span className="font-mono text-sm font-bold truncate max-w-[180px]">{p.probe_id}</span>
                                    <div className={cn("h-2.5 w-2.5 rounded-full shadow-inner", p.status === 'online' ? 'bg-emerald-500' : 'bg-red-500')} />
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="bg-muted/50 p-2 rounded border border-border/50">
                                        <span className="text-muted-foreground block mb-0.5">RSSI</span>
                                        <span className="font-medium text-sm">{p.current_metrics?.rssi || 'N/A'} dBm</span>
                                    </div>
                                    <div className="bg-muted/50 p-2 rounded border border-border/50">
                                        <span className="text-muted-foreground block mb-0.5">Latency</span>
                                        <span className="font-medium text-sm">{p.current_metrics?.latency || 'N/A'} ms</span>
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
                        {floorDetails?.probes.length === 0 && (
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