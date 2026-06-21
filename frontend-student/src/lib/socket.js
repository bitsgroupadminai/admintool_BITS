function resolveSocketUrl() {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace(/\/api\/v1\/?$/, '');
  }
  // Same origin in dev so Vite proxies /socket.io to the API server.
  if (import.meta.env.DEV) {
    return '';
  }
  return 'http://localhost:5001';
}

export const SOCKET_URL = resolveSocketUrl();

export const WS_EVENTS = {
  NOTIFICATION_NEW: 'notification:new',
  NOTIFICATION_READ: 'notification:read',
  QUEUE_UPDATED: 'queue:updated',
  QUEUE_TICKET: 'queue:ticket',
  APPLICATION_UPDATED: 'application:updated',
  APPOINTMENT_SLOTS_UPDATED: 'appointment:slots:updated',
  APPOINTMENT_UPDATED: 'appointment:updated',
  DASHBOARD_UPDATED: 'dashboard:updated',
  CHAT_MESSAGE: 'chat:message',
  CHAT_STREAM: 'chat:stream',
  CHAT_DONE: 'chat:done',
  CHAT_ERROR: 'chat:error',
};

export const WS_CLIENT_EVENTS = {
  SUBSCRIBE_OFFERING: 'subscribe:offering',
  UNSUBSCRIBE_OFFERING: 'unsubscribe:offering',
  SUBSCRIBE_APPLICATION: 'subscribe:application',
  UNSUBSCRIBE_APPLICATION: 'unsubscribe:application',
  SUBSCRIBE_CHAT: 'subscribe:chat',
  UNSUBSCRIBE_CHAT: 'unsubscribe:chat',
  CHAT_SEND: 'chat:send',
};
