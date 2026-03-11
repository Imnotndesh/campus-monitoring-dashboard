export type FleetProbe = {
    probe_id: string
    location?: string
    building?: string
    groups: string[]
    tags: Record<string, string>
    maintenance_window?: { start: string; end: string }
    config_template_id?: number
    firmware_version?: string
    current_firmware?: string
    target_firmware?: string
    managed: boolean
    managed_by?: string
    enrolled_at?: string
    enrolled_by?: string
    config_version?: number
    commands_processed?: number
    last_command?: string
    last_seen?: string
    wifi_rssi?: number
    mqtt_connected?: boolean
    free_heap?: number
    uptime?: number
}

export type FleetGroup = {
    id: string
    name: string
    description: string
    probe_count?: number
    created_at?: string
}

export type FleetCommand = {
    id: string
    command_type: string
    payload?: Record<string, any>
    status: "pending" | "scheduled" | "in_progress" | "completed" | "failed" | "cancelled"
    issued_by?: string
    issued_at: string
    completed_at?: string
    total_targets: number
    acks_received: number
    completed_count: number
    failed_count: number
    target_groups?: string[]
    target_probes?: string[]
    scheduled_for?: string
}

export type FleetCommandTargetStatus = {
    probe_id: string
    status: string
    response_payload?: Record<string, any>
    error?: string
    updated_at?: string
}

export type FleetRolloutStatus = {
    command_id: string
    command_type: string
    issued_at: string
    status: string
    payload?: Record<string, any>
    progress: {
        total: number
        acknowledged: number
        completed: number
        failed: number
        pending: number
        percentage: number
    }
    timeline: {
        started_at: string
        completed_at?: string
    }
    targets?: FleetCommandTargetStatus[]
}

export type FleetStatusResponse = {
    total_managed: number
    online: number
    offline: number
    in_maintenance: number
    groups: number
    templates: number
    active_rollouts: number
    last_command?: string
}

export type FleetEnrollRequest = {
    groups?: string[]
    location?: string
    tags?: Record<string, string>
    maintenance_window?: string
    config_template_id?: number
}

export type FleetCommandRequest = {
    command_type: string
    payload?: Record<string, any>
    target_all?: boolean
    groups?: string[]
    probe_ids?: string[]
    exclude_probes?: string[]
    strategy?: "immediate" | "canary" | "staggered" | "maintenance"
    rollout_percentage?: number
    canary_count?: number
    batch_size?: number
    stagger_delay?: number
    completion_percent?: number
    ack_timeout_seconds?: number
    schedule?: { execute_at: string }
}
export type BaseProbe = {
    probe_id: string;
    location: string;
    building: string;
    floor: string;
    department: string;
    status: string;
    firmware_version: string;
    last_seen: string;
};

export type WiFiConfig = {
    ssid: string
    password?: string
    security?: string
}

export type MQTTConfig = {
    broker: string
    port: number
    username?: string
    password?: string
    topic?: string
}

export type ScanSettings = {
    interval: number
    targets: string[]
}

export type FleetConfigTemplate = {
    id: number
    name: string
    description?: string
    wifi?: WiFiConfig
    mqtt?: MQTTConfig
    scan_settings?: ScanSettings
    default_tags?: Record<string, string>
    default_groups?: string[]
    default_location?: string
    config: Record<string, any>
    created_by?: string
    created_at?: string
    usage_count?: number
}