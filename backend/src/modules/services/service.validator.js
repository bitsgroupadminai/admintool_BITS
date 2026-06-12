import { z } from 'zod';
import { SERVICE_STATUS } from '../../shared/enums/service.enums.js';

export const createServiceSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
});

export const updateServiceSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum([
    SERVICE_STATUS.DRAFT,
    SERVICE_STATUS.ACTIVE,
    SERVICE_STATUS.DISABLED,
    SERVICE_STATUS.ARCHIVED,
  ]).optional(),
});

export const manualOfferingSuggestionSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(500).optional(),
});

export const updateOfferingSuggestionSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  description: z.string().max(500).optional(),
});
