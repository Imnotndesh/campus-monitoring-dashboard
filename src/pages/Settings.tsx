import { useState } from "react";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Card, CardContent} from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useTheme } from "@/components/ThemeProvider"
import { useAuth } from "@/lib/auth"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { QRCodeCanvas } from "qrcode.react"
import {
    Bell,
    Loader2,
    Moon,
    PlayCircle,
    Sun,
    Trash2,
    User,
    Shield,
    Key,
    LogOut,
    AlertTriangle
} from "lucide-react"
import {apiFetch} from "../lib/api.ts";

export default function Settings() {
    const { user, logout } = useAuth();
    const queryClient = useQueryClient();

    // TOTP state
    const [totpSecret, setTotpSecret] = useState("");
    const [totpURI, setTotpURI] = useState("");
    const [totpCode, setTotpCode] = useState("");

    // Mutations
    const triggerTestMutation = useMutation({
        mutationFn: async () => {
            const res = await apiFetch("/api/v1/alerts/test", { method: "POST" });
            if (!res.ok) throw new Error("Backend simulation failed");
            return res.json();
        },
        onSuccess: () => toast.success("Test alert dispatched successfully!"),
        onError: (err: Error) => toast.error(err.message)
    });

    // Enable TOTP: request secret and QR
    const enableTotpMutation = useMutation({
        mutationFn: async () => {
            const res = await apiFetch("/api/v1/auth/2fa/enable", {
                method: "POST",
                headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
            });
            if (!res.ok) throw new Error("Failed to enable 2FA");
            return res.json();
        },
        onSuccess: (data) => {
            setTotpSecret(data.secret);
            setTotpURI(data.uri);
        },
        onError: (err) => toast.error(err.message),
    });

    // Activate TOTP after verifying code
    const activateTotpMutation = useMutation({
        mutationFn: async (code: string) => {
            const res = await apiFetch("/api/v1/auth/2fa/activate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem('access_token')}`,
                },
                body: JSON.stringify({ code }),
            });
            if (!res.ok) throw new Error("Invalid code");
        },
        onSuccess: () => {
            toast.success("2FA enabled successfully");
            setTotpSecret("");
            setTotpURI("");
            setTotpCode("");
            queryClient.invalidateQueries({ queryKey: ['currentUser'] });
        },
        onError: (err) => toast.error(err.message),
    });

    // Disable TOTP
    const disableTotpMutation = useMutation({
        mutationFn: async () => {
            const res = await apiFetch("/api/v1/auth/2fa/disable", {
                method: "POST",
                headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
            });
            if (!res.ok) throw new Error("Failed to disable 2FA");
        },
        onSuccess: () => {
            toast.success("2FA disabled");
            queryClient.invalidateQueries({ queryKey: ['currentUser'] });
        },
        onError: (err) => toast.error(err.message),
    });

    // Delete account
    const deleteAccountMutation = useMutation({
        mutationFn: async () => {
            const res = await apiFetch("/api/v1/users/me", {
                method: "DELETE",
                headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
            });
            if (!res.ok) throw new Error("Failed to delete account");
        },
        onSuccess: async () => {
            toast.success("Account deleted");
            await logout();
            window.location.href = "/login";
        },
        onError: (err) => toast.error(err.message),
    });

    const requestNotifications = async () => {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') toast.success("Notifications enabled!");
    };
    const { theme, setTheme, color, setColor } = useTheme();

    const clearData = () => {
        if (confirm("Are you sure? This will reset all dashboard preferences and cache.")) {
            localStorage.clear();
            window.location.reload();
        }
    };

    const handleActivate = () => {
        if (!totpCode) return;
        activateTotpMutation.mutate(totpCode);
    };

    const handleDisable = () => {
        if (confirm("Disabling 2FA will make your account less secure. Continue?")) {
            disableTotpMutation.mutate();
        }
    };

    const handleDeleteAccount = () => {
        if (confirm("Are you absolutely sure? This will permanently delete your account and all associated data. This action cannot be undone.")) {
            deleteAccountMutation.mutate();
        }
    };

    return (
        <div className="max-w-3xl space-y-6 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
                <p className="text-muted-foreground">Manage your preferences and application data.</p>
            </div>

            <Accordion type="single" collapsible defaultValue="appearance" className="w-full">
                {/* --- Appearance Section (unchanged) --- */}
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

                {/* --- Notifications Section (unchanged) --- */}
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

                {/* --- Two-Factor Authentication --- */}
                <AccordionItem value="2fa" className="border-border">
                    <AccordionTrigger className="text-lg font-semibold">Two-Factor Authentication</AccordionTrigger>
                    <AccordionContent className="p-1">
                        <div className="space-y-4 pt-2">
                            {user?.twoFAEnabled ? (
                                // 2FA is enabled – show disable button
                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="space-y-1">
                                        <Label className="text-base">2FA is enabled</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Your account is protected by two-factor authentication.
                                        </p>
                                    </div>
                                    <Button
                                        variant="destructive"
                                        onClick={handleDisable}
                                        disabled={disableTotpMutation.isPending}
                                    >
                                        {disableTotpMutation.isPending ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Shield className="mr-2 h-4 w-4" />
                                        )}
                                        Disable 2FA
                                    </Button>
                                </div>
                            ) : (
                                // 2FA is disabled – show setup flow
                                <div className="space-y-4">
                                    {!totpSecret ? (
                                        // Initial state: button to enable
                                        <div className="flex items-center justify-between p-4 border rounded-lg">
                                            <div className="space-y-1">
                                                <Label className="text-base">Enhance account security</Label>
                                                <p className="text-sm text-muted-foreground">
                                                    Add an extra layer of protection by enabling two-factor authentication.
                                                </p>
                                            </div>
                                            <Button
                                                onClick={() => enableTotpMutation.mutate()}
                                                disabled={enableTotpMutation.isPending}
                                            >
                                                {enableTotpMutation.isPending ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Key className="mr-2 h-4 w-4" />
                                                )}
                                                Enable 2FA
                                            </Button>
                                        </div>
                                    ) : (
                                        // Setup step: show QR and code input
                                        <div className="p-4 border rounded-lg space-y-4">
                                            <p className="text-sm font-medium">Scan this QR code with your authenticator app</p>
                                            <div className="flex justify-center p-4 bg-white rounded-lg">
                                                <QRCodeCanvas value={totpURI} size={180} />
                                            </div>
                                            <p className="text-xs text-muted-foreground break-all">
                                                Or enter secret manually: <code className="bg-muted p-1 rounded">{totpSecret}</code>
                                            </p>
                                            <div className="flex gap-2">
                                                <Input
                                                    placeholder="Enter 6-digit code"
                                                    value={totpCode}
                                                    onChange={(e) => setTotpCode(e.target.value)}
                                                    maxLength={6}
                                                    className="font-mono"
                                                />
                                                <Button
                                                    onClick={handleActivate}
                                                    disabled={totpCode.length !== 6 || activateTotpMutation.isPending}
                                                >
                                                    {activateTotpMutation.isPending && (
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    )}
                                                    Activate
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* --- Account Actions --- */}
                <AccordionItem value="account" className="border-border">
                    <AccordionTrigger className="text-lg font-semibold">Account</AccordionTrigger>
                    <AccordionContent className="p-1 space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="space-y-1">
                                <Label className="text-base">Logout</Label>
                                <p className="text-sm text-muted-foreground">
                                    Sign out from your account on this device.
                                </p>
                            </div>
                            <Button variant="outline" onClick={logout}>
                                <LogOut className="mr-2 h-4 w-4" />
                                Logout
                            </Button>
                        </div>

                        <div className="flex items-center justify-between p-4 border rounded-lg bg-destructive/10 border-destructive/20">
                            <div className="space-y-1">
                                <Label className="text-base text-destructive">Delete Account</Label>
                                <p className="text-sm text-muted-foreground">
                                    Permanently delete your account and all associated data. This action cannot be undone.
                                </p>
                            </div>
                            <Button
                                variant="destructive"
                                onClick={handleDeleteAccount}
                                disabled={deleteAccountMutation.isPending}
                            >
                                {deleteAccountMutation.isPending ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Trash2 className="mr-2 h-4 w-4" />
                                )}
                                Delete
                            </Button>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* --- Data Section (unchanged) --- */}
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
            </Accordion>
        </div>
    );
}

// Helper to visualize colors in the picker
function getColorHex(name: string) {
    switch(name) {
        case 'zinc': return '#18181b';
        case 'blue': return '#3b82f6';
        case 'emerald': return '#10b981';
        case 'orange': return '#f97316';
        case 'violet': return '#8b5cf6';
        default: return '#52525b';
    }
}