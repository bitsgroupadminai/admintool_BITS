import { z } from 'zod';
import * as chatService from './chat.service.js';
import { emitToChatSession } from '../../core/config/websocket.js';
import { WS_EVENTS } from '../../core/config/websocket.events.js';

const chatSendSchema = z.object({
  serviceId: z.string().min(1),
  message: z.string().min(1).max(4000),
  offeringId: z.string().optional(),
});

/**
 * Handle chat:send over WebSocket with streaming assistant replies.
 * @param {import('../../core/services/session.service.js').SessionUser} user
 * @param {import('socket.io').Socket} socket
 * @param {unknown} payload
 */
export async function handleChatSocketMessage(user, socket, payload) {
  const data = chatSendSchema.parse(payload);
  const instituteId = user.instituteId;

  const session = await chatService.prepareChatSession(
    instituteId,
    data.serviceId,
    user,
    data.offeringId,
  );

  socket.join(`chat:${session.sessionId}`);

  const userMessage = await chatService.persistUserMessage(
    instituteId,
    session.sessionId,
    data.message,
  );
  emitToChatSession(session.sessionId, WS_EVENTS.CHAT_MESSAGE, userMessage);

  const streamChunk = (chunk) => {
    emitToChatSession(session.sessionId, WS_EVENTS.CHAT_STREAM, {
      sessionId: session.sessionId,
      chunk,
    });
  };

  const assistantMessage = await chatService.generateAssistantReply(
    instituteId,
    data.serviceId,
    user,
    data.message,
    data.offeringId,
    session.context,
    session.history,
    streamChunk,
  );

  emitToChatSession(session.sessionId, WS_EVENTS.CHAT_DONE, {
    ...assistantMessage,
    sessionId: session.sessionId,
  });

  return {
    sessionId: session.sessionId,
    userMessage,
    assistantMessage,
  };
}
