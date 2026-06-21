import { Bell, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/contexts/NotificationContext';

export function NotificationBell() {
  const { unreadCount, toggleSidebar } = useNotifications();

  return (
    <button
      type="button"
      onClick={toggleSidebar}
      className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#C4E8D4] bg-white text-[#0A6640] transition hover:bg-[#F0FAF5]"
      aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
    >
      <Bell className="h-4 w-4" />
      {unreadCount > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#DC2626] px-1 text-[10px] font-bold text-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      ) : null}
    </button>
  );
}

export function NotificationSidebar() {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading,
    sidebarOpen,
    closeSidebar,
    markAllRead,
    markRead,
  } = useNotifications();

  if (!sidebarOpen) return null;

  const handleNavigate = (notification) => {
    if (!notification.read) markRead(notification.id);
    closeSidebar();
    if (notification.link) navigate(notification.link);
  };

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[60] bg-[#052E1C]/30 backdrop-blur-[2px]"
        onClick={closeSidebar}
        aria-label="Close notifications"
      />
      <aside className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col border-l border-[#E2EEE8] bg-white shadow-[-12px_0_40px_rgba(5,46,28,0.12)]">
        <div className="flex items-center justify-between border-b border-[#E2EEE8] px-5 py-4">
          <div>
            <p className="text-base font-bold text-[#052E1C]">Notifications</p>
            <p className="text-xs text-[#4B6358]">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={markAllRead}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-[#0A6640] hover:bg-[#F0FAF5]"
              >
                Mark all read
              </button>
            ) : null}
            <button
              type="button"
              onClick={closeSidebar}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-[#4B6358] hover:bg-[#F0FAF5]"
              aria-label="Close panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="px-5 py-8 text-sm text-[#4B6358]">Loading notifications...</p>
          ) : notifications.length === 0 ? (
            <p className="px-5 py-8 text-sm text-[#4B6358]">No notifications yet.</p>
          ) : (
            notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => handleNavigate(notification)}
                className={`block w-full border-b border-[#F3F4F6] px-5 py-4 text-left transition hover:bg-[#F9FCFB] ${
                  notification.read ? 'bg-white' : 'bg-[#F0FAF5]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-[#052E1C]">{notification.title}</p>
                  {!notification.read ? (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#0A6640]" />
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-[#4B6358]">{notification.body}</p>
                <p className="mt-2 text-[10px] text-[#9CA3AF]">
                  {new Date(notification.createdAt).toLocaleString()}
                </p>
              </button>
            ))
          )}
        </div>
      </aside>
    </>
  );
}
