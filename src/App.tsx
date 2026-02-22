import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import Layout from "@/components/Layout"
import Dashboard from "@/pages/Dashboard"
import Probes from "@/pages/probes/Probes"
import Settings from "@/pages/Settings"
import Alerts from "@/pages/alerts/Alerts"
import Analytics from "@/pages/analytics/Analytics"
import HeatmapPage from "./pages/heatmap/Heatmap.tsx";

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route element={<Layout />}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/probes" element={<Probes />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route
                        path="/alerts"
                        element={
                            <Alerts />
                        }
                    />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/heatmap" element={<HeatmapPage/>} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
            </Routes>
        </BrowserRouter>
    )
}