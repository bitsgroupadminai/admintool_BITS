import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  GraduationCap,
  LayoutDashboard,
  Layers,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ClipboardList,
  UserCheck,
  Users,
  UserCircle,
  UserCog,
  Settings,
  Bell,
  Ticket,
  CalendarDays,
  CreditCard,
  Activity,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { useConfirm } from "@/components/ui/confirm-context";
import { NotificationBell, NotificationSidebar } from '@/components/notifications/NotificationBell';

const navItems = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/services", label: "Services", icon: Layers },
  { to: "/admin/enrollment-intakes", label: "Enrollment intakes", icon: UserCheck },
  { to: "/admin/applications", label: "Requests", icon: ClipboardList },
  { to: "/admin/payments", label: "Payments", icon: CreditCard },
  { to: "/admin/queue", label: "Queue monitor", icon: Ticket },
  { to: "/admin/appointments", label: "Appointments", icon: CalendarDays },
  { to: "/admin/students", label: "Students", icon: Users },
  { to: "/admin/staff", label: "Staff", icon: UserCog },
  { to: "/admin/settings", label: "Settings", icon: Settings },
  { to: "/admin/system-health", label: "System health", icon: Activity },
  { to: "/admin/notifications", label: "Notifications", icon: Bell },
  { to: "/admin/profile", label: "Profile", icon: UserCircle },
];

export function AdminLayout({ children }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogout = async () => {
    const ok = await confirm({
      title: "Logout?",
      description: "You will need to sign in again to continue using Admin Portal.",
      confirmLabel: "Logout",
    });
    if (!ok) return;
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#F4FAF7]">
      <aside
        className={cn(
          "hidden lg:flex fixed inset-y-0 left-0 z-40 flex-col bg-white/85 border-r border-[#E2EEE8] shadow-[4px_0_24px_rgba(10,102,64,0.06)] transition-[width] duration-300",
          sidebarCollapsed ? "w-20" : "w-60",
        )}
      >
        <SidebarContent
          user={user}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((value) => !value)}
        />
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 w-full bg-[#052E1C]/35 backdrop-blur-sm"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close navigation"
          />
          <aside className="absolute left-0 top-0 flex h-full w-[82vw] max-w-80 flex-col bg-white/95 border-r border-[#E2EEE8] shadow-[12px_0_40px_rgba(5,46,28,0.16)]">
            <div className="flex h-14 items-center justify-between border-b border-[#E2EEE8] pr-3">
              <div className="flex items-center gap-3 px-5">
                <BrandMark />
                <span className="text-sm font-bold tracking-tight text-[#052E1C]">
                  Admin Portal
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-[#4B6358] hover:bg-[#F0FAF5] hover:text-[#0A6640]"
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
            <SidebarNav onNavigate={() => setMobileNavOpen(false)} />
            <SidebarFooter user={user} />
          </aside>
        </div>
      )}

      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col transition-[padding] duration-300",
          sidebarCollapsed ? "lg:pl-20" : "lg:pl-60",
        )}
      >
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-3.5 bg-white/85 backdrop-blur-md border-b border-[#E2EEE8]/80 shadow-[0_1px_8px_rgba(10,102,64,0.05)] sm:px-6">
          <div className="lg:hidden flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#C4E8D4] bg-white text-[#0A6640] shadow-sm"
              aria-label="Open navigation"
            >
              <Menu className="h-4.5 w-4.5" strokeWidth={2.2} />
            </button>
            <BrandMark compact />
            <span className="text-sm font-bold tracking-tight text-[#052E1C]">
              Admin Portal
            </span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <NotificationBell />
            <div className="hidden sm:flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#D1FAE5] to-[#A7F3D0] shadow-[0_2px_6px_rgba(10,102,64,0.12)] text-xs font-bold text-[#0A6640]">
                {user?.name?.slice(0, 2).toUpperCase() ?? "AD"}
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold leading-none text-[#052E1C]">
                  {user?.name}
                </p>
                <p className="mt-0.5 text-xs capitalize text-[#6B7280]">
                  {user?.role}
                </p>
              </div>
            </div>

            <div className="hidden sm:block h-5 w-px bg-[#E2EEE8]" />

            <button
              type="button"
              onClick={handleLogout}
              className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#4B6358] border border-[#C4E8D4] bg-white/70 transition-all duration-300 hover:bg-[#F0FAF5] hover:text-[#0A6640] hover:border-[#6EE7B7] sm:px-3"
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={2} />
              Logout
            </button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-auto bg-[#F4FAF7]">{children}</main>
        <NotificationSidebar />
      </div>
    </div>
  );
}

function BrandMark({ compact = false }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center bg-gradient-to-br from-[#0A6640] to-[#10B981] shadow-[0_2px_8px_rgba(10,102,64,0.25)]",
        compact ? "h-8 w-8 rounded-xl" : "h-8 w-8 rounded-xl",
      )}
    >
      <GraduationCap className="h-4 w-4 text-white" strokeWidth={2.2} />
    </div>
  );
}

