import { z } from 'zod';
import { PAYMENT_TIMING } from '../../shared/enums/payment.enums.js';

export const paymentConfigSchema = z
  .object({
    enabled: z.boolean(),
    amount: z.number().min(1).max(1000000).optional(),
    currency: z.string().length(3).default('INR'),
    label: z.string().max(120).optional(),
    timing: z.enum([PAYMENT_TIMING.BEFORE_SUBMIT, PAYMENT_TIMING.WORKFLOW_STEP]).optional(),
    workflowStepId: z.string().min(1).optional().nullable(),
  })
  .superRefine((payload, ctx) => {
    if (!payload.enabled) return;

    if (!payload.amount || payload.amount < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Fee amount is required when payments are enabled',
        path: ['amount'],
      });
    }

    if (!payload.label?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Fee label is required when payments are enabled',
        path: ['label'],
      });
    }

    if (
      payload.timing === PAYMENT_TIMING.WORKFLOW_STEP &&
      !payload.workflowStepId?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Select the workflow step where payment is collected',
        path: ['workflowStepId'],
      });
    }
  });

export const updatePaymentSchema = z.object({
  paymentConfig: paymentConfigSchema,
});

export const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});
