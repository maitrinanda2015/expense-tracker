import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from './States';

/** Only signed-in users; others are sent to /login and returned afterwards. */
export function ProtectedRoute() {
  const { isAuthenticated, status } = useAuth();
  const location = useLocation();

  if (status === 'checking') return <div className="page-center"><Spinner label="Checking your session…" /></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

/** Login / register: signed-in users go straight to the dashboard. */
export function PublicOnlyRoute() {
  const { isAuthenticated, status } = useAuth();
  if (status === 'checking') return <div className="page-center"><Spinner /></div>;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <Outlet />;
}
