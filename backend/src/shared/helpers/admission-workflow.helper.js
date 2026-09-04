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
 * @param {number} order
 */
export function canonicalAdmissionAudienceInstructions(order) {
  switch (order) {
    case 1:
      return {
        staffInstructions:
          'AI checks that each upload is the right document, is readable, and belongs to the student. Act only if AI escalates or a file needs a human override.',
        adminInstructions:
          'Same check as staff. You can re-run AI, override a file, or send the request back if uploads are wrong.',
        studentInstructions:
          'The institute checks that your uploads are the correct documents and belong to you. You wait unless you are asked to fix a file.',
      };
    case 2:
      return {
        staffInstructions:
          'AI compares extracted marks and subjects with this programme’s rules. Act only if eligibility could not be confirmed automatically.',
        adminInstructions:
          'Review the AI eligibility result if it is escalated. Completing this step means the student meets the published academic rules.',
        studentInstructions:
          'The institute checks your marks and subjects against the programme rules. You do not need to do anything on this step.',
      };
    case 3:
      return {
        staffInstructions:
          'Decide whether a seat can be offered. Check merit, qualifying marks, preferences, and remaining capacity, then allocate a seat or reject if none is available. The student cannot complete this step.',
        adminInstructions:
          'This is the seat decision. Completing it records that a seat is available and moves the student to offer release. Reject if there is no seat. Send back only if an earlier step must be repeated.',
        studentInstructions:
          'Admissions staff decide whether a seat can be offered, based on merit, your preferences, and remaining capacity. Wait here — there is nothing for you to submit.',
      };
    case 4:
      return {
        staffInstructions:
          'Generate and release the admission offer for the allocated seat. Completing this step notifies the student and moves them to fee payment.',
        adminInstructions:
          'Confirm the offer is ready, then complete this step so the student can pay. Reject only if the offer cannot be issued.',
        studentInstructions:
          'The institute is preparing your admission offer. You can continue once the offer is released.',
      };
    case 5:
      return {
        staffInstructions:
          'The student pays the admission fee. You do not allocate a seat here — wait until payment is recorded.',
        adminInstructions:
          'Monitor payment. Complete this step only after the fee is received, or send reminders if payment is still pending.',
        studentInstructions:
          'Pay the admission fee to complete this step.',
      };
    case 6:
      return {
        staffInstructions:
          'Do a final check after fee payment, then confirm admission. Completing this step closes the request as admitted.',
        adminInstructions:
          'Confirm admission after payment and any last verification. Completing this step admits the student.',
        studentInstructions:
          'The institute is doing a final check after your payment. You wait unless staff asks for a correction.',
      };
    default:
      return {
        staffInstructions: 'Complete the work this step requires, then move the request forward or reject it.',
        adminInstructions: 'Oversee this step. Complete it to progress the request, or send it back if an earlier stage must be repeated.',
        studentInstructions: 'The institute is working on this step. You wait unless you are asked to take an action.',
      };
  }
}
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
      ...canonicalAdmissionAudienceInstructions(1),
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
      ...canonicalAdmissionAudienceInstructions(2),
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
      ...canonicalAdmissionAudienceInstructions(3),
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
      ...canonicalAdmissionAudienceInstructions(4),
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
      ...canonicalAdmissionAudienceInstructions(5),
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
      ...canonicalAdmissionAudienceInstructions(6),
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
