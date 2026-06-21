import { z } from 'zod';
import { validatePhoneNumber } from '../../shared/helpers/phone.helper.js';

const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');
const phoneSchema = z
  .string()
  .trim()
  .min(4)
  .max(16)
  .refine((value) => validatePhoneNumber(value).valid, 'Enter a valid mobile number with country code');

export const startServiceApplicationSchema = z.object({
  applicantDetails: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export const updateServiceApplicationDetailsSchema = z.object({
  applicantDetails: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
});

export const createApplicationSchema = z.object({
  offeringId: z.string().min(1),
  applicantName: z.string().min(2).max(120),
  applicantEmail: z.string().email(),
  applicantMobile: phoneSchema,
  applicantDetails: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export const changePasswordSchema = z.object({
  password: passwordSchema,
});

export const listInstitutesQuerySchema = z.object({
  search: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const enrollmentIntakeStatusQuerySchema = z.object({
  offeringId: z.string().min(1),
  email: z.string().email(),
});

export const createStudentSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: passwordSchema,
  offeringId: z.string().optional(),
  programmeName: z.string().max(160).optional(),
}).refine(
  (data) => Boolean(data.offeringId?.trim() || data.programmeName?.trim()),
  'Select a programme or enter a custom programme name',
);

export const updateStudentSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  email: z.string().email().optional(),
  password: passwordSchema.optional(),
  offeringId: z.string().optional(),
  programmeName: z.string().max(160).optional(),
}).refine(
  (data) =>
    data.offeringId === undefined ||
    Boolean(data.offeringId?.trim() || data.programmeName?.trim()),
  'Select a programme or enter a custom programme name',
);
