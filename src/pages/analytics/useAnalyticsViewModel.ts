import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type {
    AnalyticsTimeRange,
    Probe,
    TimeSeriesPoint,
    NetworkHealth,
    PerformanceMetrics,
    ChannelData,
    APStats,
    CongestionData,
    Anomaly,
    Command,
    RoamingSession,
} from "./types"

export function useAnalyticsViewModel() {
    const queryClient = useQueryClient()
    const [selectedProbe, setSelectedProbe] = useState<string>("all")
    const [range, setRange] = useState<AnalyticsTimeRange>("24h")
    const [selectedScanId, setSelectedScanId] = useState<number | null>(null)
    const [comparisonProbes, setComparisonProbes] = useState<string[]>([])

    // --- Helper: Date Ranges & Hours ---
    const rangeToHours = { "1h": 1, "6h": 6, "24h": 24, "7d": 168 }
    const hours = rangeToHours[range]

    const getDateRange = () => {
        const end = new Date()
        const start = new Date()
        start.setHours(end.getHours() - hours)
        return { start: start.toISOString(), end: end.toISOString() }
    }

    const getInterval = () => {
        if (range === '1h') return '1 minute'
        if (range === '6h') return '5 minutes'
        if (range === '24h') return '1 hour'
        return '6 hours'
    }

    // --- 1. Fetch Probes ---
    const { data: probes = [] } = useQuery<Probe[]>({
        queryKey: ["probes"],
        queryFn: async () => {
            const res = await fetch("/api/v1/probes")
            if (!res.ok) throw new Error("Failed to fetch probes")
            return res.json()
        }
    })

    // --- 2. Fetch TimeSeries (RSSI & Latency) ---
    const { data: chartData = [] } = useQuery({
        queryKey: ["chartData", range, selectedProbe],
        queryFn: async () => {
            const { start, end } = getDateRange()
            const interval = getInterval()
            const params = new URLSearchParams({
                start_time: start,
                end_time: end,
                interval
            })

            if (selectedProbe !== 'all') {
                params.append("probe_id", selectedProbe)
            }

            const [rssiRes, latencyRes] = await Promise.all([
                fetch(`/api/v1/analytics/timeseries/rssi?${params}`),
                fetch(`/api/v1/analytics/timeseries/latency?${params}`)
            ])

            const rssiData: TimeSeriesPoint[] = rssiRes.ok ? await rssiRes.json() : []
            const latencyData: TimeSeriesPoint[] = latencyRes.ok ? await latencyRes.json() : []

            // Merge by timestamp
            const dataMap = new Map<string, { timestamp: string, rssi: number | null, latency: number | null }>()

            rssiData.forEach(p => {
                const existing = dataMap.get(p.timestamp) || { timestamp: p.timestamp, rssi: null, latency: null }
                existing.rssi = p.value
                dataMap.set(p.timestamp, existing)
            })

            latencyData.forEach(p => {
                const existing = dataMap.get(p.timestamp) || { timestamp: p.timestamp, rssi: null, latency: null }
                existing.latency = p.value
                dataMap.set(p.timestamp, existing)
            })

            return Array.from(dataMap.values()).sort((a, b) =>
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            )
        }
    })

    // --- 3. Network Health or Performance Stats ---
    const { data: stats } = useQuery<NetworkHealth | PerformanceMetrics>({
        queryKey: ["stats", range, selectedProbe],
        queryFn: async () => {
            if (selectedProbe === 'all') {
                const res = await fetch("/api/v1/analytics/health")
                if (!res.ok) throw new Error("Failed to fetch health")
                return res.json()
            } else {
                const { start, end } = getDateRange()
                const params = new URLSearchParams({ start_time: start, end_time: end })
                const res = await fetch(`/api/v1/analytics/performance/${selectedProbe}?${params}`)
                if (!res.ok) throw new Error("Failed to fetch performance")
                return res.json()
            }
        }
    })

    // --- 4. Channel Distribution ---
    const { data: channels = [] } = useQuery<ChannelData[]>({
        queryKey: ["channels", range],
        queryFn: async () => {
            const { start, end } = getDateRange()
            const params = new URLSearchParams({ start_time: start, end_time: end })
            const res = await fetch(`/api/v1/analytics/channels?${params}`)
            if (!res.ok) return []
            return res.json()
        },
        enabled: selectedProbe === 'all'
    })

    // --- 5. Access Point Analysis ---
    const { data: apData = [] } = useQuery<APStats[]>({
        queryKey: ["aps", hours],
        queryFn: async () => {
            const res = await fetch(`/api/v1/analytics/aps?hours=${hours}`)
            if (!res.ok) return []
            return res.json()
        },
        enabled: selectedProbe === 'all'
    })

    // --- 6. Congestion Analysis ---
    const { data: congestion = [] } = useQuery<CongestionData[]>({
        queryKey: ["congestion", hours],
        queryFn: async () => {
            const res = await fetch(`/api/v1/analytics/congestion?hours=${hours}`)
            if (!res.ok) return []
            return res.json()
        },
        enabled: selectedProbe === 'all'
    })

    // --- 7. Anomalies ---
    const { data: anomalies = [] } = useQuery<Anomaly[]>({
        queryKey: ["anomalies", selectedProbe, hours],
        queryFn: async () => {
            if (selectedProbe === 'all') return []
            const res = await fetch(`/api/v1/analytics/anomalies/${selectedProbe}?hours=${hours}`)
            if (!res.ok) return []
            return res.json()
        },
        enabled: selectedProbe !== 'all'
    })

    // --- 8. Roaming Analysis ---
    const { data: roaming = [] } = useQuery<RoamingSession[]>({
        queryKey: ["roaming", selectedProbe, hours],
        queryFn: async () => {
            if (selectedProbe === 'all') return []
            const res = await fetch(`/api/v1/analytics/roaming/${selectedProbe}?hours=${hours}`)
            if (!res.ok) return []
            return res.json()
        },
        enabled: selectedProbe !== 'all'
    })

    // --- 9. Probe Comparison ---
    const { data: comparison } = useQuery({
        queryKey: ["comparison", comparisonProbes, hours],
        queryFn: async () => {
            if (comparisonProbes.length < 2) return null
            const params = new URLSearchParams({ hours: hours.toString() })
            comparisonProbes.forEach(p => params.append("probe_ids", p))
            const res = await fetch(`/api/v1/analytics/comparison?${params}`)
            if (!res.ok) return null
            return res.json()
        },
        enabled: comparisonProbes.length >= 2
    })

    // --- 10. Deep Scans ---
    const { data: scans = [] } = useQuery<Command[]>({
        queryKey: ["deep_scans", selectedProbe],
        queryFn: async () => {
            if (selectedProbe === "all") return []
            const res = await fetch(`/api/v1/commands/probe/${selectedProbe}?limit=50`)

            if (!res.ok) return []

            const raw = await res.json()
            const cmds = Array.isArray(raw) ? raw : []

            return cmds
                .filter((c: any) => c.command_type === 'deep_scan')
                .sort((a: Command, b: Command) =>
                    new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime()
                )
        },
        enabled: selectedProbe !== "all",
        refetchInterval: 5000
    })

    // --- Mutations ---
    const triggerScanMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/v1/probes/${selectedProbe}/command`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: 'deep_scan', params: {} })
            })
            if (!res.ok) throw new Error("Failed to trigger scan")
            return res.json()
        },
        onSuccess: () => {
            toast.success("Deep Scan Initiated")
            queryClient.invalidateQueries({ queryKey: ["deep_scans"] })
        },
        onError: () => {
            toast.error("Failed to start scan")
        }
    })

    const deleteScanMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/v1/commands/${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error("Failed to delete")
        },
        onSuccess: (_, deletedId) => {
            toast.success("Scan deleted")
            if (selectedScanId === deletedId) setSelectedScanId(null)
            queryClient.invalidateQueries({ queryKey: ["deep_scans"] })
        }
    })

    // --- Computed Values ---
    const normalizedStats = useMemo(() => {
        if (!stats) return null

        const getVal = (keys: string[]) => {
            for (const k of keys) {
                if ((stats as any)[k] !== undefined && (stats as any)[k] !== null) {
                    return (stats as any)[k]
                }
            }
            return null
        }

        const rssi = getVal(['avg_rssi', 'rssi'])
        const latency = getVal(['avg_latency', 'latency'])
        const loss = getVal(['avg_packet_loss', 'packet_loss'])
        const score = getVal(['health_score', 'stability_score'])
        const validRssi = (rssi && rssi < 0) ? rssi : null

        return {
            rssi: validRssi,
            latency: latency || 0,
            loss: loss || 0,
            score: score || 0,
            activeProbes: (stats as NetworkHealth).active_probes,
            totalProbes: (stats as NetworkHealth).total_probes,
            sampleCount: (stats as PerformanceMetrics).sample_count
        }
    }, [stats])

    const activeScan = scans.find(s => s.id === selectedScanId) || scans[0] || null

    return {
        selectedProbe,
        setSelectedProbe,
        range,
        setRange,
        selectedScanId,
        setSelectedScanId,
        comparisonProbes,
        setComparisonProbes,
        probes,
        chartData,
        normalizedStats,
        channels,
        apData,
        congestion,
        anomalies,
        roaming,
        comparison,
        scans,
        activeScan,
        triggerScan: triggerScanMutation.mutate,
        isTriggeringScan: triggerScanMutation.isPending,
        deleteScan: deleteScanMutation.mutate
    }
}