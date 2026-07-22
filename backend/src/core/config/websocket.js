import { Server } from 'socket.io';

import { CLIENT_ORIGINS } from './env.js';

import { getSession } from '../services/session.service.js';

import { logger } from '../logger/index.js';

import { WS_CLIENT_EVENTS } from './websocket.events.js';

import { handleChatSocketMessage } from '../../modules/chat/chat.socket.js';



/** @type {Server | null} */

let io = null;



/** @type {Map<string, Set<string>>} */

const userSockets = new Map();



/**

 * @param {import('http').Server} httpServer

 */

export function initWebSocket(httpServer) {

  io = new Server(httpServer, {

    cors: {

      origin: CLIENT_ORIGINS,

      credentials: true,

    },

  });



  io.use(async (socket, next) => {

    try {

      const rawCookie = socket.handshake.headers.cookie ?? '';

      const sessionId = rawCookie

        .split(';')

        .map((part) => part.trim())

        .find((part) => part.startsWith('sid='))

        ?.slice(4);



      if (!sessionId) {

        next(new Error('Authentication required'));

        return;

      }



      const session = await getSession(sessionId);

      if (!session) {

        next(new Error('Session expired'));

        return;

      }



      socket.data.user = session;

      next();

    } catch (err) {

      next(err);

    }

  });



  io.on('connection', (socket) => {

    const user = socket.data.user;

    const userId = user?.userId;

    if (!userId) {

      socket.disconnect(true);

      return;

    }



    if (!userSockets.has(userId)) {

      userSockets.set(userId, new Set());

    }

    userSockets.get(userId).add(socket.id);



    socket.join(`user:${userId}`);

    socket.join(`institute:${user.instituteId}`);



    socket.on(WS_CLIENT_EVENTS.SUBSCRIBE_OFFERING, (offeringId) => {

      if (typeof offeringId === 'string' && offeringId) {

        socket.join(`offering:${offeringId}`);

      }

    });



    socket.on(WS_CLIENT_EVENTS.UNSUBSCRIBE_OFFERING, (offeringId) => {

      if (typeof offeringId === 'string' && offeringId) {

        socket.leave(`offering:${offeringId}`);

      }

    });



    socket.on(WS_CLIENT_EVENTS.SUBSCRIBE_APPLICATION, (applicationId) => {

      if (typeof applicationId === 'string' && applicationId) {

        socket.join(`application:${applicationId}`);

      }

    });



    socket.on(WS_CLIENT_EVENTS.UNSUBSCRIBE_APPLICATION, (applicationId) => {

      if (typeof applicationId === 'string' && applicationId) {

        socket.leave(`application:${applicationId}`);

      }

    });



    socket.on(WS_CLIENT_EVENTS.SUBSCRIBE_CHAT, (sessionId) => {

      if (typeof sessionId === 'string' && sessionId) {

        socket.join(`chat:${sessionId}`);

      }

    });



    socket.on(WS_CLIENT_EVENTS.UNSUBSCRIBE_CHAT, (sessionId) => {

      if (typeof sessionId === 'string' && sessionId) {

        socket.leave(`chat:${sessionId}`);

      }

    });



    socket.on(WS_CLIENT_EVENTS.CHAT_SEND, async (payload, ack) => {

      try {

        const result = await handleChatSocketMessage(user, socket, payload);

        if (typeof ack === 'function') {

          ack({ ok: true, data: result });

        }

      } catch (err) {

        const message = err?.message ?? 'Could not send chat message';

        if (typeof ack === 'function') {

          ack({ ok: false, error: message });

        }

      }

    });



    socket.on('disconnect', () => {

      const sockets = userSockets.get(userId);

      if (!sockets) return;

      sockets.delete(socket.id);

      if (!sockets.size) {

        userSockets.delete(userId);

      }

    });

  });



  logger.info('Socket.IO initialized');

  return io;

}



/**

 * @param {string} userId

 * @param {string} event

 * @param {unknown} payload

 */

export function emitToUser(userId, event, payload) {

  if (!io) return;

  io.to(`user:${userId}`).emit(event, payload);

}



/**

 * @param {string} instituteId

 * @param {string} event

 * @param {unknown} payload

 */

export function emitToInstitute(instituteId, event, payload) {

  if (!io) return;

  io.to(`institute:${instituteId}`).emit(event, payload);

}



/**

 * @param {string} offeringId

 * @param {string} event

 * @param {unknown} payload

 */

export function emitToOffering(offeringId, event, payload) {

  if (!io) return;

  io.to(`offering:${offeringId}`).emit(event, payload);

}



/**

 * @param {string} applicationId

 * @param {string} event

 * @param {unknown} payload

 */

export function emitToApplication(applicationId, event, payload) {

  if (!io) return;

  io.to(`application:${applicationId}`).emit(event, payload);

}



/**

 * @param {string} sessionId

 * @param {string} event

 * @param {unknown} payload

 */

export function emitToChatSession(sessionId, event, payload) {

  if (!io) return;

  io.to(`chat:${sessionId}`).emit(event, payload);

}



export function getIo() {

  return io;

}



/**

 * Snapshot of live WebSocket connectivity, used by monitoring/metrics.

 * @returns {{ initialized: boolean, connectedUsers: number, connectedSockets: number }}

 */

export function getWebsocketStats() {

  let connectedSockets = 0;

  for (const sockets of userSockets.values()) {

    connectedSockets += sockets.size;

  }

  return {

    initialized: io !== null,

    connectedUsers: userSockets.size,

    connectedSockets,

  };

}



export async function closeWebSocket() {

  if (io) {

    await io.close();

    io = null;

    userSockets.clear();

  }

}


