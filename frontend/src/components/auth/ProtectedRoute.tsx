import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-10 text-sm text-ink-soft">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
