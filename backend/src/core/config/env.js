import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

/** Railway Raw Editor often sends empty strings; treat them as unset so defaults apply. */
const cleanedEnv = Object.fromEntries(
  Object.entries(process.env).map(([key, value]) => [
    key,
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  ]),
);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().min(1),
  REDIS_URL: z.string().min(1).transform((url) => url.trim()),
  SESSION_SECRET: z.string().min(16),
  ADMIN_CLIENT_URL: z.string().url(),
  STUDENT_CLIENT_URL: z.string().url(),
  /** Comma-separated extra browser origins allowed by CORS (e.g. Vercel preview URLs). */
  EXTRA_CORS_ORIGINS: z
    .string()
    .optional()
    .transform((value) =>
      value
        ? value
            .split(',')
            .map((origin) => origin.trim())
            .filter(Boolean)
        : [],
    ),
  /**
   * When true, allow any https://*.vercel.app origin (useful while preview domains change).
   * Set false later and lock to ADMIN_CLIENT_URL / STUDENT_CLIENT_URL only.
   */
  ALLOW_VERCEL_APP_ORIGINS: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  /** Public API base used in logs/docs; optional. Railway provides PORT automatically. */
  PUBLIC_API_URL: z
    .string()
    .url()
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : undefined)),
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
  /** Vision-capable model used to read image / scanned document uploads. */
  OPENAI_VISION_MODEL: z.string().default('gpt-4o'),
  /** Default chat JSON timeout (ms). Large knowledge docs need more than 12s. */
  OPENAI_TIMEOUT_MS: z.coerce.number().default(60_000),
  /** Service insights / catalogue extraction timeout (ms). */
  OPENAI_INSIGHTS_TIMEOUT_MS: z.coerce.number().default(120_000),
  /** Master switch for AI-driven verification of application documents & eligibility. */
  AI_VERIFICATION_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  /** Confidence at/above which a passing AI verdict auto-approves the step. */
  AI_VERIFY_AUTO_APPROVE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.85),
  /** Confidence at/above which a failing AI verdict auto-returns for correction. */
  AI_VERIFY_AUTO_REJECT_THRESHOLD: z.coerce.number().min(0).max(1).default(0.8),
  /** Concurrency for the AI verification worker. */
  AI_VERIFICATION_QUEUE_CONCURRENCY: z.coerce.number().default(2),
  PINECONE_API_KEY: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : undefined)),
  PINECONE_INDEX: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : undefined)),
  EMBEDDING_QUEUE_CONCURRENCY: z.coerce.number().default(2),
  RAG_TOP_K: z.coerce.number().default(12),
  RAG_CHUNK_SIZE: z.coerce.number().default(900),
  RAG_CHUNK_OVERLAP: z.coerce.number().default(150),
  STUDENT_PORTAL_INSTITUTE_ID: z.string().optional(),
  EMAIL_NOTIFICATIONS_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  RESEND_API_KEY: z
    .string()
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : undefined)),
  EMAIL_FROM: z
    .string()
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : undefined)),
  /** Nodemailer SMTP backup when Resend is unset or fails. */
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
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : undefined)),
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
  /** Optional bearer token protecting the Prometheus /metrics endpoint. Open when unset. */
  METRICS_TOKEN: z
    .string()
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : undefined)),
  /** Max rows returned in a single admin record export (CSV/XLSX/JSON). */
  EXPORT_MAX_ROWS: z.coerce.number().min(1).default(10_000),
  /** Max page size for the ERP incremental sync API. */
  ERP_SYNC_MAX_PAGE_SIZE: z.coerce.number().min(1).max(1000).default(200),
  /** Toggle the periodic dependency health monitor. */
  HEALTH_MONITOR_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  /** Interval (ms) between background dependency health checks. */
  HEALTH_MONITOR_INTERVAL_MS: z.coerce.number().min(5_000).default(60_000),
});

const parsed = envSchema.safeParse(cleanedEnv);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

console.log(
  JSON.stringify({
    msg: 'env_loaded',
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    hasMongo: Boolean(env.MONGODB_URI),
    hasRedis: Boolean(env.REDIS_URL),
    hasOpenAI: Boolean(env.OPENAI_API_KEY),
    aiVerificationEnabled: env.AI_VERIFICATION_ENABLED,
    hasPinecone: Boolean(env.PINECONE_API_KEY),
    hasSmtp: Boolean(env.SMTP_USER && env.SMTP_PASS),
    hasResend: Boolean(env.RESEND_API_KEY),
  }),
);

export const CLIENT_ORIGINS = [
  env.ADMIN_CLIENT_URL.replace(/\/$/, ''),
  env.STUDENT_CLIENT_URL.replace(/\/$/, ''),
  ...(env.EXTRA_CORS_ORIGINS ?? []).map((origin) => origin.replace(/\/$/, '')),
];

const VERCEL_APP_ORIGIN = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i;

/**
 * @param {string | undefined} origin
 */
export function isAllowedOrigin(origin) {
  if (!origin) return true;
  const normalized = origin.replace(/\/$/, '');
  if (CLIENT_ORIGINS.includes(normalized)) return true;
  if (env.ALLOW_VERCEL_APP_ORIGINS && VERCEL_APP_ORIGIN.test(normalized)) return true;
  return false;
}
