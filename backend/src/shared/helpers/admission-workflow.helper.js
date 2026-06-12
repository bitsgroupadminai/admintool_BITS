import { ADMISSION_SKELETON_SIGNALS } from '../prompts/admission-workflow-reference.prompt.js';

/**
 * @param {string} offeringName
 * @param {string} docText
 * @param {string} [priorRules]
 * @param {string} [priorDocs]
 */
export function isAdmissionOfferingContext(offeringName, docText, priorRules = '', priorDocs = '') {
  const blob = `${offeringName} ${docText} ${priorRules} ${priorDocs}`.toLowerCase();
  const hits = ADMISSION_SKELETON_SIGNALS.filter((s) => blob.includes(s)).length;
  return hits >= 4;
}

/**
 * @param {string[]} documentNames
 * @param {string} [docExcerpt]
 */
export function buildCanonicalAdmissionSkeleton(documentNames, docExcerpt = '') {
  const excerpt = docExcerpt.slice(0, 280) || 'Admission programme knowledge document';
  const docsHint =
    documentNames.length > 0
      ? `Mandatory uploads include: ${documentNames.join(', ')}.`
      : 'Use mandatory documents from the knowledge document.';

  return [
    {
      order: 1,
      name: 'Document Verification',
      description: `Verify uploaded documents are complete, authentic, and readable. ${docsHint}`,
      handledByType: 'ai',
      handledByAssignee: 'document_verification',
      slaValue: 4,
      slaUnit: 'hours',
      documentExcerpt: excerpt,
    },
    {
      order: 2,
      name: 'Eligibility Validation',
      description:
        'Verify academic eligibility against programme rules (qualification, PCM subjects, aggregate and per-subject minimums).',
      handledByType: 'ai',
      handledByAssignee: 'eligibility_screening',
      slaValue: 24,
      slaUnit: 'hours',
      documentExcerpt: excerpt,
    },
    {
      order: 3,
      name: 'Seat Allocation & Merit Processing',
      description:
        'Determine seat availability based on rank, preferences, and counselling rules.',
      handledByType: 'staff',
      handledByAssignee: 'approver',
      slaValue: 48,
      slaUnit: 'hours',
      documentExcerpt: excerpt,
    },
    {
      order: 4,
      name: 'Offer Release',
      description: 'Generate and release admission offer to the applicant.',
      handledByType: 'staff',
      handledByAssignee: 'approver',
      slaValue: 48,
      slaUnit: 'hours',
      documentExcerpt: excerpt,
    },
    {
      order: 5,
      name: 'Fee Payment',
      description: 'Student completes admission fee payment before confirmation.',
      handledByType: 'student',
      handledByAssignee: 'student',
      slaValue: 72,
      slaUnit: 'hours',
      documentExcerpt: excerpt,
    },
    {
      order: 6,
      name: 'Admission Confirmation',
      description: 'Finalize admission after fee payment and final verification.',
      handledByType: 'staff',
      handledByAssignee: 'approver',
      slaValue: 24,
      slaUnit: 'hours',
      documentExcerpt: excerpt,
    },
  ];
}

/**
 * Canonical phase-2 outcomes for 6-step admission workflow (Workflow Builder v2 types).
 * @param {string[]} documentNames
 */
export function buildCanonicalAdmissionStepOutcomes(documentNames) {
  const reupload = [...documentNames];

  const step = (order, outcomes) => ({ order, outcomes });

  return [
    step(1, [
      { type: 'approved', route: { action: 'next_step', nextStepOrder: 2 } },
      { type: 'rejected', route: { action: 'end_workflow', terminalState: 'rejected' } },
      {
        type: 'needs_correction',
        route: {
          action: 'return_to_student',
          returnToStepOrder: null,
          requireReupload: reupload,
        },
      },
    ]),
    step(2, [
      { type: 'approved', route: { action: 'next_step', nextStepOrder: 3 } },
      { type: 'rejected', route: { action: 'end_workflow', terminalState: 'rejected' } },
      {
        type: 'needs_correction',
        route: { action: 'return_to_student', returnToStepOrder: null, requireReupload: [] },
      },
    ]),
    step(3, [
      { type: 'approved', route: { action: 'next_step', nextStepOrder: 4 } },
      { type: 'rejected', route: { action: 'end_workflow', terminalState: 'rejected' } },
      {
        type: 'needs_correction',
        route: { action: 'return_to_student', returnToStepOrder: null, requireReupload: [] },
      },
    ]),
    step(4, [
      { type: 'approved', route: { action: 'next_step', nextStepOrder: 5 } },
      { type: 'rejected', route: { action: 'end_workflow', terminalState: 'rejected' } },
      {
        type: 'needs_correction',
        route: { action: 'return_to_student', returnToStepOrder: null, requireReupload: [] },
      },
    ]),
    step(5, [
      { type: 'approved', route: { action: 'next_step', nextStepOrder: 6 } },
      { type: 'rejected', route: { action: 'end_workflow', terminalState: 'rejected' } },
      {
        type: 'needs_correction',
        route: {
          action: 'return_to_student',
          returnToStepOrder: 5,
          requireReupload: [],
        },
      },
    ]),
    step(6, [
      { type: 'approved', route: { action: 'end_workflow', terminalState: 'completed' } },
      { type: 'rejected', route: { action: 'end_workflow', terminalState: 'rejected' } },
      {
        type: 'needs_correction',
        route: { action: 'return_to_student', returnToStepOrder: 1, requireReupload: [] },
      },
    ]),
  ];
}

/**
 * Use canonical 6-step admission workflow when AI returns too few steps for an admission offering.
 * @param {Object[]} aiSkeleton
 * @param {{ offeringName: string, docText: string, priorRules?: string, priorDocs?: string, documentNames?: string[] }} ctx
 */
export function ensureAdmissionWorkflowSkeleton(aiSkeleton, ctx) {
  const { offeringName, docText, priorRules, priorDocs, documentNames = [] } = ctx;
  if (!isAdmissionOfferingContext(offeringName, docText, priorRules, priorDocs)) {
    return aiSkeleton;
  }

  const sorted = [...(aiSkeleton ?? [])].sort((a, b) => a.order - b.order);
  if (sorted.length >= 4) {
    return sorted;
  }

  return buildCanonicalAdmissionSkeleton(documentNames, docText);
}

/**
 * Fill missing outcome entries for admission workflow using canonical routing.
 * @param {Object[]} skeletonSteps
 * @param {{ order: number, outcomes: Object[] }[]} stepOutcomes
 * @param {string[]} documentNames
 * @param {string} docText
 * @param {string} offeringName
 */
export function ensureAdmissionStepOutcomes(
  skeletonSteps,
  stepOutcomes,
  documentNames,
  docText,
  offeringName,
) {
  if (!isAdmissionOfferingContext(offeringName, docText)) {
    return stepOutcomes;
  }

  const canonical = buildCanonicalAdmissionStepOutcomes(documentNames);
  const byOrder = new Map((stepOutcomes ?? []).map((e) => [e.order, e.outcomes]));

  return skeletonSteps.map((step) => {
    const aiOutcomes = byOrder.get(step.order);
    const fallback = canonical.find((c) => c.order === step.order)?.outcomes;
    const useCanonical = !aiOutcomes?.length || aiOutcomes.length < 3;
    return {
      order: step.order,
      outcomes: useCanonical ? fallback ?? [] : aiOutcomes,
    };
  });
}
