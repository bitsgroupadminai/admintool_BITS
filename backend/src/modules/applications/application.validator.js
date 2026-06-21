import { z } from 'zod';
import { APPLICATION_STATUS } from '../../shared/enums/application.enums.js';
import { OUTCOME_TYPE } from '../../shared/enums/workflow.enums.js';

export const listApplicationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z.enum(['all', ...Object.values(APPLICATION_STATUS)]).optional(),
  serviceId: z.string().optional(),
  offeringId: z.string().optional(),
  staffId: z.string().optional(),
  slaBreached: z.enum(['true', 'false']).optional(),
  search: z.string().trim().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'applicantName', 'status']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const updateApplicationStatusSchema = z.object({
  status: z.enum([
    APPLICATION_STATUS.IN_REVIEW,
    APPLICATION_STATUS.ADMITTED,
    APPLICATION_STATUS.REJECTED,
  ]),
});

export const workflowActionSchema = z.object({
  outcome: z.enum([
    OUTCOME_TYPE.APPROVED,
    OUTCOME_TYPE.REJECTED,
    OUTCOME_TYPE.NEEDS_CORRECTION,
  ]),
  note: z.string().trim().max(2000).optional(),
  correctionRequiredDocuments: z.array(z.string().trim().min(1)).max(30).optional(),
});

export const assignApplicationSchema = z.object({
  staffUserId: z.string().min(1),
});

export const slaActionSchema = z.object({
  action: z.enum(['extend', 'escalate']),
});
