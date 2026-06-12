import { z } from 'zod';
import { isPredefinedStaffRole } from '../../shared/constants/roles.js';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters');

const staffRoleSchema = z
  .string()
  .min(2, 'Role is required')
  .max(50, 'Role must be at most 50 characters')
  .refine(
    (value) => isPredefinedStaffRole(value) || /^[a-zA-Z0-9][a-zA-Z0-9\s\-_/]*$/.test(value),
    'Invalid role name',
  );

export const signupSchema = z.object({
  instituteName: z.string().min(2).max(200),
  adminName: z.string().min(2).max(120),
  email: z.string().email(),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createStaffSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  staffRole: staffRoleSchema,
  password: passwordSchema,
});

export const updateStaffSchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    email: z.string().email().optional(),
    staffRole: staffRoleSchema.optional(),
    password: passwordSchema.optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: 'At least one field is required',
  });

export const updateInstituteSchema = z.object({
  name: z.string().min(2).max(200),
});
