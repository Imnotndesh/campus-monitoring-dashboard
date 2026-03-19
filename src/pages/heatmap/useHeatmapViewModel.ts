import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { TopologyLayout, HeatmapResponse, FloorDetails } from "./types";
import { apiFetch } from "../../lib/api";

export const useHeatmapViewModel = () => {
    const [metric, setMetric] = useState<string>("rssi");
    const [selectedFloor, setSelectedFloor] = useState<{
        buildingId: string;
        buildingName: string;
        floorId: string;
    } | null>(null);

    const { data: layout, isLoading: isLayoutLoading } = useQuery<TopologyLayout>({
        queryKey: ["topology", "layout"],
        queryFn: async () => await apiFetch("/api/v1/topology/layout"),
        refetchOnWindowFocus: false,
    });

    const { data: heatmap, isLoading: isHeatmapLoading } = useQuery<HeatmapResponse>({
        queryKey: ["topology", "heatmap", metric],
        queryFn: async () => await apiFetch(`/api/v1/topology/heatmap?metric=${metric}`),
        refetchInterval: 10000,
    });

    const { data: floorDetails, isLoading: isFloorDetailsLoading } = useQuery<FloorDetails>({
        queryKey: ["topology", "floor", selectedFloor?.buildingName, selectedFloor?.floorId],
        queryFn: async () => {
            if (!selectedFloor) return null;
            const bName = encodeURIComponent(selectedFloor.buildingName);
            const fName = encodeURIComponent(selectedFloor.floorId);
            return await apiFetch(`/api/v1/topology/building/${bName}/floor/${fName}`);
        },
        enabled: !!selectedFloor,
        refetchInterval: 5000,
    });

    const graphData = useMemo(() => {
        const nodes: any[] = [];
        const links: any[] = [];

        if (!layout) return { nodes, links };

        const getFloorHealth = (bId: string, fId: string) => {
            if (!heatmap?.heatmap_data) return { color_hex: "#52525b", active_alerts: 0 };
            return (
                heatmap.heatmap_data.find((h) => h.building_id === bId && h.floor_id === fId) || {
                    color_hex: "#52525b",
                    active_alerts: 0,
                }
            );
        };

        nodes.push({ id: layout.center.id, name: layout.center.name, group: "SERVER", val: 12, color: "#3b82f6" });

        layout.buildings.forEach((b) => {
            nodes.push({ id: b.id, name: `Building: ${b.name}`, group: "BUILDING", val: 8, color: "#8b5cf6" });
            links.push({ source: layout.center.id, target: b.id });

            b.floors.forEach((f) => {
                const floorNodeId = `${b.id}_${f.floor_id}`;
                const health = getFloorHealth(b.id, f.floor_id);

                nodes.push({
                    id: floorNodeId,
                    name: `Floor: ${f.floor_id}`,
                    group: "FLOOR",
                    val: 5,
                    color: "#64748b",
                    buildingId: b.id,
                    buildingName: b.name,
                    floorId: f.floor_id,
                    activeAlerts: health.active_alerts,
                });
                links.push({ source: b.id, target: floorNodeId });

                (f.probes || []).forEach((probeId) => {
                    nodes.push({
                        id: probeId,
                        name: `Probe: ${probeId}`,
                        group: "PROBE",
                        val: 3,
                        color: health.color_hex,
                        buildingId: b.id,
                        buildingName: b.name,
                        floorId: f.floor_id,
                    });
                    links.push({ source: floorNodeId, target: probeId });
                });
            });
        });

        return { nodes, links };
    }, [layout, heatmap]);

    return {
        graphData,
        floorDetails,
        isLoading: isLayoutLoading || isHeatmapLoading,
        isFloorDetailsLoading,
        metric,
        setMetric,
        selectedFloor,
        setSelectedFloor,
    };
};