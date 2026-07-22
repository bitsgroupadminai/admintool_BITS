import { z } from 'zod';
import { APPLICATION_STATUS } from '../../shared/enums/application.enums.js';

export const erpListSchema = z.object({
  updatedSince: z
    .string()
    .datetime({ offset: true })
    .optional(),
  status: z.enum(Object.values(APPLICATION_STATUS)).optional(),
  limit: z.coerce.number().int().min(1).optional(),
  cursor: z.string().min(1).optional(),
});
