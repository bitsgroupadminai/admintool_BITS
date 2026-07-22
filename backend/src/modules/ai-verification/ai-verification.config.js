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
