import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';

function LoadingScreen({ label }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-muted">
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return <LoadingScreen label="Checking your session..." />;
  }

  if (!isAuthenticated || user?.role !== 'student') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  return children;
}

export function GuestRoute({ children }) {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) {
    return <LoadingScreen label="Checking your session..." />;
  }

  if (isAuthenticated && user?.role === 'student') {
    if (user.mustChangePassword) {
      return <Navigate to="/change-password" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
