import { env } from '../../core/config/env.js';
import { isOpenAiConfigured } from '../../shared/services/openai.client.js';

/**
 * AI verification is active only when explicitly enabled AND an OpenAI key is set.
 * When this is false, the workflow falls back to the legacy auto-advance behavior.
 */
export function isAiVerificationEnabled() {
  return Boolean(env.AI_VERIFICATION_ENABLED) && isOpenAiConfigured();
}

export const AI_VERIFY_THRESHOLDS = {
  autoApprove: env.AI_VERIFY_AUTO_APPROVE_THRESHOLD,
  autoReject: env.AI_VERIFY_AUTO_REJECT_THRESHOLD,
};

/** Looser gates while testing with unofficial / AI-generated sample documents. */
export const SAMPLE_DOCUMENT_TESTING_THRESHOLDS = {
  autoApprove: 0.5,
  autoReject: 0.95,
};

export const AI_VERIFICATION_MODEL = env.OPENAI_VERIFICATION_MODEL;
