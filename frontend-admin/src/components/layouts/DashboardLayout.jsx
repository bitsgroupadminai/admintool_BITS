import { LogOut, GraduationCap, LayoutDashboard, Layers } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/ui/confirm-context";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Services", href: "/services", icon: Layers },
];

export function DashboardLayout({ children }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const location = useLocation();
  const confirm = useConfirm();

  const handleLogout = async () => {
    const ok = await confirm({
      title: "Logout?",
      description: "You will need to sign in again to continue.",
      confirmLabel: "Logout",
    });
    if (!ok) return;
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-[#F4FAF7]">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-white/85 border-r border-[#E2EEE8] shadow-[4px_0_24px_rgba(10,102,64,0.06)]">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-[#E2EEE8]">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#0A6640] to-[#10B981] shadow-[0_2px_8px_rgba(10,102,64,0.25)]">
            <GraduationCap className="h-4 w-4 text-white" strokeWidth={2.2} />
          </div>
          <span className="text-sm font-bold tracking-tight text-[#052E1C]">
            EduPortal
          </span>
        </div>

        <nav className="flex-1 space-y-0.5 px-3 py-5">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const active = location.pathname.startsWith(href);
            return (
              <Link
                key={href}
                to={href}
                className={cn(
                  "relative flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] overflow-hidden group",
                  active
                    ? "text-[#052E1C] bg-gradient-to-r from-[#6EE7B7]/20 to-[#A7F3D0]/10 shadow-sm"
                    : "text-[#4B6358] hover:text-[#052E1C]",
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-8 rounded-r-full bg-gradient-to-b from-[#0A6640] to-[#10B981]" />
                )}
                {!active && (
                  <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-[#D1FAE5]/70 to-[#F0FAF5]/40" />
                )}
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 relative z-10 transition-all duration-500",
                    active
                      ? "text-[#0A6640] scale-110"
                      : "text-[#6B7280] group-hover:scale-110 group-hover:text-[#0A6640]",
                  )}
                  strokeWidth={active ? 2.5 : 2}
                />
                <span className="relative z-10">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[#E2EEE8] px-5 py-4">
          <p className="truncate text-xs font-medium text-[#4B6358]">
            {user?.institute?.name ?? "Institute"}
          </p>
        </div>
      </aside>

      <div className="flex flex-1 flex-col pl-60">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-end gap-4 px-6 bg-white/85 backdrop-blur-md border-b border-[#E2EEE8]/80 shadow-[0_1px_8px_rgba(10,102,64,0.05)]">
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold leading-none text-[#052E1C]">
                {user?.name}
              </p>
              <p className="mt-0.5 text-xs capitalize text-[#6B7280]">
                {user?.role}
              </p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#D1FAE5] to-[#A7F3D0] text-xs font-bold text-[#0A6640] shadow-[0_2px_6px_rgba(10,102,64,0.12)]">
              {user?.name?.slice(0, 2).toUpperCase() ?? "AD"}
            </div>
          </div>

          <div className="h-5 w-px bg-[#E2EEE8]" />

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[#4B6358] border border-[#C4E8D4] bg-white/70 transition-all duration-300 hover:bg-[#F0FAF5] hover:text-[#0A6640] hover:border-[#6EE7B7]"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={2} />
            Logout
          </button>
        </header>

        <main className="flex-1 overflow-auto bg-[#F4FAF7]">{children}</main>
      </div>
    </div>
  );
}
