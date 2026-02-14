export type AnalyticsTimeRange = "1h" | "6h" | "24h" | "7d"
export type Probe = { probe_id: string; location: string; building?: string; status?: string }

export type Command = {
    id: number
    status: string
    result: any
    issued_at: string
    command_type: string
    probe_id: string
}

export type TimeSeriesPoint = { timestamp: string; value: number }

export type Anomaly = {
    type: string
    severity: string
    description: string
    timestamp: string
    probe_id?: string
}

export type RoamingEvent = {
    from_ap: string
    to_ap: string
    timestamp: string
    rssi_before: number
    rssi_after: number
    latency_delta: number
}

export type APStats = {
    bssid: string
    avg_rssi: number
    connection_count: number
    avg_latency: number
    most_common_channel: number
}

export type ChannelData = {
    channel: number
    count: number
    avg_rssi?: number
}

export type CongestionData = {
    hour: string
    avg_neighbors: number
    avg_overlap: number
    avg_utilization: number
    peak_utilization: number
    congested_probes: number
}

export type PerformanceMetrics = {
    avg_rssi: number
    min_rssi: number
    max_rssi: number
    avg_latency: number
    min_latency: number
    max_latency: number
    avg_packet_loss: number
    stability_score: number
    sample_count: number
}

export type NetworkHealth = {
    total_probes: number
    active_probes: number
    avg_rssi: number
    avg_latency: number
    avg_packet_loss: number
    stability_score: number
}