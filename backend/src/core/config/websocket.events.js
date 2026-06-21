/** Server → client event names (single source of truth for scalability). */
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

/** Client → server event names. */
export const WS_CLIENT_EVENTS = {
  SUBSCRIBE_OFFERING: 'subscribe:offering',
  UNSUBSCRIBE_OFFERING: 'unsubscribe:offering',
  SUBSCRIBE_APPLICATION: 'subscribe:application',
  UNSUBSCRIBE_APPLICATION: 'unsubscribe:application',
  SUBSCRIBE_CHAT: 'subscribe:chat',
  UNSUBSCRIBE_CHAT: 'unsubscribe:chat',
  CHAT_SEND: 'chat:send',
};
