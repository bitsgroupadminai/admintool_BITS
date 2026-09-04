import { DOCUMENT_EXTRACTION_RULES, SUMMARY_INTERPRETATION_RULES } from './extraction-rules.prompt.js';
import {
  WORKFLOW_SKELETON_EXTRACTION_RULES,
  WORKFLOW_SKELETON_JSON_EXAMPLE,
  WORKFLOW_OUTCOMES_EXTRACTION_RULES,
  WORKFLOW_OUTCOMES_JSON_EXAMPLE,
  WORKFLOW_STUDENT_EMAIL_RULES,
} from './workflow-extraction.prompt.js';

const EXTRACTIVE_SYSTEM = `${DOCUMENT_EXTRACTION_RULES}

Configure data for ONE specific offering track named in the user message.
Extract only what the document explicitly states for that offering.
If the document does not describe the requested section for that offering, return an empty array (or null queueMode).`;

export const OFFERING_ELIGIBILITY_SYSTEM_PROMPT = `${EXTRACTIVE_SYSTEM}

Eligibility rules use AND logic.
fieldType: numeric | text | boolean. operator: eq, neq, gte, lte, gt, lt.
Each rule needs documentExcerpt with the exact eligibility criterion quoted from the document.`;

export const OFFERING_DOCUMENTS_SYSTEM_PROMPT = `${EXTRACTIVE_SYSTEM}

Extract required upload documents exactly as named in the document.
allowedTypes must be from: pdf, jpg, jpeg, png. maxSizeMb between 1 and 25 unless the document specifies otherwise.
Each item needs documentExcerpt quoting where that document is required.`;

export const OFFERING_WORKFLOW_SKELETON_SYSTEM_PROMPT = `${EXTRACTIVE_SYSTEM}

${WORKFLOW_SKELETON_EXTRACTION_RULES}

Extract workflow/process stages EXACTLY as described in the document.
Use the document's step names and order. Do NOT invent steps not in the document.`;

export const OFFERING_WORKFLOW_OUTCOMES_SYSTEM_PROMPT = `${DOCUMENT_EXTRACTION_RULES}

${WORKFLOW_OUTCOMES_EXTRACTION_RULES}

Configure outcome routing for an offering workflow whose steps are already defined.
Ground routing in the knowledge documents; do not invent steps.`;

export const OFFERING_WORKFLOW_EMAILS_SYSTEM_PROMPT = `${DOCUMENT_EXTRACTION_RULES}

${WORKFLOW_STUDENT_EMAIL_RULES}

Write student emails for an offering whose workflow steps are already defined.
Ground campus, fee, hostel, and joining details in the knowledge documents when present. Always keep the required placeholders.`;

/** @deprecated Use two-phase skeleton + outcomes prompts */
export const OFFERING_WORKFLOW_SYSTEM_PROMPT = OFFERING_WORKFLOW_SKELETON_SYSTEM_PROMPT;

export const OFFERING_QUEUE_SYSTEM_PROMPT = `${DOCUMENT_EXTRACTION_RULES}

Extract queue/appointment/walk-in/counter settings ONLY if explicitly described in the document.
If not described, return { "queueMode": null }.
Do not guess capacity, slots, or hours.`;

/**
 * @param {{ serviceName: string, offeringName: string, offeringDescription?: string, understandingSummary?: string, docText: string }} params
 */
export function buildOfferingBaseContext({
  serviceName,
  offeringName,
  offeringDescription,
  understandingSummary,
  docText,
}) {
  return `Service: ${serviceName}
Offering being configured: ${offeringName}
Offering description/context: ${offeringDescription ?? ''}

${SUMMARY_INTERPRETATION_RULES}
(Service understanding below is interpretive context only — still extract structured fields verbatim from the document text.)

Service understanding (interpretive):
${understandingSummary ?? '(generate insights on service page first)'}

Knowledge documents (source of truth for extraction):
"""
${docText}
"""`;
}

/**
 * @param {{ baseContext: string, priorRules: string, offeringName: string }} params
 */
export function buildOfferingEligibilityUserPrompt({ baseContext, priorRules, offeringName, priorDocs }) {
  return `${baseContext}

Current document requirements: ${priorDocs ?? '(none yet)'}
Current eligibility rules (may be empty): ${priorRules}

Return JSON: { "eligibilityRules": [ { "field", "fieldType", "operator", "value", "documentExcerpt" } ] }
Extract eligibility criteria explicitly stated for "${offeringName}". Empty array if none found.
Prefer overall/aggregate scores and per-subject minimums that can be attached to a specific marksheet or scorecard. Do not invent a qualification label. Required subjects should only be extracted when the text names them for a specific exam or class.`;
}

