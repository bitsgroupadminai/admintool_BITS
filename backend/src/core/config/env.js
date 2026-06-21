import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().min(1),
  REDIS_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(16),
  ADMIN_CLIENT_URL: z.string().url(),
  STUDENT_CLIENT_URL: z.string().url(),
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
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  PINECONE_API_KEY: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : undefined)),
  PINECONE_INDEX: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : undefined)),
  EMBEDDING_QUEUE_CONCURRENCY: z.coerce.number().default(2),
  RAG_TOP_K: z.coerce.number().default(8),
  RAG_CHUNK_SIZE: z.coerce.number().default(900),
  RAG_CHUNK_OVERLAP: z.coerce.number().default(150),
  STUDENT_PORTAL_INSTITUTE_ID: z.string().optional(),
  EMAIL_NOTIFICATIONS_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  SMTP_HOST: z
    .string()
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : undefined)),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  SMTP_USER: z
    .string()
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : undefined)),
  SMTP_PASS: z
    .string()
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : undefined)),
  SMTP_FROM: z
    .string()
    .default('EduPortal <noreply@localhost>'),
  EMAIL_QUEUE_CONCURRENCY: z.coerce.number().default(5),
  OPERATIONS_QUEUE_CONCURRENCY: z.coerce.number().default(3),
  GOOGLE_SERVICE_ACCOUNT_KEY_FILE: z
    .string()
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : undefined)),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z
    .string()
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : undefined)),
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: z
    .string()
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : undefined)),
  GOOGLE_CALENDAR_IMPERSONATE_EMAIL: z
    .string()
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : undefined)),
  GOOGLE_OAUTH_CLIENT_ID: z
    .string()
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : undefined)),
  GOOGLE_OAUTH_CLIENT_SECRET: z
    .string()
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : undefined)),
  GOOGLE_OAUTH_REFRESH_TOKEN: z
    .string()
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : undefined)),
  GOOGLE_OAUTH_REDIRECT_URI: z
    .string()
    .default('http://127.0.0.1:8765/oauth2callback')
    .transform((value) => (value?.trim() ? value.trim() : 'http://127.0.0.1:8765/oauth2callback')),
  GOOGLE_CALENDAR_ID: z
    .string()
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : undefined)),
  GOOGLE_CALENDAR_TIMEZONE: z.string().default('Asia/Kolkata'),
  CACHE_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  CACHE_DEFAULT_TTL_HOURS: z.coerce.number().min(1).default(12),
  RAZORPAY_KEY_ID: z
    .string()
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : undefined)),
  RAZORPAY_KEY_SECRET: z
    .string()
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : undefined)),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) { 
  process.exit(1);
}

export const env = parsed.data;

export const CLIENT_ORIGINS = [env.ADMIN_CLIENT_URL, env.STUDENT_CLIENT_URL];