function SidebarContent({ user, collapsed, onToggle }) {
  return (
    <>
      <div
        className={cn(
          "flex h-14 items-center border-b border-[#E2EEE8] px-4",
          collapsed ? "justify-center" : "justify-between gap-3",
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <BrandMark />
          {!collapsed && (
            <span className="truncate text-sm font-bold tracking-tight text-[#052E1C]">
              Admin Portal
            </span>
          )}
        </div>
        {!collapsed && (
          <button
            type="button"
            onClick={onToggle}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[#4B6358] transition-colors hover:bg-[#F0FAF5] hover:text-[#0A6640]"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" strokeWidth={2} />
          </button>
        )}
      </div>
      {collapsed && (
        <div className="px-4 pt-4">
          <button
            type="button"
            onClick={onToggle}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#C4E8D4] bg-white text-[#0A6640] transition-colors hover:bg-[#F0FAF5]"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      )}
      <SidebarNav collapsed={collapsed} />
      <SidebarFooter user={user} collapsed={collapsed} />
    </>
  );
}

function SidebarNav({ onNavigate, collapsed = false }) {
  return (
    <nav className={cn("flex-1 space-y-0.5 py-5", collapsed ? "px-3" : "px-3")}>
      {navItems.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          title={collapsed ? label : undefined}
          className={({ isActive }) =>
            cn(
              "relative flex items-center rounded-xl py-2.5 text-sm font-medium transition-all duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] overflow-hidden group",
              collapsed ? "justify-center px-0" : "gap-3 px-4",
              isActive
                ? "text-[#052E1C] bg-gradient-to-r from-[#6EE7B7]/20 to-[#A7F3D0]/10 shadow-sm"
                : "text-[#4B6358] hover:text-[#052E1C]",
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-8 rounded-r-full bg-gradient-to-b from-[#0A6640] to-[#10B981]" />
              )}
              {!isActive && (
                <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-[#D1FAE5]/70 to-[#F0FAF5]/40" />
              )}
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 relative z-10 transition-all duration-500",
                  isActive
                    ? "text-[#0A6640] scale-110"
                    : "text-[#6B7280] group-hover:scale-110 group-hover:text-[#0A6640]",
                )}
                strokeWidth={isActive ? 2.5 : 2}
              />
              {!collapsed && <span className="relative z-10">{label}</span>}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function SidebarFooter({ user, collapsed = false }) {
  const instituteName = user?.institute?.name ?? "Institute";
  const initials = instituteName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return (
    <div className={cn("border-t border-[#E2EEE8] p-4", collapsed && "px-3")}>
      {collapsed ? (
        <div
          title={instituteName}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#C4E8D4] bg-[#F0FAF5] text-xs font-bold text-[#0A6640]"
        >
          {initials || "IN"}
        </div>
      ) : (
        <div className="rounded-2xl border border-[#C4E8D4] bg-[#F0FAF5] px-4 py-3">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[#10B981]">
            Institute
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-[#052E1C]">
            {instituteName}
          </p>
        </div>
      )}
    </div>
  );
}
