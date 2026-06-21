import { z } from 'zod';

export const BROADCAST_AUDIENCES = ['all_staff', 'all_students', 'staff', 'student'];

export const BROADCAST_CATEGORIES = [
  'general',
  'deadline',
  'holiday',
  'maintenance',
  'event',
];

export const broadcastNotificationSchema = z
  .object({
    audience: z.enum(BROADCAST_AUDIENCES),
    targetUserId: z.string().min(1).optional(),
    title: z.string().min(2, 'Title is required').max(160),
    body: z.string().min(2, 'Message is required').max(2000),
    link: z.string().trim().max(500).optional(),
    category: z.enum(BROADCAST_CATEGORIES).default('general'),
  })
  .superRefine((value, ctx) => {
    if (['staff', 'student'].includes(value.audience) && !value.targetUserId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please select a recipient',
        path: ['targetUserId'],
      });
    }
  });
