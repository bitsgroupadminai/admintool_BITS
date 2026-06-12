import { z } from 'zod';

export const createChatSessionSchema = z.object({
  isPreview: z.boolean().optional(),
});

export const sendChatMessageSchema = z.object({
  message: z.string().min(1).max(2000).trim(),
});
