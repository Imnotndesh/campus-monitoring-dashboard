import { useRef, useEffect, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { Activity } from "lucide-react";

interface TopologyGraphProps {
    graphData: { nodes: any[]; links: any[] };
    isLoading?: boolean;
    onNodeClick?: (node: any) => void;
    focusedNodeId?: string; // Pass an ID to auto-center on it
    disableInteraction?: boolean; // For tiny dashboard widgets
}

export default function TopologyGraph({
                                          graphData,
                                          isLoading,
                                          onNodeClick,
                                          focusedNodeId,
                                          disableInteraction = false
                                      }: TopologyGraphProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const fgRef = useRef<any>();
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const [hasCentered, setHasCentered] = useState(false);

    // Auto-resize canvas
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
        updateDimensions();
        setTimeout(updateDimensions, 100);
        return () => window.removeEventListener("resize", updateDimensions);
    }, []);

    // Reset centering flag if the focused node changes
    useEffect(() => {
        setHasCentered(false);
    }, [focusedNodeId]);

    // Auto-center logic runs once the physics engine stabilizes the nodes
    const handleEngineStop = () => {
        if (focusedNodeId && !hasCentered && fgRef.current) {
            const targetNode = graphData.nodes.find(n => n.id === focusedNodeId);
            if (targetNode) {
                // Smoothly pan and zoom to the target node
                fgRef.current.centerAt(targetNode.x, targetNode.y, 1000);
                fgRef.current.zoom(4, 1000);
                setHasCentered(true);
            }
        } else if (!focusedNodeId && !hasCentered && fgRef.current) {
            // If no focus target, just zoom to fit the whole network
            fgRef.current.zoomToFit(400, 50);
            setHasCentered(true);
        }
    };

    if (isLoading && graphData.nodes.length === 0) {
        return (
            <div className="flex items-center justify-center w-full h-full min-h-[200px]">
                <Activity className="animate-spin h-8 w-8 text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="w-full h-full overflow-hidden rounded-md" ref={containerRef}>
            <ForceGraph2D
                ref={fgRef}
                width={dimensions.width}
                height={dimensions.height}
                graphData={graphData}
                nodeRelSize={6}
                linkColor={() => "rgba(150, 150, 150, 0.4)"}
                linkWidth={1.5}
                enableZoomInteraction={!disableInteraction}
                enableNodeDrag={!disableInteraction}
                onEngineStop={handleEngineStop}
                onNodeClick={onNodeClick}
                d3VelocityDecay={0.3}
                nodeCanvasObject={(node: any, ctx, globalScale) => {
                    // 1. Draw the actual node circle
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI, false);
                    ctx.fillStyle = node.color;
                    ctx.fill();

                    // 2. Draw Alert Ring if needed
                    if (node.activeAlerts > 0) {
                        ctx.beginPath();
                        ctx.arc(node.x, node.y, node.val + 2, 0, 2 * Math.PI, false);
                        ctx.strokeStyle = "rgba(239, 68, 68, 0.8)";
                        ctx.lineWidth = 2 / globalScale;
                        ctx.stroke();
                    }

                    // 3. ZOOM-DEPENDENT TEXT RENDERING
                    const fontSize = 12 / globalScale;
                    ctx.font = `${fontSize}px Sans-Serif`;
                    ctx.fillStyle = "rgba(150, 150, 150, 0.9)";
                    ctx.textAlign = "left";
                    ctx.textBaseline = "middle";

                    // Determine if we should show text based on zoom level (globalScale)
                    const shouldShowText =
                        (node.group === 'SERVER') || // Always show server
                        (node.group === 'BUILDING' && globalScale >= 0.8) || // Show buildings when slightly zoomed
                        (node.group === 'FLOOR' && globalScale >= 2.0) || // Show floors when zoomed closer
                        (node.group === 'PROBE' && globalScale >= 4.0); // Show probes only when super close

                    // Highlight focused node text regardless of zoom
                    if (shouldShowText || node.id === focusedNodeId) {
                        ctx.fillText(node.name, node.x + node.val + 2, node.y);
                    }

                    // Draw a strong ring around the focused node
                    if (node.id === focusedNodeId) {
                        ctx.beginPath();
                        ctx.arc(node.x, node.y, node.val + 4, 0, 2 * Math.PI, false);
                        ctx.strokeStyle = "rgba(59, 130, 246, 0.8)"; // Blue highlight
                        ctx.lineWidth = 3 / globalScale;
                        ctx.stroke();
                    }
                }}
            />
        </div>
    );
}