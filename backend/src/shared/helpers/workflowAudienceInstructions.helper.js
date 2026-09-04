import { canonicalAdmissionAudienceInstructions } from './admission-workflow.helper.js';
import { classifyWorkflowEmailKind } from './workflowStudentEmail.helper.js';

export const AUDIENCE_INSTRUCTION_MAX = 1000;

const KIND_TO_ORDER = {
  document_verification: 1,
  eligibility: 2,
  seat_allocation: 3,
  offer_release: 4,
  fee_payment: 5,
  admission_confirmation: 6,
};

/**
 * @param {unknown} value
 */
function clip(value) {
  return String(value ?? '').trim().slice(0, AUDIENCE_INSTRUCTION_MAX);
}

/**
 * @param {Object} [step]
 */
export function normalizeAudienceInstructions(step = {}) {
  return {
    staffInstructions: clip(step.staffInstructions),
    adminInstructions: clip(step.adminInstructions),
    studentInstructions: clip(step.studentInstructions),
  };
}

/**
 * @param {Object} [step]
 */
export function hasAudienceInstructions(step) {
  const instructions = normalizeAudienceInstructions(step);
  return Boolean(
    instructions.staffInstructions &&
      instructions.adminInstructions &&
      instructions.studentInstructions,
  );
}

/**
 * Canonical portal copy for a step, matched by name when possible.
 * @param {Object} [step]
 */
export function canonicalAudienceInstructionsForStep(step = {}) {
  const kind = classifyWorkflowEmailKind(step?.name);
  const order = KIND_TO_ORDER[kind] ?? 0;
  return normalizeAudienceInstructions(canonicalAdmissionAudienceInstructions(order));
}

/**
 * Fill empty staff/admin/student instructions. Existing edits are kept.
 * @param {Object[]} steps
 */
export function applyCanonicalAudienceInstructions(steps = []) {
  return [...steps].map((step) => {
    const existing = normalizeAudienceInstructions(step);
    if (existing.staffInstructions && existing.adminInstructions && existing.studentInstructions) {
      return { ...step, ...existing };
    }
    const fallback = canonicalAudienceInstructionsForStep(step);
    return {
      ...step,
      staffInstructions: existing.staffInstructions || fallback.staffInstructions,
      adminInstructions: existing.adminInstructions || fallback.adminInstructions,
      studentInstructions: existing.studentInstructions || fallback.studentInstructions,
    };
  });
}

/**
 * Merge an AI pass onto steps, then fill any remaining gaps from canonical copy.
 * @param {Object[]} steps
 * @param {{ order: number, staffInstructions?: string, adminInstructions?: string, studentInstructions?: string }[]} generated
 */
export function mergeGeneratedAudienceInstructions(steps = [], generated = []) {
  const byOrder = new Map((generated ?? []).map((item) => [Number(item.order), item]));
  return applyCanonicalAudienceInstructions(
    steps.map((step) => {
      if (hasAudienceInstructions(step)) return step;
      const ai = byOrder.get(Number(step.order)) ?? {};
      const current = normalizeAudienceInstructions(step);
      return {
        ...step,
        staffInstructions: current.staffInstructions || clip(ai.staffInstructions),
        adminInstructions: current.adminInstructions || clip(ai.adminInstructions),
        studentInstructions: current.studentInstructions || clip(ai.studentInstructions),
      };
    }),
  );
}
