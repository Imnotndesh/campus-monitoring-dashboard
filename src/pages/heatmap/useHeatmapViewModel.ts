import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { TopologyLayout, HeatmapResponse, FloorDetails } from "./types";

export const useHeatmapViewModel = () => {
    const [metric, setMetric] = useState<string>("rssi");
    const [selectedFloor, setSelectedFloor] = useState<{
        buildingId: string,
        buildingName: string,
        floorId: string
    } | null>(null);

    // 1. Fetch Static Layout
    const { data: layout, isLoading: isLayoutLoading } = useQuery<TopologyLayout>({
        queryKey: ["topology", "layout"],
        queryFn: async () => {
            const res = await fetch("/api/v1/topology/layout");
            if (!res.ok) throw new Error("Failed to load layout");
            return res.json();
        },
        refetchOnWindowFocus: false,
    });

    // 2. Poll Heatmap Data (Live)
    const { data: heatmap, isLoading: isHeatmapLoading } = useQuery<HeatmapResponse>({
        queryKey: ["topology", "heatmap", metric],
        queryFn: async () => {
            const res = await fetch(`/api/v1/topology/heatmap?metric=${metric}`);
            if (!res.ok) throw new Error("Failed to load heatmap");
            return res.json();
        },
        refetchInterval: 10000,
    });

    // 3. Fetch Selected Floor Detail
    const { data: floorDetails, isLoading: isFloorDetailsLoading } = useQuery<FloorDetails>({
        queryKey: ["topology", "floor", selectedFloor?.buildingName, selectedFloor?.floorId],
        queryFn: async () => {
            if (!selectedFloor) return null;
            const bName = encodeURIComponent(selectedFloor.buildingName);
            const fName = encodeURIComponent(selectedFloor.floorId);
            const res = await fetch(`/api/v1/topology/building/${bName}/floor/${fName}`);
            if (!res.ok) throw new Error("Failed to load floor details");
            return res.json();
        },
        enabled: !!selectedFloor,
        refetchInterval: 5000,
    });

    // 4. Map API Data to Node Graph (Obsidian Style)
    const graphData = useMemo(() => {
        const nodes: any[] = [];
        const links: any[] = [];

        if (!layout) return { nodes, links };

        // Helper to get floor color
        const getFloorHealth = (bId: string, fId: string) => {
            if (!heatmap?.heatmap_data) return { color_hex: "#52525b", active_alerts: 0 };
            return heatmap.heatmap_data.find(h => h.building_id === bId && h.floor_id === fId) || { color_hex: "#52525b", active_alerts: 0 };
        };

        // Root Node (Server)
        nodes.push({
            id: layout.center.id,
            name: layout.center.name,
            group: 'SERVER',
            val: 12, // Size
            color: '#3b82f6' // Blue
        });

        // Building & Floor Nodes
        layout.buildings.forEach(b => {
            // Building Node
            nodes.push({
                id: b.id,
                name: b.name,
                group: 'BUILDING',
                val: 8,
                color: '#8b5cf6' // Violet
            });

            // Link Server -> Building
            links.push({ source: layout.center.id, target: b.id });

            // Floor Nodes
            b.floors.forEach(f => {
                const floorNodeId = `${b.id}_${f.floor_id}`;
                const health = getFloorHealth(b.id, f.floor_id);

                nodes.push({
                    id: floorNodeId,
                    name: f.floor_id,
                    group: 'FLOOR',
                    val: 5,
                    color: health.color_hex,

                    // Payload for sidebar
                    buildingId: b.id,
                    buildingName: b.name,
                    floorId: f.floor_id,
                    activeAlerts: health.active_alerts
                });

                // Link Building -> Floor
                links.push({ source: b.id, target: floorNodeId });
            });
        });

        return { nodes, links };
    }, [layout, heatmap]);

    return {
        graphData,
        floorDetails,
        isLoading: isLayoutLoading || isHeatmapLoading,
        isFloorDetailsLoading,
        metric, setMetric,
        selectedFloor, setSelectedFloor,
    };
};