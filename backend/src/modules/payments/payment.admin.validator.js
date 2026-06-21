import { z } from 'zod';
import { PAYMENT_STATUS } from '../../shared/enums/payment.enums.js';

export const listAdminPaymentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .preprocess(
      (value) => (value === '' || value === undefined ? undefined : value),
      z.enum([PAYMENT_STATUS.CREATED, PAYMENT_STATUS.PAID, PAYMENT_STATUS.FAILED]).optional(),
    ),
  serviceId: z.string().optional(),
  offeringId: z.string().optional(),
  applicationId: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['paidAt', 'createdAt', 'amountPaise']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
