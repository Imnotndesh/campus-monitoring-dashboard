import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import Layout from "@/components/Layout"
import Dashboard from "@/pages/Dashboard"
import Probes from "@/pages/Probes"
import Settings from "@/pages/Settings"
import Alerts from "@/pages/Alerts"
import Analytics from "@/pages/analytics/Analytics"

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* The Layout component wraps all these routes, providing the fixed Sidebar */}
                <Route element={<Layout />}>

                    {/* Default Page (Dashboard) */}
                    <Route path="/" element={<Dashboard />} />

                    {/* Probe Management (Inventory & Adoption) */}
                    <Route path="/probes" element={<Probes />} />

                    {/* User Preferences (Enable/Disable Widgets) */}
                    <Route path="/settings" element={<Settings />} />

                    {/* Placeholders for future expansion */}
                    <Route
                        path="/alerts"
                        element={
                            <Alerts />
                        }
                    />
                    <Route path="/analytics" element={<Analytics />} />

                    {/* Fallback: Redirect unknown URLs to Dashboard */}
                    <Route path="*" element={<Navigate to="/" replace />} />

                </Route>
            </Routes>
        </BrowserRouter>
    )
}