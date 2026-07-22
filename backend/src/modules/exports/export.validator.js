import { z } from 'zod';
import { APPLICATION_STATUS } from '../../shared/enums/application.enums.js';

export const exportRecordsSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  serviceId: z.string().min(1).optional(),
  offeringId: z.string().min(1).optional(),
  status: z.enum(Object.values(APPLICATION_STATUS)).optional(),
  format: z.enum(['csv', 'xlsx', 'json']).default('csv'),
});
