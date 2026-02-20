import { useState } from "react"
import { Outlet, NavLink } from "react-router-dom"
import {
    LayoutDashboard,
    Radio,
    Settings,
    AlertCircle,
    Network,
    Menu,
    ChevronLeft
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { BarChart3 } from "lucide-react"
import {useAlertsViewModel} from "../pages/alerts/useAlertsViewModel.ts";

export default function Layout() {
    const [isCollapsed, setIsCollapsed] = useState(false)
    const { unreadCount } = useAlertsViewModel();
    return (
        <div className="flex min-h-screen bg-background text-foreground font-sans transition-colors duration-300">

            {/* --- Sidebar --- */}
            <aside
                className={cn(
                    "border-r bg-muted/30 flex-shrink-0 fixed h-full flex flex-col transition-all duration-300 ease-in-out z-50",
                    isCollapsed ? "w-[70px]" : "w-64"
                )}
            >
                {/* Header / Toggle */}
                <div className="h-16 flex items-center px-4 border-b">
                    {!isCollapsed && (
                        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2 animate-in fade-in duration-300">
                            <Network className="text-primary h-6 w-6" />
                            <span>Monitor</span>
                        </h1>
                    )}

                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn("ml-auto", isCollapsed && "mx-auto")}
                        onClick={() => setIsCollapsed(!isCollapsed)}
                    >
                        {isCollapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
                    </Button>
                </div>

                {/* Navigation */}
                <nav className="p-2 space-y-2 flex-1">
                    <NavItem to="/" icon={<LayoutDashboard size={20} />} label="Dashboard" collapsed={isCollapsed} />
                    <NavItem to="/probes" icon={<Radio size={20} />} label="Probes" collapsed={isCollapsed} />
                    <NavItem
                        to="/alerts"
                        icon={<AlertCircle className="h-5 w-5" />}
                        label="Alerts"
                        collapsed={isCollapsed}
                        badgeCount={unreadCount}
                    />
                    <NavItem to="/analytics" icon={<BarChart3 size={20} />} label="Analytics" collapsed={isCollapsed} />
                </nav>

                {/* Bottom Actions */}
                <div className="p-2 border-t mt-auto">
                    <NavItem to="/settings" icon={<Settings size={20} />} label="Settings" collapsed={isCollapsed} />
                </div>
            </aside>

            {/* --- Main Content Area --- */}
            <main
                className={cn(
                    "flex-1 transition-all duration-300 ease-in-out min-h-screen",
                    isCollapsed ? "ml-[70px]" : "ml-64"
                )}
                // Clicking the main content collapses the sidebar if it is open (optional behavior)
                onClick={() => !isCollapsed && setIsCollapsed(true)}
            >
                <div className="p-8 max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    )
}

function NavItem({ to, icon, label, collapsed }: { to: string; icon: any; label: string; collapsed: boolean }) {
    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md transition-all group overflow-hidden whitespace-nowrap",
                    isActive
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted",
                    collapsed ? "justify-center px-2" : ""
                )
            }
            title={collapsed ? label : undefined}
        >
            <span className="flex-shrink-0">{icon}</span>
            <span className={cn(
                "text-sm font-medium transition-all duration-300",
                collapsed ? "opacity-0 w-0 translate-x-[-10px]" : "opacity-100 w-auto translate-x-0"
            )}>
        {label}
      </span>
        </NavLink>
    )
}