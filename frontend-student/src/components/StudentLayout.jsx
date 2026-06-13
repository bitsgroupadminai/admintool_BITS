import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

export function StudentLayout({ children, showNav = true }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      {showNav && (
        <header className="border-b border-border bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
            <Link to="/dashboard" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1F4D3F] text-white">
                <GraduationCap className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Student Portal</p>
                <p className="text-xs text-muted">{user?.institute?.name}</p>
              </div>
            </Link>
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-foreground">{user?.name}</p>
                <p className="text-xs text-muted">{user?.enrolledProgramme?.name ?? 'Student'}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted hover:bg-white hover:text-foreground"
              >
                <LogOut className="h-3.5 w-3.5" />
                Logout
              </button>
            </div>
          </div>
        </header>
      )}
      <main>{children}</main>
    </div>
  );
}

export function PublicLayout({ children, instituteName }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1F4D3F] text-white">
              <GraduationCap className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Student Portal</p>
              <p className="text-xs text-muted">{instituteName ?? 'BITS Institute'}</p>
            </div>
          </Link>
          <Link
            to="/login"
            className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-white"
          >
            Log in
          </Link>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
