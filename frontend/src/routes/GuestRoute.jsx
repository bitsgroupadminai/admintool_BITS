import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { GlobalLoader } from '@/components/ui/GlobalLoader';

export function GuestRoute({ children }) {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) {
    return <GlobalLoader label="Checking your session..." variant="full" size="lg" />;
  }

  if (isAuthenticated) {
    if (user.role === 'admin' && !user.institute?.setupCompleted) {
      return <Navigate to="/setup/institute" replace />;
    }
    if (user.role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/staff/dashboard" replace />;
  }

  return children;
}
