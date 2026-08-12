function normalizeAbsoluteUrl(value) {
  const raw = value?.trim();
  if (!raw) return '';
  let url = raw.replace(/\/$/, '');
  if (url.startsWith('//')) url = `https:${url}`;
  if (!/^https?:\/\//i.test(url) && /^[a-z0-9.-]+\.[a-z]{2,}/i.test(url)) {
    url = `https://${url}`;
  }
  return url.replace(/\/$/, '');
}

function resolveSocketUrl() {
  const socket = normalizeAbsoluteUrl(import.meta.env.VITE_SOCKET_URL);
  if (socket) return socket.replace(/\/api\/v1$/i, '');

  const api = normalizeAbsoluteUrl(import.meta.env.VITE_API_BASE_URL);
  if (api) return api.replace(/\/api\/v1\/?$/i, '');

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
