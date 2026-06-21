import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AppRoutes } from '@/routes/AppRoutes';
import { ConfirmProvider } from '@/components/ui/confirm';
import { SocketProvider } from '@/contexts/SocketContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { useAuthStore } from '@/store/auth.store';

export default function App() {
  const fetchMe = useAuthStore((s) => s.fetchMe);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  return (
    <BrowserRouter>
      <ConfirmProvider>
        <SocketProvider>
          <NotificationProvider>
            <AppRoutes />
            <Toaster position="top-right" richColors closeButton />
          </NotificationProvider>
        </SocketProvider>
      </ConfirmProvider>
    </BrowserRouter>
  );
}
