import { z } from 'zod';

const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');

export const createApplicationSchema = z.object({
  offeringId: z.string().min(1),
  applicantName: z.string().min(2).max(120),
  applicantEmail: z.string().email(),
});

export const changePasswordSchema = z.object({
  password: passwordSchema,
});

export const createStudentSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: passwordSchema,
  offeringId: z.string().min(1),
});
