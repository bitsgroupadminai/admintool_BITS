import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().min(1),
  REDIS_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(16),
  CLIENT_URL: z.string().url(),
  LOGIN_MAX_ATTEMPTS: z.coerce.number().default(5),
  LOGIN_LOCK_MINUTES: z.coerce.number().default(15),
  SESSION_INACTIVITY_HOURS: z.coerce.number().default(24),
  MAX_KNOWLEDGE_FILE_MB: z.coerce.number().default(10),
  MAX_KNOWLEDGE_FILES_PER_SERVICE: z.coerce.number().default(10),
  OPENAI_API_KEY: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : undefined)),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) { 
  process.exit(1);
}

export const env = parsed.data;
