import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useTheme } from "@/components/ThemeProvider"
import {Bell, Loader2, Moon, PlayCircle, Sun, Trash2, User} from "lucide-react"
import {useMutation} from "@tanstack/react-query";
import {toast} from "sonner";

export default function Settings() {
    const triggerTestMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch("/api/v1/alerts/test", { method: "POST" });
            if (!res.ok) throw new Error("Backend simulation failed");
            return res.json();
        },
        onSuccess: () => toast.success("Test alert dispatched successfully!"),
        onError: (err: Error) => toast.error(err.message)
    });

    const requestNotifications = async () => {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') toast.success("Notifications enabled!");
    };
    const { theme, setTheme, color, setColor } = useTheme()

    const clearData = () => {
        if (confirm("Are you sure? This will reset all dashboard preferences and cache.")) {
            localStorage.clear()
            window.location.reload()
        }
    }

    return (
        <div className="max-w-3xl space-y-6 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
                <p className="text-muted-foreground">Manage your preferences and application data.</p>
            </div>

            <Accordion type="single" collapsible defaultValue="appearance" className="w-full">

                {/* --- Appearance Section --- */}
                <AccordionItem value="appearance" className="border-border">
                    <AccordionTrigger className="text-lg font-semibold">Appearance</AccordionTrigger>
                    <AccordionContent className="p-1">
                        <Card className="border-0 shadow-none bg-transparent">
                            <CardContent className="space-y-6 pt-4 px-0">

                                {/* Theme Switcher */}
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <Label className="text-base">Theme Mode</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Switch between light and dark mode.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Sun className="h-4 w-4 text-muted-foreground" />
                                        <Switch
                                            checked={theme === 'dark'}
                                            onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                                        />
                                        <Moon className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                </div>

                                {/* Color Picker */}
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <Label className="text-base">Accent Color</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Select the primary color for buttons and highlights.
                                        </p>
                                    </div>
                                    <div className="flex gap-3">
                                        {['zinc', 'blue', 'emerald', 'orange', 'violet'].map((c) => (
                                            <button
                                                key={c}
                                                onClick={() => setColor(c as any)}
                                                className={`h-8 w-8 rounded-full border-2 flex items-center justify-center transition-all ${
                                                    color === c ? "border-foreground scale-110" : "border-transparent opacity-70 hover:opacity-100"
                                                }`}
                                                style={{ backgroundColor: getColorHex(c) }}
                                            >
                                                {color === c && <div className="h-2 w-2 rounded-full bg-white/50" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                            </CardContent>
                        </Card>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="notifications" className="border-border">
                    <AccordionTrigger className="text-lg font-semibold">Notifications</AccordionTrigger>
                    <AccordionContent className="p-1 space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="space-y-0.5">
                                <Label className="text-base">System Notifications</Label>
                                <p className="text-sm text-muted-foreground">Receive OS-level alerts even when the tab is closed.</p>
                            </div>
                            <Button variant="outline" onClick={requestNotifications}>
                                <Bell className="mr-2 h-4 w-4" /> Grant Permission
                            </Button>
                        </div>

                        <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                            <div className="space-y-0.5">
                                <Label className="text-base">Diagnostic Tools</Label>
                                <p className="text-sm text-muted-foreground">Manually trigger a pipeline test for the Johnston University probe.</p>
                            </div>
                            <Button
                                variant="secondary"
                                disabled={triggerTestMutation.isPending}
                                onClick={() => triggerTestMutation.mutate()}
                            >
                                {triggerTestMutation.isPending ? <Loader2 className="animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                                Simulate Alert
                            </Button>
                        </div>
                    </AccordionContent>
                </AccordionItem>


                {/* --- Data Section --- */}
                <AccordionItem value="data" className="border-border">
                    <AccordionTrigger className="text-lg font-semibold">Data & Storage</AccordionTrigger>
                    <AccordionContent className="p-1">
                        <Card className="border-0 shadow-none bg-transparent">
                            <CardContent className="pt-4 px-0 space-y-4">
                                <div className="flex items-center justify-between p-4 border rounded-lg bg-destructive/10 border-destructive/20">
                                    <div className="space-y-1">
                                        <Label className="text-base text-destructive">Clear Application Cache</Label>
                                        <p className="text-sm text-muted-foreground">
                                            This will remove all saved widget settings and cached API responses.
                                        </p>
                                    </div>
                                    <Button variant="destructive" size="sm" onClick={clearData}>
                                        <Trash2 className="mr-2 h-4 w-4" /> Clear Cache
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </AccordionContent>
                </AccordionItem>

                {/* --- Profile Section (Placeholder) --- */}
                <AccordionItem value="profile" className="border-border">
                    <AccordionTrigger className="text-lg font-semibold">Profile</AccordionTrigger>
                    <AccordionContent className="p-1">
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
                            <User className="h-8 w-8 opacity-50" />
                            <p>Profile management coming soon.</p>
                        </div>
                    </AccordionContent>
                </AccordionItem>

            </Accordion>
        </div>
    )
}

// Helper to visualize colors in the picker
function getColorHex(name: string) {
    switch(name) {
        case 'zinc': return '#18181b'; // zinc-950
        case 'blue': return '#3b82f6'; // blue-500
        case 'emerald': return '#10b981'; // emerald-500
        case 'orange': return '#f97316'; // orange-500
        case 'violet': return '#8b5cf6'; // violet-500
        default: return '#52525b';
    }
}