import { evaluateEligibilityRules } from '../../shared/helpers/eligibilityEvaluation.helper.js';

/**
 * Pure decision logic for AI verification. Kept free of DB / OpenAI / queue imports
 * so it can be unit tested in isolation.
 */

export const INTERNAL_ACTION = {
  APPROVE: 'approve',
  RETURN: 'return',
  ESCALATE: 'escalate',
};

/**
 * Map a document-verification verdict + confidence to an action using thresholds.
 *
 * @param {{
 *   verdict: 'pass' | 'fail' | 'uncertain',
 *   confidence: number,
 *   thresholds: { autoApprove: number, autoReject: number },
 *   forceEscalate?: boolean,
 * }} params
 */
export function decideDocumentAction({ verdict, confidence, thresholds, forceEscalate = false }) {
  if (forceEscalate) return INTERNAL_ACTION.ESCALATE;
  if (verdict === 'pass' && confidence >= thresholds.autoApprove) {
    return INTERNAL_ACTION.APPROVE;
  }
  if (verdict === 'fail' && confidence >= thresholds.autoReject) {
    return INTERNAL_ACTION.RETURN;
  }
  return INTERNAL_ACTION.ESCALATE;
}

/**
 * Build an eligibility profile from AI-extracted fields so the deterministic rule
 * engine can compare values (AI only extracts; code decides pass/fail).
 *
 * @param {Array<{ field?: string, value?: unknown }>} fields
 */
export function buildProfileFromExtractedFields(fields = []) {
  const customFields = {};
  for (const field of fields) {
    const key = String(field.field ?? '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ');
    if (key) {
      customFields[key] = field.value;
    }
  }
  return {
    programmeName: null,
    enrollmentStatus: null,
    qualification: null,
    customFields,
  };
}

/**
 * Decide the eligibility action by combining extraction confidence with a
 * deterministic evaluation of the offering's rules.
 *
 * @param {{
 *   verdict: 'pass' | 'fail' | 'uncertain',
 *   confidence: number,
 *   extractedFields: Array<{ field?: string, value?: unknown }>,
 *   eligibilityRules: Array<object>,
 *   thresholds: { autoApprove: number, autoReject: number },
 * }} params
 * @returns {{ action: string, evaluation: object }}
 */
export function decideEligibilityAction({
  verdict,
  confidence,
  extractedFields,
  eligibilityRules,
  thresholds,
}) {
  const profile = buildProfileFromExtractedFields(extractedFields);
  const evaluation = evaluateEligibilityRules(eligibilityRules, profile);
  const hasUnchecked = evaluation.results.some((result) => result.status === 'unchecked');

  let action;
  if (hasUnchecked || verdict === 'uncertain') {
    action = INTERNAL_ACTION.ESCALATE;
  } else if (!evaluation.eligible) {
    action =
      confidence >= thresholds.autoReject ? INTERNAL_ACTION.RETURN : INTERNAL_ACTION.ESCALATE;
  } else {
    action =
      confidence >= thresholds.autoApprove ? INTERNAL_ACTION.APPROVE : INTERNAL_ACTION.ESCALATE;
  }

  return { action, evaluation };
}
