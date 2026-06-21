import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL, WS_CLIENT_EVENTS } from '@/lib/socket';
import { useAuthStore } from '@/store/auth.store';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const user = useAuthStore((s) => s.user);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  /** @type {import('react').MutableRefObject<Map<string, Set<Function>>>} */
  const listenersRef = useRef(new Map());

  const attachListener = useCallback((event, handler) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event).add(handler);
    socketRef.current?.on(event, handler);
  }, []);

  const detachListener = useCallback((event, handler) => {
    listenersRef.current.get(event)?.delete(handler);
    socketRef.current?.off(event, handler);
  }, []);

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setConnected(false);
      return undefined;
    }

    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
    });

    socketRef.current = socket;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    listenersRef.current.forEach((handlers, event) => {
      handlers.forEach((handler) => socket.on(event, handler));
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      listenersRef.current.forEach((handlers, event) => {
        handlers.forEach((handler) => socket.off(event, handler));
      });
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [user?.userId ?? user?.id]);

  const subscribe = useCallback((event, handler) => {
    attachListener(event, handler);
    return () => detachListener(event, handler);
  }, [attachListener, detachListener]);

  const emit = useCallback((event, payload, ack) => {
    const socket = socketRef.current;
    if (!socket) return;
    if (ack) {
      socket.emit(event, payload, ack);
    } else {
      socket.emit(event, payload);
    }
  }, []);

  const subscribeOffering = useCallback((offeringId) => {
    if (!offeringId) return () => {};
    emit(WS_CLIENT_EVENTS.SUBSCRIBE_OFFERING, offeringId);
    return () => emit(WS_CLIENT_EVENTS.UNSUBSCRIBE_OFFERING, offeringId);
  }, [emit]);

  const subscribeApplication = useCallback((applicationId) => {
    if (!applicationId) return () => {};
    emit(WS_CLIENT_EVENTS.SUBSCRIBE_APPLICATION, applicationId);
    return () => emit(WS_CLIENT_EVENTS.UNSUBSCRIBE_APPLICATION, applicationId);
  }, [emit]);

  const subscribeChat = useCallback((sessionId) => {
    if (!sessionId) return () => {};
    emit(WS_CLIENT_EVENTS.SUBSCRIBE_CHAT, sessionId);
    return () => emit(WS_CLIENT_EVENTS.UNSUBSCRIBE_CHAT, sessionId);
  }, [emit]);

  const value = useMemo(
    () => ({
      connected,
      subscribe,
      emit,
      subscribeOffering,
      subscribeApplication,
      subscribeChat,
      getSocket: () => socketRef.current,
    }),
    [connected, subscribe, emit, subscribeOffering, subscribeApplication, subscribeChat],
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
}

export function useSocketEvent(event, handler, deps = []) {
  const { subscribe } = useSocket();

  useEffect(() => {
    if (!handler) return undefined;
    return subscribe(event, handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, subscribe, ...deps]);
}
