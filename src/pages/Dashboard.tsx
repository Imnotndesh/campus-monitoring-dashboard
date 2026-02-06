import { useQuery } from "@tanstack/react-query"
import { Activity, Signal, Server, AlertTriangle, RefreshCw, Edit, Save, Grid3X3, Eye, EyeOff } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import GridLayout from "react-grid-layout"
import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"
import { useEffect, useState } from "react"

// Types
type StatsResponse = { avg_rssi: number; avg_latency: number; avg_packet_loss: number }
type Probe = { probe_id: string; status: string }

type WidgetType = 'rssi' | 'latency' | 'activeProbes' | 'packetLoss' | 'signalGraph'

interface WidgetConfig {
    i: string
    x: number
    y: number
    w: number
    h: number
    minW?: number
    minH?: number
    type: WidgetType
    enabled: boolean
    visible: boolean
}

const defaultLayout: WidgetConfig[] = [
    { i: 'rssi', x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2, type: 'rssi', enabled: true, visible: true },
    { i: 'latency', x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2, type: 'latency', enabled: true, visible: true },
    { i: 'activeProbes', x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2, type: 'activeProbes', enabled: true, visible: true },
    { i: 'packetLoss', x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2, type: 'packetLoss', enabled: true, visible: true },
    { i: 'signalGraph', x: 0, y: 2, w: 12, h: 4, minW: 6, minH: 3, type: 'signalGraph', enabled: true, visible: true },
]

const STORAGE_KEY = 'dashboard-layout-v1'

