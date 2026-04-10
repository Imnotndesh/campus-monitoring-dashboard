import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
} from "./types";
import { apiFetch, fetchBlob } from "../../lib/api";

export function useAnalyticsViewModel() {
    const queryClient = useQueryClient();
    const [selectedProbe, setSelectedProbe] = useState<string>("all");
    const [range, setRange] = useState<AnalyticsTimeRange>("24h");
    const [selectedScanId, setSelectedScanId] = useState<number | null>(null);
    const [comparisonProbes, setComparisonProbes] = useState<string[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [chartType, setChartType] = useState<"line" | "bar">("line");

    const rangeToHours = { "1h": 1, "6h": 6, "24h": 24, "7d": 168, "30d": 720, "90d": 2160 };
    const hours = rangeToHours[range];

    const getDateRange = () => {
        const end = new Date();
        const start = new Date();
        const hours = rangeToHours[range];
        if (range === "30d" || range === "90d") {
            start.setUTCHours(0, 0, 0, 0);
            end.setUTCHours(23, 59, 59, 999);
            start.setUTCDate(end.getUTCDate() - hours / 24);
        } else {
            start.setHours(end.getHours() - hours);
        }
        return { start: start.toISOString(), end: end.toISOString() };
    };

    const getInterval = () => {
        if (range === "1h") return "1 minute";
        if (range === "6h") return "5 minutes";
        if (range === "24h") return "1 hour";
        if (range === "7d") return "1 day";
        if (range === "30d") return "1 day";
        if (range === "90d") return "1 week";
        return "1 day";
    };

    // 1. Probes
    const { data: probes = [] } = useQuery<Probe[]>({
        queryKey: ["probes"],
        queryFn: async () => {
            try {
                return await apiFetch("/api/v1/probes");
            } catch {
                return [];
            }
        },
    });

    // 2. TimeSeries
    const { data: chartData = [] } = useQuery({
        queryKey: ["chartData", range, selectedProbe],
        queryFn: async () => {
            const { start, end } = getDateRange();
            const interval = getInterval();
            const params = new URLSearchParams({
                start_time: start,
                end_time: end,
                interval,
            });

            if (selectedProbe !== "all") {
                params.append("probe_id", selectedProbe);
            }

            const [rssiData, latencyData] = await Promise.all([
                apiFetch(`/api/v1/analytics/timeseries/rssi?${params}`).catch(() => [] as TimeSeriesPoint[]),
                apiFetch(`/api/v1/analytics/timeseries/latency?${params}`).catch(() => [] as TimeSeriesPoint[]),
            ]);

            const dataMap = new Map<string, { timestamp: string; rssi: number | null; latency: number | null }>();

            rssiData.forEach((p: TimeSeriesPoint) => {
                const existing = dataMap.get(p.timestamp) || { timestamp: p.timestamp, rssi: null, latency: null };
                existing.rssi = p.value;
                dataMap.set(p.timestamp, existing);
            });

            latencyData.forEach((p: TimeSeriesPoint) => {
                const existing = dataMap.get(p.timestamp) || { timestamp: p.timestamp, rssi: null, latency: null };
                existing.latency = p.value;
                dataMap.set(p.timestamp, existing);
            });

            const result = Array.from(dataMap.values()).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            console.log("Chart data for", range, result);
            return result;
        },
    });

    // 3. Stats
    const { data: stats } = useQuery<NetworkHealth | PerformanceMetrics>({
        queryKey: ["stats", range, selectedProbe],
        queryFn: async () => {
            if (selectedProbe === "all") {
                return await apiFetch("/api/v1/analytics/health");
            } else {
                const { start, end } = getDateRange();
                const params = new URLSearchParams({ start_time: start, end_time: end });
                return await apiFetch(`/api/v1/analytics/performance/${selectedProbe}?${params}`);
            }
        },
    });

    // 4. Channels
    const { data: channels = [] } = useQuery<ChannelData[]>({
        queryKey: ["channels", range],
        queryFn: async () => {
            const { start, end } = getDateRange();
            const params = new URLSearchParams({ start_time: start, end_time: end });
            try {
                return await apiFetch(`/api/v1/analytics/channels?${params}`);
            } catch {
                return [];
            }
        },
        enabled: selectedProbe === "all",
    });

    // 5. APs
    const { data: apData = [] } = useQuery<APStats[]>({
        queryKey: ["aps", hours],
        queryFn: async () => {
            try {
                return await apiFetch(`/api/v1/analytics/aps?hours=${hours}`);
            } catch {
                return [];
            }
        },
        enabled: selectedProbe === "all",
    });

    // 6. Congestion
    const { data: congestion = [] } = useQuery<CongestionData[]>({
        queryKey: ["congestion", hours],
        queryFn: async () => {
            try {
                return await apiFetch(`/api/v1/analytics/congestion?hours=${hours}`);
            } catch {
                return [];
            }
        },
        enabled: selectedProbe === "all",
    });

    // 7. Anomalies
    const { data: anomalies = [] } = useQuery<Anomaly[]>({
        queryKey: ["anomalies", selectedProbe, hours],
        queryFn: async () => {
            if (selectedProbe === "all") return [];
            try {
                return await apiFetch(`/api/v1/analytics/anomalies/${selectedProbe}?hours=${hours}`);
            } catch {
                return [];
            }
        },
        enabled: selectedProbe !== "all",
    });

    // 8. Roaming
    const { data: roaming = [] } = useQuery<RoamingSession[]>({
        queryKey: ["roaming", selectedProbe, hours],
        queryFn: async () => {
            if (selectedProbe === "all") return [];
            try {
                return await apiFetch(`/api/v1/analytics/roaming/${selectedProbe}?hours=${hours}`);
            } catch {
                return [];
            }
        },
        enabled: selectedProbe !== "all",
    });

    // 9. Comparison
    const { data: comparison } = useQuery({
        queryKey: ["comparison", comparisonProbes, hours],
        queryFn: async () => {
            if (comparisonProbes.length < 2) return null;
            const params = new URLSearchParams({ hours: hours.toString() });
            comparisonProbes.forEach((p) => params.append("probe_ids", p));
            try {
                return await apiFetch(`/api/v1/analytics/comparison?${params}`);
            } catch {
                return null;
            }
        },
        enabled: comparisonProbes.length >= 2,
    });

    // 10. Deep scans
    const { data: scans = [] } = useQuery<Command[]>({
        queryKey: ["deep_scans", selectedProbe],
        queryFn: async () => {
            if (selectedProbe === "all") return [];
            try {
                const data = await apiFetch(`/api/v1/commands/probe/${selectedProbe}?limit=50`);
                const cmds = Array.isArray(data) ? data : [];
                return cmds
                    .filter((c: any) => c.command_type === "deep_scan")
                    .sort((a: Command, b: Command) => new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime());
            } catch {
                return [];
            }
        },
        enabled: selectedProbe !== "all",
        refetchInterval: 5000,
    });

    const generateAnalyticsReport = async () => {
        const rangeToHours = { "1h": 1, "6h": 6, "24h": 24, "7d": 168 , "30d":720, "90d":2160};
        const hours = rangeToHours[range];
        const end = new Date();
        const start = new Date();
        start.setHours(end.getHours() - hours);

        const from = start.toISOString();
        const to = end.toISOString();

        const baseUrl = `/api/v1/reports/generate?type=analytics&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&format=pdf`;
        const probeParam = selectedProbe !== "all" ? `&probe_ids=${encodeURIComponent(selectedProbe)}` : "";
        const url = baseUrl + probeParam;

        try {
            const blob = await fetchBlob(url);
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `analytics_report_${new Date().toISOString().slice(0, 19)}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error("Report download failed", error);
            toast.error("Failed to generate report");
        }
    };

    const generateOutageReport = async () => {
        const rangeToHours = { "1h": 1, "6h": 6, "24h": 24, "7d": 168, "30d": 720, "90d": 2160 };
        const hours = rangeToHours[range];
        const end = new Date();
        const start = new Date();
        start.setHours(end.getHours() - hours);

        const from = start.toISOString();
        const to = end.toISOString();

        const url = `/api/v1/reports/generate?type=outage&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&format=pdf`;
        try {
            const blob = await fetchBlob(url);
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `outage_report_${new Date().toISOString().slice(0, 19)}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error("Report download failed", error);
            toast.error("Failed to generate report");
        }
    };

    const generateNetworkBaselineReport = async () => {
        const rangeToHours = { "1h": 1, "6h": 6, "24h": 24, "7d": 168, "30d": 720, "90d": 2160 };
        const hours = rangeToHours[range];
        const end = new Date();
        const start = new Date();
        start.setHours(end.getHours() - hours);

        const from = start.toISOString();
        const to = end.toISOString();

        const url = `/api/v1/reports/generate?type=network_baseline&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&format=pdf`;
        try {
            const blob = await fetchBlob(url);
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `baseline_report_${new Date().toISOString().slice(0, 19)}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error("Report download failed", error);
            toast.error("Failed to generate report");
        }
    };

    const triggerScanMutation = useMutation({
        mutationFn: async () => {
            return await apiFetch(`/api/v1/probes/${selectedProbe}/command`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    command_type: 'deep_scan',
                    payload: {}
                })
            });
        },
        onSuccess: () => {
            toast.success("Deep Scan Initiated");
            queryClient.invalidateQueries({ queryKey: ["deep_scans"] });
        },
        onError: () => {
            toast.error("Failed to start scan");
        }
    });

    const deleteScanMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiFetch(`/api/v1/commands/${id}`, { method: "DELETE" });
        },
        onSuccess: (_, deletedId) => {
            toast.success("Scan deleted");
            if (selectedScanId === deletedId) setSelectedScanId(null);
            queryClient.invalidateQueries({ queryKey: ["deep_scans"] });
        },
    });

    const normalizedStats = useMemo(() => {
        if (!stats) return null;

        const getVal = (keys: string[]) => {
            for (const k of keys) {
                if ((stats as any)[k] !== undefined && (stats as any)[k] !== null) {
                    return (stats as any)[k];
                }
            }
            return null;
        };

        const rssi = getVal(["avg_rssi", "rssi"]);
        const latency = getVal(["avg_latency", "latency"]);
        const loss = getVal(["avg_packet_loss", "packet_loss"]);
        const score = getVal(["health_score", "stability_score"]);
        const validRssi = rssi && rssi < 0 ? rssi : null;

        return {
            rssi: validRssi,
            latency: latency || 0,
            loss: loss || 0,
            score: score || 0,
            activeProbes: (stats as NetworkHealth).active_probes,
            totalProbes: (stats as NetworkHealth).total_probes,
            sampleCount: (stats as PerformanceMetrics).sample_count,
        };
    }, [stats]);

    const activeScan = scans.find((s) => s.id === selectedScanId) || scans[0] || null;

    return {
        selectedProbe,
        setSelectedProbe,
        range,
        setRange,
        selectedScanId,
        setSelectedScanId,
        comparisonProbes,
        setComparisonProbes,
        selectedDate,
        setSelectedDate,
        chartType,
        setChartType,
        probes,
        chartData,
        generateAnalyticsReport,
        generateOutageReport,
        generateNetworkBaselineReport,
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
        deleteScan: deleteScanMutation.mutate,
    };
}