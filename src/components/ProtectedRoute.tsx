import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

export default function ProtectedRoute({ adminOnly = false }: { adminOnly?: boolean }) {
    const { user, isLoading } = useAuth();

    if (isLoading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;

    if (!user) return <Navigate to="/login" replace />;

    if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />;

    return <Outlet />;
}