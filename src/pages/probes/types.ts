export interface Probe {
    probe_id: string
    location: string
    building?: string
    floor?: string
    status: 'active' | 'inactive' | 'maintenance'
    last_seen: string
    ip_address?: string
    version?: string
    metadata?: Record<string, any>
}

export interface ProbeCommand {
    id: number
    command_type: string
    status: string
    issued_at: string
    result?: any
}

export interface ProbeStatusCache {
    probe_id: string
    uptime: number
    free_heap: number
    rssi: number
    ip: string
    ssid: string
    temp_c: number
    timestamp: string
    updated_at: string
}

export interface ProbeConfigCache {
    probe_id: string
    wifi: Record<string, any>
    mqtt: Record<string, any>
    heap_free: number
    uptime: number
    updated_at: string
    version?: string
}

export interface PingStatus {
    online: boolean
    last_seen: string
    updated_at: string
}

export type ProbeFormValues = {
    probe_id: string
    location: string
    building: string
    floor: string
}