export default function Dashboard() {
    const [isEditMode, setIsEditMode] = useState(false)
    const [widgets, setWidgets] = useState<WidgetConfig[]>(defaultLayout)

    // Load saved layout on mount
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
            try {
                const parsed = JSON.parse(saved)
                setWidgets(parsed)
            } catch (e) {
                console.error('Failed to load saved layout')
            }
        }
    }, [])

    // Save layout when changed
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets))
    }, [widgets])

    // Data Fetching
    const { data: stats, refetch: refreshStats } = useQuery<StatsResponse>({
        queryKey: ["stats"],
        queryFn: async () => (await fetch("/api/v1/telemetry/stats/PROBE-SEC-05?duration=1h")).json(),
        refetchInterval: 10000,
    })

    const { data: probes } = useQuery<Probe[]>({
        queryKey: ["probes"],
        queryFn: async () => (await fetch("/api/v1/probes")).json(),
        refetchInterval: 10000,
    })

    const activeCount = probes?.filter(p => p.status === 'active').length || 0

    const handleLayoutChange = (newLayout: GridLayout.Layout[]) => {
        const updatedWidgets = widgets.map(widget => {
            const layoutItem = newLayout.find(item => item.i === widget.i)
            if (layoutItem) {
                // Apply snapping to grid (align to nearest grid cell)
                const snappedX = Math.max(0, Math.min(12 - layoutItem.w, Math.round(layoutItem.x / 1) * 1))
                const snappedY = Math.max(0, Math.round(layoutItem.y / 1) * 1)

                return {
                    ...widget,
                    x: snappedX,
                    y: snappedY,
                    w: Math.max(widget.minW || 1, Math.min(12, Math.round(layoutItem.w / 1) * 1)),
                    h: Math.max(widget.minH || 1, Math.round(layoutItem.h / 1) * 1)
                }
            }
            return widget
        })
        setWidgets(updatedWidgets)
    }

    const toggleWidgetVisibility = (widgetId: string) => {
        setWidgets(prev => prev.map(w =>
            w.i === widgetId ? { ...w, visible: !w.visible } : w
        ))
    }

    const toggleEditMode = () => {
        setIsEditMode(!isEditMode)
    }

    const resetLayout = () => {
        setWidgets(defaultLayout)
    }

    const getWidgetData = (type: WidgetType) => {
        switch (type) {
            case 'rssi':
                return {
                    title: "Avg Signal",
                    value: stats ? `${stats.avg_rssi.toFixed(1)} dBm` : "--",
                    icon: <Signal className="h-4 w-4 text-emerald-500" />,
                    desc: "Last Hour"
                }
            case 'latency':
                return {
                    title: "Avg Latency",
                    value: stats ? `${stats.avg_latency.toFixed(0)} ms` : "--",
                    icon: <Activity className="h-4 w-4 text-blue-500" />,
                    desc: "Response Time"
                }
            case 'activeProbes':
                return {
                    title: "Active Probes",
                    value: activeCount,
                    icon: <Server className="h-4 w-4 text-purple-500" />,
                    desc: `Total: ${probes?.length || 0}`
                }
            case 'packetLoss':
                return {
                    title: "Packet Loss",
                    value: stats ? `${stats.avg_packet_loss.toFixed(2)}%` : "--",
                    icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
                    desc: "Target: < 1%"
                }
            default:
                return null
        }
    }

    // Show all widgets in edit mode (greyed out if hidden), only visible ones in view mode
    const displayWidgets = isEditMode ? widgets : widgets.filter(w => w.visible)

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={toggleEditMode}
                                    className={isEditMode ? "bg-zinc-800" : ""}
                                >
                                    {isEditMode ? (
                                        <Save className="h-4 w-4" />
                                    ) : (
                                        <Edit className="h-4 w-4" />
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                {isEditMode ? "Save Layout" : "Edit Layout"}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>

                <div className="flex items-center gap-2">
                    {isEditMode && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="outline" size="sm" onClick={resetLayout}>
                                        Reset Layout
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Reset to default layout</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="icon" onClick={() => refreshStats()}>
                                    <RefreshCw className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Refresh Data</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>

            {/* Dashboard Grid */}
            <div className="relative">
                <GridLayout
                    className="layout"
                    layout={displayWidgets.map(w => ({
                        i: w.i,
                        x: w.x,
                        y: w.y,
                        w: w.w,
                        h: w.h,
                        minW: w.minW || 1,
                        minH: w.minH || 1,
                        isDraggable: isEditMode && w.visible,
                        isResizable: isEditMode && w.visible
                    }))}
                    cols={12}
                    rowHeight={100}
                    width={1200}
                    margin={[16, 16]}
                    containerPadding={[0, 0]}
                    isDraggable={isEditMode}
                    isResizable={isEditMode}
                    onLayoutChange={handleLayoutChange}
                    draggableHandle=".drag-handle"
                    compactType="vertical"
                    preventCollision={false}
                    useCSSTransforms={true}
                    snap={[1, 1]}
                    autoSize={true}
                >
                    {displayWidgets.map(widget => {
                        const isVisible = widget.visible
                        const isDraggable = isEditMode && isVisible

                        if (widget.type === 'signalGraph') {
                            return (
                                <div
                                    key={widget.i}
                                    className={`
                    ${isVisible ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-950/30 border-zinc-900/50'} 
                    rounded-lg border overflow-hidden
                    ${!isVisible && isEditMode ? 'opacity-50' : ''}
                  `}
                                >
                                    {isEditMode && (
                                        <div className="drag-handle p-2 cursor-move border-b border-zinc-800 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Grid3X3 className="h-4 w-4 text-zinc-500" />
                                                {!isVisible && <EyeOff className="h-4 w-4 text-zinc-500" />}
                                            </div>
                                            <div className="flex items-center gap-3">
                        <span className="text-xs text-zinc-500">
                          {isDraggable ? "Drag to move • Resize edges" : "Hidden - Enable to move"}
                        </span>
                                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                    <Eye className="h-3 w-3 text-zinc-400" />
                                                    <Switch
                                                        checked={isVisible}
                                                        onCheckedChange={() => toggleWidgetVisibility(widget.i)}
                                                        className="h-3 w-6"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <Card className="h-full border-0 bg-transparent">
                                        <CardHeader>
                                            <CardTitle className={!isVisible ? "text-zinc-600" : ""}>
                                                Signal Stability {!isVisible && "(Hidden)"}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="h-[calc(100%-60px)] flex items-center justify-center text-zinc-500">
                      <span className="text-sm">
                        {isVisible ? "Live Chart Area" : "Widget Hidden"}
                      </span>
                                        </CardContent>
                                    </Card>
                                </div>
                            )
                        }

                        const data = getWidgetData(widget.type)
                        if (!data) return null

                        return (
                            <div
                                key={widget.i}
                                className={`
                  ${isVisible ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-950/30 border-zinc-900/50'} 
                  rounded-lg border overflow-hidden
                  ${!isVisible && isEditMode ? 'opacity-50' : ''}
                `}
                            >
                                {isEditMode && (
                                    <div className="drag-handle p-2 cursor-move border-b border-zinc-800 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Grid3X3 className="h-4 w-4 text-zinc-500" />
                                            {!isVisible && <EyeOff className="h-4 w-4 text-zinc-500" />}
                                        </div>
                                        <div className="flex items-center gap-3">
                      <span className="text-xs text-zinc-500">
                        {isDraggable ? "Drag to move • Resize edges" : "Hidden - Enable to move"}
                      </span>
                                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                <Eye className="h-3 w-3 text-zinc-400" />
                                                <Switch
                                                    checked={isVisible}
                                                    onCheckedChange={() => toggleWidgetVisibility(widget.i)}
                                                    className="h-3 w-6"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <MetricCard
                                    title={data.title + (!isVisible && isEditMode ? " (Hidden)" : "")}
                                    value={isVisible ? data.value : "--"}
                                    icon={isVisible ? data.icon : React.cloneElement(data.icon, {
                                        className: data.icon.props.className + " opacity-50"
                                    })}
                                    desc={isVisible ? data.desc : "Widget is hidden"}
                                    isVisible={isVisible}
                                />
                            </div>
                        )
                    })}
                </GridLayout>
            </div>
        </div>
    )
}

function MetricCard({ title, value, icon, desc, isVisible }: any) {
    return (
        <Card className="h-full border-0 bg-transparent">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className={`text-sm font-medium ${isVisible ? 'text-zinc-200' : 'text-zinc-600'}`}>
                    {title}
                </CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${isVisible ? 'text-white' : 'text-zinc-600'}`}>
                    {value}
                </div>
                <p className={`text-xs ${isVisible ? 'text-zinc-500' : 'text-zinc-700'}`}>
                    {desc}
                </p>
            </CardContent>
        </Card>
    )
}