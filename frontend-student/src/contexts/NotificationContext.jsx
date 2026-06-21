import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { notificationsApi } from '@/api/operations.api';
import { useSocketEvent } from '@/contexts/SocketContext';
import { WS_EVENTS } from '@/lib/socket';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const { data } = await notificationsApi.list();
      setNotifications(data.data.notifications ?? []);
      setUnreadCount(data.data.unreadCount ?? 0);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useSocketEvent(WS_EVENTS.NOTIFICATION_NEW, (notification) => {
    setNotifications((current) => {
      if (current.some((item) => item.id === notification.id)) return current;
      return [notification, ...current].slice(0, 50);
    });
    setUnreadCount((count) => count + 1);
  });

  useSocketEvent(WS_EVENTS.NOTIFICATION_READ, ({ unreadCount: nextCount }) => {
    if (typeof nextCount === 'number') {
      setUnreadCount(nextCount);
    }
  });

  const markAllRead = async () => {
    await notificationsApi.markAllRead();
    setUnreadCount(0);
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
  };

  const markRead = async (id) => {
    await notificationsApi.markRead(id);
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, read: true } : item)),
    );
    setUnreadCount((count) => Math.max(0, count - 1));
  };

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleSidebar = useCallback(() => setSidebarOpen((open) => !open), []);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      sidebarOpen,
      reload: loadNotifications,
      markAllRead,
      markRead,
      openSidebar,
      closeSidebar,
      toggleSidebar,
    }),
    [
      notifications,
      unreadCount,
      loading,
      sidebarOpen,
      loadNotifications,
      markAllRead,
      markRead,
      openSidebar,
      closeSidebar,
      toggleSidebar,
    ],
  );

  return (
    <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
