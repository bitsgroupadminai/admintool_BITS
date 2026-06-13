import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { GlobalLoader } from '@/components/ui/GlobalLoader';

export function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return <GlobalLoader label="Preparing your workspace..." variant="full" size="lg" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    const redirect = user.role === 'admin' ? '/admin/dashboard' : '/staff/dashboard';
    return <Navigate to={redirect} replace />;
  }

  return children;
}

export function AdminSetupRoute({ children }) {
  const { user, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return <GlobalLoader label="Checking setup..." variant="full" size="lg" />;
  }

  if (user?.role === 'admin' && !user?.institute?.setupCompleted) {
    return children;
  }

  if (user?.role === 'admin' && user?.institute?.setupCompleted) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Navigate to="/login" state={{ from: location }} replace />;
}

export function RequireSetupComplete({ children }) {
  const { user } = useAuthStore();

  if (user?.role === 'admin' && !user?.institute?.setupCompleted) {
    return <Navigate to="/setup/institute" replace />;
  }

  return children;
}
