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

export type ProbeFormValues = {
    probe_id: string
    location: string
    building: string
    floor: string
}