import { z } from 'zod';

export const listEnrollmentIntakesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  search: z.string().trim().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'applicantName']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const rejectEnrollmentIntakeSchema = z.object({
  reason: z.string().trim().min(3).max(2000),
});

export const approveEnrollmentIntakeSchema = z.object({
  note: z.string().trim().max(2000).optional(),
});
