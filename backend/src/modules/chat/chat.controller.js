import * as chatService from './chat.service.js';
import { sendSuccess } from '../../core/utils/apiResponse.js';
import { sendChatMessageSchema } from './chat.validator.js';

export async function getHistory(req, res, next) {
  try {
    const result = await chatService.getChatHistory(
      req.user.instituteId,
      req.params.serviceId,
      req.user,
    );
    sendSuccess(res, 200, 'Chat history', result);
  } catch (err) {
    next(err);
  }
}

export async function sendMessage(req, res, next) {
  try {
    const payload = sendChatMessageSchema.parse(req.body);
    const result = await chatService.sendStudentChatMessage(
      req.user.instituteId,
      req.params.serviceId,
      req.user,
      payload.message,
      payload.offeringId,
    );
    sendSuccess(res, 200, 'Assistant reply', result);
  } catch (err) {
    next(err);
  }
}
