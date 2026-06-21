import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { GlobalLoader } from '@/components/ui/GlobalLoader';

export function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading, user, authError } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return <GlobalLoader label="Checking your session..." variant="full" />;
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
    return <GlobalLoader label="Checking your session..." variant="full" />;
  }

  if (isAuthenticated && user?.role === 'student') {
    if (user.mustChangePassword) {
      return <Navigate to="/change-password" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
