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
  portal: z.enum(['student', 'admin', 'staff']).optional(),
});

export const updateProfileSchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    currentPassword: z.string().min(1).optional(),
    newPassword: passwordSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword && !data.currentPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Current password is required to set a new password',
        path: ['currentPassword'],
      });
    }

    if (!data.name?.trim() && !data.newPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide a name or new password to update',
        path: ['name'],
      });
    }
  });

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordSchema,
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required'),
  instituteName: z.string().min(2, 'Type your institute name to confirm'),
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
