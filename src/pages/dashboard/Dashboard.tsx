import React, { useState, useRef, useCallback, useEffect } from "react"
import { Responsive } from "react-grid-layout"
import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"

import {
    Edit3, Save, RotateCcw, Plus, X, Settings2, GripVertical,
    ChevronDown, ChevronRight, Search, Eye, Layers, AlertCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger
} from "@/components/ui/sheet"
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription,
    AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from "@/components/ui/tooltip"
import { Switch } from "@/components/ui/switch"

import {
    WIDGET_REGISTRY, WIDGET_MAP, CATEGORY_LABELS, CATEGORY_COLORS,
    type WidgetCategory, type WidgetDef,
} from "./widgetRegistry"
import { useDashboardLayout, type PlacedWidget } from "./useDashboardLayout"


// ─── Widget Config Panel ──────────────────────────────────────────────────────

function WidgetConfigPanel({
                               widget,
                               def,
                               onUpdate,
                               onClose,
                               onRemove,
                           }: {
    widget: PlacedWidget
    def: WidgetDef
    onUpdate: (props: Record<string, any>) => void
    onClose: () => void
    onRemove: () => void
}) {
    const [localProps, setLocalProps] = useState({ ...widget.props })
    const [confirmRemove, setConfirmRemove] = useState(false)

    const set = (key: string, value: any) =>
        setLocalProps(prev => ({ ...prev, [key]: value }))

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b flex items-center justify-between">
                <div>
                    <div className="font-semibold text-sm">{def.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{def.description}</div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                    <X className="h-4 w-4" />
                </Button>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                    {/* Size info */}
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div className="p-2 bg-muted/50 rounded text-center">
                            <div className="font-medium">{widget.w} × {widget.h}</div>
                            <div>Grid size (cols × rows)</div>
                        </div>
                        <div className="p-2 bg-muted/50 rounded text-center">
                            <div className="font-medium">{widget.x}, {widget.y}</div>
                            <div>Position (col, row)</div>
                        </div>
                    </div>

                    {/* Configurable props */}
                    {def.configurableProps && def.configurableProps.length > 0 ? (
                        <div className="space-y-3">
                            <div className="text-xs font-semibold uppercase text-muted-foreground">Configuration</div>
                            {def.configurableProps.map(propDef => (
                                <div key={propDef.key} className="space-y-1.5">
                                    <Label className="text-xs">{propDef.label}</Label>
                                    {propDef.type === "select" ? (
                                        <Select
                                            value={String(localProps[propDef.key] ?? propDef.default ?? "")}
                                            onValueChange={v => set(propDef.key, v)}
                                        >
                                            <SelectTrigger className="h-8 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {propDef.options?.map(o => (
                                                    <SelectItem key={o.value} value={o.value} className="text-xs">
                                                        {o.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : propDef.type === "boolean" ? (
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={localProps[propDef.key] !== false}
                                                onCheckedChange={v => set(propDef.key, v)}
                                            />
                                            <span className="text-xs text-muted-foreground">
                                                {localProps[propDef.key] !== false ? "Enabled" : "Disabled"}
                                            </span>
                                        </div>
                                    ) : propDef.type === "number" ? (
                                        <Input
                                            type="number"
                                            className="h-8 text-xs"
                                            value={localProps[propDef.key] ?? propDef.default ?? ""}
                                            onChange={e => set(propDef.key, Number(e.target.value))}
                                        />
                                    ) : (
                                        <Input
                                            className="h-8 text-xs font-mono"
                                            placeholder={String(propDef.default ?? "")}
                                            value={localProps[propDef.key] ?? propDef.default ?? ""}
                                            onChange={e => set(propDef.key, e.target.value)}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-xs text-muted-foreground text-center py-4 border border-dashed rounded">
                            No configuration options for this widget
                        </div>
                    )}
                </div>
            </ScrollArea>

            <div className="p-4 border-t space-y-2">
                <Button
                    size="sm" className="w-full gap-2"
                    onClick={() => { onUpdate(localProps); onClose() }}
                >
                    <Save className="h-3.5 w-3.5" /> Apply Changes
                </Button>
                <Button
                    size="sm" variant="destructive" className="w-full gap-2"
                    onClick={() => setConfirmRemove(true)}
                >
                    <X className="h-3.5 w-3.5" /> Remove Widget
                </Button>
            </div>

            <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove {def.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This widget will be removed from your dashboard. You can add it back from the shelf anytime.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { onRemove(); onClose() }}>Remove</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

// ─── Widget Shelf ─────────────────────────────────────────────────────────────

function WidgetShelf({ onAdd }: { onAdd: (widgetId: string) => void }) {
    const [search, setSearch] = useState("")
    const [expandedCats, setExpandedCats] = useState<Set<WidgetCategory>>(
        new Set(["analytics", "alerts", "probes", "fleet"])
    )

    const toggleCat = (c: WidgetCategory) =>
        setExpandedCats(prev => {
            const next = new Set(prev)
            next.has(c) ? next.delete(c) : next.add(c)
            return next
        })

    const filtered = WIDGET_REGISTRY.filter(w =>
        !search || w.name.toLowerCase().includes(search.toLowerCase()) ||
        w.description.toLowerCase().includes(search.toLowerCase())
    )

    const byCategory = (cat: WidgetCategory) => filtered.filter(w => w.category === cat)

    const categories: WidgetCategory[] = ["analytics", "alerts", "probes", "fleet"]

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search widgets..."
                        className="pl-8 h-8 text-xs"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-3 space-y-1">
                    {categories.map(cat => {
                        const items = byCategory(cat)
                        if (items.length === 0) return null
                        const isOpen = expandedCats.has(cat)

                        return (
                            <div key={cat}>
                                <button
                                    className="w-full flex items-center justify-between p-2 rounded hover:bg-muted/50 transition-colors"
                                    onClick={() => toggleCat(cat)}
                                >
                                    <div className="flex items-center gap-2">
                                        {isOpen
                                            ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                            : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                        }
                                        <span className="text-xs font-semibold">{CATEGORY_LABELS[cat]}</span>
                                    </div>
                                    <Badge variant="outline" className={`text-[10px] h-4 ${CATEGORY_COLORS[cat]}`}>
                                        {items.length}
                                    </Badge>
                                </button>

                                {isOpen && (
                                    <div className="ml-2 mt-1 space-y-1 pb-2">
                                        {items.map(def => (
                                            <div
                                                key={def.id}
                                                className="group flex items-center gap-3 p-2.5 rounded-lg border border-transparent hover:border-border hover:bg-muted/40 cursor-pointer transition-all"
                                                onClick={() => onAdd(def.id)}
                                            >
                                                <div className={`h-7 w-7 rounded-md flex items-center justify-center flex-shrink-0 ${CATEGORY_COLORS[cat]} border`}>
                                                    {def.icon}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-xs font-medium truncate">{def.name}</div>
                                                    <div className="text-[10px] text-muted-foreground truncate">{def.description}</div>
                                                </div>
                                                <Plus className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 flex-shrink-0 transition-opacity" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </ScrollArea>

            <div className="p-3 border-t">
                <p className="text-[10px] text-muted-foreground text-center">
                    Click any widget to add it to the canvas
                </p>
            </div>
        </div>
    )
}

// ─── Edit Mode Overlay Bar ────────────────────────────────────────────────────

function EditModeBar({
                         onDone,
                         onReset,
                         widgetCount,
                     }: {
    onDone: () => void
    onReset: () => void
    widgetCount: number
}) {
    const [confirmReset, setConfirmReset] = useState(false)

    return (
        <>
            <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm font-medium text-primary">Edit Mode</span>
                <Separator orientation="vertical" className="h-4" />
                <span className="text-xs text-muted-foreground">
                    Drag to reposition · Resize from edges · Click ⚙ to configure
                </span>
                <div className="flex-1" />
                <Badge variant="outline" className="text-xs">{widgetCount} widgets</Badge>
                <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={() => setConfirmReset(true)}>
                    <RotateCcw className="h-3.5 w-3.5" /> Reset
                </Button>
                <Button size="sm" className="h-7 gap-1.5 text-xs" onClick={onDone}>
                    <Save className="h-3.5 w-3.5" /> Done
                </Button>
            </div>

            <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Reset dashboard?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will restore the default layout and remove all your customizations.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={onReset}>Reset to Default</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
    const { widgets, addWidget, removeWidget, updateWidgetProps, updateLayout, resetToDefault } = useDashboardLayout()
    const [isEditMode, setIsEditMode] = useState(false)
    const [shelfOpen, setShelfOpen] = useState(false)
    const [configuringId, setConfiguringId] = useState<string | null>(null)

    // Measure container width for Responsive grid (replaces WidthProvider)
    const containerRef = useRef<HTMLDivElement>(null)
    const [containerWidth, setContainerWidth] = useState(1200)

    // Block onLayoutChange from saving during the initial mount + width-settle phase.
    // react-grid-layout fires onLayoutChange immediately on render and again when
    // the measured width changes breakpoints — both of which would overwrite the
    // persisted layout before the user has touched anything.
    const layoutReady = useRef(false)
    const layoutReadyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        const el = containerRef.current
        if (!el) return
        const ro = new ResizeObserver(entries => {
            const width = entries[0]?.contentRect.width
            if (!width) return
            setContainerWidth(width)
            // Each time width changes (breakpoint settle), reset the guard window
            layoutReady.current = false
            if (layoutReadyTimer.current) clearTimeout(layoutReadyTimer.current)
            layoutReadyTimer.current = setTimeout(() => {
                layoutReady.current = true
            }, 300)
        })
        ro.observe(el)
        setContainerWidth(el.offsetWidth)
        // Allow saves after initial mount settles
        layoutReadyTimer.current = setTimeout(() => {
            layoutReady.current = true
        }, 300)
        return () => {
            ro.disconnect()
            if (layoutReadyTimer.current) clearTimeout(layoutReadyTimer.current)
        }
    }, [])

    const configuringWidget = configuringId ? widgets.find(w => w.instanceId === configuringId) : null
    const configuringDef = configuringWidget ? WIDGET_MAP[configuringWidget.widgetId] : null

    const handleAddWidget = useCallback((widgetId: string) => {
        const def = WIDGET_MAP[widgetId]
        if (!def) return
        // Use registry defaults for size
        addWidget(widgetId)
        setShelfOpen(false)
    }, [addWidget])

    // Build grid layout items for react-grid-layout
    const gridLayout = widgets.map(w => {
        const def = WIDGET_MAP[w.widgetId]
        return {
            i: w.instanceId,
            x: w.x, y: w.y,
            w: w.w, h: w.h,
            minW: def?.minW ?? 2,
            minH: def?.minH ?? 2,
        }
    })

    return (
        <TooltipProvider>
            <div className="space-y-4 animate-in fade-in duration-500 pb-16">

                {/* ── Header ── */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                        <p className="text-muted-foreground text-sm">
                            Your personalized monitoring canvas · {widgets.length} widgets · auto-saved
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {!isEditMode && (
                            <>
                                {/* Widget shelf */}
                                <Sheet open={shelfOpen} onOpenChange={setShelfOpen}>
                                    <SheetTrigger asChild>
                                        <Button variant="outline" size="sm" className="gap-2">
                                            <Plus className="h-4 w-4" /> Add Widget
                                        </Button>
                                    </SheetTrigger>
                                    <SheetContent side="right" className="w-[320px] p-0 flex flex-col">
                                        <SheetHeader className="p-4 border-b">
                                            <SheetTitle className="flex items-center gap-2">
                                                <Layers className="h-4 w-4" /> Widget Shelf
                                            </SheetTitle>
                                        </SheetHeader>
                                        <div className="flex-1 overflow-hidden">
                                            <WidgetShelf onAdd={handleAddWidget} />
                                        </div>
                                    </SheetContent>
                                </Sheet>

                                <Button
                                    variant="outline" size="sm" className="gap-2"
                                    onClick={() => setIsEditMode(true)}
                                >
                                    <Edit3 className="h-4 w-4" /> Arrange
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {/* ── Edit Mode Bar ── */}
                {isEditMode && (
                    <EditModeBar
                        onDone={() => setIsEditMode(false)}
                        onReset={() => { resetToDefault(); setIsEditMode(false) }}
                        widgetCount={widgets.length}
                    />
                )}

                {/* ── Empty State ── */}
                {widgets.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-[400px] border border-dashed rounded-xl text-muted-foreground space-y-3">
                        <Layers className="h-10 w-10 opacity-20" />
                        <p className="text-sm font-medium">Your dashboard is empty</p>
                        <p className="text-xs">Open the Widget Shelf to add your first widget</p>
                        <Button size="sm" variant="outline" className="gap-2 mt-2" onClick={() => setShelfOpen(true)}>
                            <Plus className="h-4 w-4" /> Add Widget
                        </Button>
                    </div>
                )}

                {/* ── Config Side Panel ── */}
                {configuringWidget && configuringDef && (
                    <div className="fixed right-4 top-20 z-50 w-[280px] h-[calc(100vh-6rem)] bg-background border rounded-xl shadow-xl flex flex-col overflow-hidden">
                        <WidgetConfigPanel
                            widget={configuringWidget}
                            def={configuringDef}
                            onUpdate={(props) => updateWidgetProps(configuringWidget.instanceId, props)}
                            onClose={() => setConfiguringId(null)}
                            onRemove={() => {
                                removeWidget(configuringWidget.instanceId)
                                setConfiguringId(null)
                            }}
                        />
                    </div>
                )}

                {/* ── Grid Canvas ── */}
                {widgets.length > 0 && (
                    <div
                        ref={containerRef}
                        className={`relative transition-all duration-300 ${isEditMode ? "rounded-xl ring-2 ring-primary/20 ring-offset-2" : ""}`}
                    >
                        {/* Edit grid background pattern */}
                        {isEditMode && (
                            <div
                                className="absolute inset-0 rounded-xl pointer-events-none opacity-30"
                                style={{
                                    backgroundImage: "radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)",
                                    backgroundSize: "40px 40px",
                                }}
                            />
                        )}

                        <Responsive
                            className="layout"
                            layouts={{ lg: gridLayout }}
                            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                            width={containerWidth}
                            rowHeight={100}
                            margin={[12, 12]}
                            containerPadding={[0, 0]}
                            isDraggable={isEditMode}
                            isResizable={isEditMode}
                            draggableHandle=".drag-handle"
                            compactType="vertical"
                            onLayoutChange={(layout) => {
                                if (layoutReady.current) updateLayout(layout)
                            }}
                            useCSSTransforms
                        >
                            {widgets.map(widget => {
                                const def = WIDGET_MAP[widget.widgetId]
                                if (!def) return null
                                const isConfiguring = configuringId === widget.instanceId

                                return (
                                    <div
                                        key={widget.instanceId}
                                        className={`group relative flex flex-col overflow-hidden rounded-xl transition-all duration-200 ${
                                            isEditMode
                                                ? "ring-2 ring-border hover:ring-primary/50 shadow-sm"
                                                : ""
                                        } ${isConfiguring ? "ring-2 ring-primary" : ""}`}
                                    >
                                        {/* ── Edit Mode Overlay Bar ── */}
                                        {isEditMode && (
                                            <div className="drag-handle absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3 py-1.5 bg-background/90 backdrop-blur-sm border-b cursor-move select-none">
                                                <div className="flex items-center gap-2">
                                                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-[11px] font-medium truncate max-w-[120px]">{def.name}</span>
                                                    <Badge variant="outline" className={`text-[9px] h-4 hidden sm:flex ${CATEGORY_COLORS[def.category]}`}>
                                                        {CATEGORY_LABELS[def.category]}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost" size="icon"
                                                                className="h-6 w-6"
                                                                onClick={() => setConfiguringId(
                                                                    isConfiguring ? null : widget.instanceId
                                                                )}
                                                            >
                                                                <Settings2 className={`h-3.5 w-3.5 ${isConfiguring ? "text-primary" : ""}`} />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Configure</TooltipContent>
                                                    </Tooltip>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost" size="icon"
                                                                className="h-6 w-6 text-destructive hover:bg-destructive/10"
                                                                onClick={() => removeWidget(widget.instanceId)}
                                                            >
                                                                <X className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Remove</TooltipContent>
                                                    </Tooltip>
                                                </div>
                                            </div>
                                        )}

                                        {/* ── Widget Content ── */}
                                        <div
                                            className={`flex-1 overflow-auto ${isEditMode ? "mt-[34px]" : ""}`}
                                            style={{ pointerEvents: isEditMode ? "none" : "auto" }}
                                        >
                                            {(() => {
                                                try {
                                                    return def.render(widget.props)
                                                } catch (e) {
                                                    return (
                                                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
                                                            <AlertCircle className="h-6 w-6 opacity-40 mb-1" />
                                                            <span className="text-xs">Widget error</span>
                                                        </div>
                                                    )
                                                }
                                            })()}
                                        </div>

                                        {/* ── View Mode Quick-configure hint ── */}
                                        {!isEditMode && def.configurableProps && def.configurableProps.length > 0 && (
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="secondary" size="icon"
                                                            className="h-6 w-6 shadow"
                                                            onClick={() => {
                                                                setIsEditMode(true)
                                                                setConfiguringId(widget.instanceId)
                                                            }}
                                                        >
                                                            <Settings2 className="h-3 w-3" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Configure widget</TooltipContent>
                                                </Tooltip>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </Responsive>
                    </div>
                )}

                {/* ── Footer status ── */}
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-2">
                    <Eye className="h-3 w-3" />
                    <span>Layout auto-saved to browser · {widgets.length} widgets active</span>
                    {isEditMode && (
                        <>
                            <Separator orientation="vertical" className="h-3" />
                            <span className="text-primary">Editing — click Done to lock</span>
                        </>
                    )}
                </div>
            </div>
        </TooltipProvider>
    )
}