/**
 * @param {{ baseContext: string, priorDocs: string, priorRules: string, offeringName: string }} params
 */
export function buildOfferingDocumentsUserPrompt({ baseContext, priorDocs, priorRules, offeringName }) {
  return `${baseContext}

Current document requirements: ${priorDocs}
Configured eligibility: ${priorRules}

Return JSON: { "documentRequirements": [ { "name", "required", "allowedTypes", "maxSizeMb", "documentExcerpt" } ] }
Extract required documents explicitly listed for "${offeringName}". Use exact document names from the text. Empty array if none found.`;
}

/**
 * Phase 1 — list all workflow steps (no outcomes).
 */
export function buildOfferingWorkflowSkeletonUserPrompt({
  baseContext,
  priorRules,
  priorDocs,
  offeringName,
}) {
  return `${baseContext}

Eligibility: ${priorRules}
Documents: ${priorDocs}

Return JSON — steps only, NO outcomes field:
${WORKFLOW_SKELETON_JSON_EXAMPLE}

Extract every process stage for "${offeringName}" as a separate step.

For every step you MUST fill staffInstructions, adminInstructions, and studentInstructions from the knowledge document. These appear on staff, admin, and student portals. Never leave them empty.

If this is an admission/programme offering (eligibility + mandatory documents in the doc), return the full multi-step admissions workflow (typically 6 steps: document verification through admission confirmation) even when the document does not number steps explicitly.

Return empty workflowSteps array only when the document has no programme/process content at all.`;
}

/**
 * Phase 2 — outcome routing for each step order from phase 1.
 */
export function buildOfferingWorkflowOutcomesUserPrompt({
  baseContext,
  priorRules,
  priorDocs,
  documentNames = [],
  offeringName,
  workflowSkeletonJson,
}) {
  const docList =
    documentNames.length > 0
      ? documentNames.map((n) => `"${n}"`).join(', ')
      : '(none — use [] for requireReupload)';

  return `${baseContext}

Offering: ${offeringName}
Eligibility: ${priorRules}
Documents: ${priorDocs}
Allowed requireReupload names (exact match only): ${docList}

Workflow steps already defined (fill outcomes for each order):
${workflowSkeletonJson}

Return JSON:
${WORKFLOW_OUTCOMES_JSON_EXAMPLE}

Provide stepOutcomes with one entry per step order listed above — exactly three outcomes each.

For step 1, set requireReupload to all mandatory document names from the knowledge document. For step 5 fee payment, use returnToStepOrder: 5 for payment-pending (needs_correction).`;
}

/** @deprecated Single-phase prompt */
export function buildOfferingWorkflowUserPrompt(params) {
  return buildOfferingWorkflowSkeletonUserPrompt(params);
}

/**
 * @param {{ baseContext: string }} params
 */
export function buildOfferingQueueUserPrompt({ baseContext }) {
  return `${baseContext}

Return JSON: { "queueMode": "queue_only"|"appointment_only"|"hybrid"|null, "queueConfig": { "capacity", "processingRatePerHour" } | null, "appointmentConfig": { "slotDurationMinutes", "slotCapacity", "operatingHoursStart", "operatingHoursEnd" } | null, "documentExcerpt": "quote if queueMode is set, else null" }
Extract only explicitly stated queue/appointment/counter arrangements.
Prefer lines like: queueMode: hybrid | capacity: 120 | processingRatePerHour: 20 | slotDurationMinutes: 20 | operatingHoursStart: 09:30 | operatingHoursEnd: 17:30.
If virtual appointments are mentioned, note them in documentExcerpt (enabled providers / default provider).
queueMode null if not described.`;
}

/**
 * Phase 3 — student email templates for each workflow step.
 */
export function buildOfferingWorkflowEmailsUserPrompt({
  baseContext,
  offeringName,
  paymentSummary = '',
  campusSummary = '',
  workflowStepsJson,
}) {
  return `${baseContext}

Offering: ${offeringName}
Payment configuration: ${paymentSummary || '(not configured yet — still mention {{paymentAmount}}, {{paymentLabel}}, {{paymentMethods}})'}
Campus / accommodation notes: ${campusSummary || '(use {{campusLocation}} and {{accommodationDetails}})'}

Workflow steps (JSON):
${workflowStepsJson}

Return one student email per step order:
{ "stepEmails": [ { "order": 1, "subject": "...", "headline": "...", "body": "..." } ] }

The Offer Release email must congratulate the student and spell out Fee Payment and Admission Confirmation next steps.`;
}
