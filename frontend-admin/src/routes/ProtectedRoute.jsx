import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { GlobalLoader } from '@/components/ui/GlobalLoader';

export function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, isLoading, user, authError } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return <GlobalLoader label="Preparing your workspace..." variant="full" size="lg" />;
  }

  if (authError && !isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="max-w-md text-sm text-[#4B6358]">{authError}</p>
        <button
          type="button"
          onClick={() => useAuthStore.getState().fetchMe()}
          className="rounded-full bg-[#0A6640] px-5 py-2 text-sm font-semibold text-white hover:bg-[#084F31]"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!isAuthenticated) {
    const loginPath = location.pathname.startsWith('/staff')
      ? '/staff/login'
      : '/login';
    return <Navigate to={loginPath} state={{ from: location }} replace />;
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
