import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "@/lib/auth"
import ProtectedRoute from "@/components/ProtectedRoute"
import Layout from "./components/Layout"
import Dashboard from "./pages/dashboard/Dashboard"
import Probes from "./pages/probes/Probes"
import Settings from "./pages/Settings"
import Alerts from "./pages/alerts/Alerts"
import Analytics from "./pages/analytics/Analytics"
import HeatmapPage from "./pages/heatmap/Heatmap.tsx"
import Fleet from "./pages/fleet/Fleet.tsx"
import LoginPage from "./pages/auth/Login.tsx"
import RegisterPage from "./pages/auth/Register.tsx"
import ServerSetup from "./pages/setup/ServerSetup.tsx";
import OAuthCallback from "./pages/auth/OAuthCallback.tsx";

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>  {/* Provide auth context to entire app */}
                <Routes>
                    {/* Public routes – no layout */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/setup" element={<ServerSetup />} />
                    <Route path="/oauth/callback" element={<OAuthCallback />} />

                    {/* Protected routes – all require authentication */}
                    <Route element={<ProtectedRoute />}>
                        <Route element={<Layout />}>  {/* Layout wraps all authenticated pages */}
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/alerts" element={<Alerts />} />
                            <Route path="/analytics" element={<Analytics />} />
                            <Route path="/heatmap" element={<HeatmapPage />} />
                            <Route path="/settings" element={<Settings />} />
                        </Route>
                    </Route>

                    {/* Admin-only route – requires authentication AND admin role */}
                    <Route element={<ProtectedRoute adminOnly />}>
                        <Route element={<Layout />}>
                            <Route path="/probes" element={<Probes />} />
                            <Route path="/fleet" element={<Fleet />} />
                        </Route>
                    </Route>

                    {/* Fallback redirect */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    )
}