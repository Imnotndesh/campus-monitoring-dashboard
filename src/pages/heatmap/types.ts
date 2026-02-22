export interface Coordinates {
    x: number;
    y: number;
}

export interface FloorNode {
    level: number;
    floor_id: string;
    z_index: number;
    probe_count: number;
    probes: string[];
}

export interface BuildingNode {
    id: string;
    name: string;
    coordinates: Coordinates;
    floors: FloorNode[];
}

export interface TopologyLayout {
    center: BuildingNode;
    buildings: BuildingNode[];
}

export interface FloorHealth {
    building_id: string;
    floor_id: string;
    status: string;
    color_hex: string;
    average_value: number;
    active_alerts: number;
}

export interface HeatmapResponse {
    timestamp: string;
    metric: string;
    heatmap_data: FloorHealth[];
}

export interface ProbeDetail {
    probe_id: string;
    status: string;
    last_seen: string;
    current_metrics: Record<string, number>;
    active_alerts: any[];
}

export interface FloorDetails {
    building: string;
    floor: string;
    overall_health: string;
    probes: ProbeDetail[];
}