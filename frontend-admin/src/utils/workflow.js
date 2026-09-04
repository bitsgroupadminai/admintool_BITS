import { audienceInstructionsForStep } from './workflowAudienceInstructions';

export const HANDLER_TYPE = {
  STAFF: 'staff',
  STUDENT: 'student',
  AI: 'ai',
};

export const AI_HANDLERS = [
  {
    value: 'document_verification',
    label: 'AI — Verify documents and eligibility',
    description: 'Checks each upload and marks it eligible only when scores meet the programme rules.',
  },
  {
    value: 'eligibility_screening',
    label: 'AI — Screen eligibility',
    description: 'Cross-checks application data against eligibility rules.',
  },
  {
    value: 'template_validation',
    label: 'AI — Validate document format',
    description: 'Ensures documents follow required templates; flags fakes or mismatches.',
  },
];

export const OUTCOME_META = {
  approved: { label: 'Approved', emoji: '✅', tone: 'success' },
  rejected: { label: 'Rejected', emoji: '❌', tone: 'danger' },
  needs_correction: { label: 'Needs correction', emoji: '🛠', tone: 'warning' },
};

export const ROUTE_ACTION = {
  NEXT_STEP: 'next_step',
  END_WORKFLOW: 'end_workflow',
  RETURN_TO_STUDENT: 'return_to_student',
};

function uuid() {
  return crypto.randomUUID();
}

export function defaultOutcomes(nextStepId) {
  return [
    {
      type: 'approved',
      route: nextStepId
        ? { action: ROUTE_ACTION.NEXT_STEP, nextStepId }
        : { action: ROUTE_ACTION.END_WORKFLOW, terminalState: 'completed' },
    },
    {
      type: 'rejected',
      route: { action: ROUTE_ACTION.END_WORKFLOW, terminalState: 'rejected' },
    },
    {
      type: 'needs_correction',
      route: {
        action: ROUTE_ACTION.RETURN_TO_STUDENT,
        requireReupload: [],
      },
    },
  ];
}

export function createStep(order, nextStepId) {
  const stepId = uuid();
  return {
    stepId,
    order,
    name: order === 1 ? 'Document Verification' : 'Final Approval',
    description:
      order === 1
        ? 'Verify uploaded documents before proceeding.'
        : 'Staff makes the final decision.',
    handledBy: {
      type: order === 1 ? HANDLER_TYPE.AI : HANDLER_TYPE.STAFF,
      assignee: order === 1 ? 'document_verification' : 'approver',
    },
    slaValue: order === 1 ? 4 : 48,
    slaUnit: 'hours',
    ...audienceInstructionsForStep({
      name: order === 1 ? 'Document Verification' : 'Final Approval',
      order,
    }),
    studentEmail: { subject: '', headline: '', body: '' },
    outcomes: defaultOutcomes(nextStepId),
  };
}

export function hasAudienceInstructions(step) {
  return Boolean(
    String(step?.staffInstructions ?? '').trim() &&
      String(step?.adminInstructions ?? '').trim() &&
      String(step?.studentInstructions ?? '').trim(),
  );
}

export function hasStudentEmailTemplate(step) {
  return Boolean(
    String(step?.studentEmail?.subject ?? '').trim() &&
      String(step?.studentEmail?.body ?? '').trim(),
  );
}

const OUTCOME_TYPES = new Set(['approved', 'rejected', 'needs_correction']);

function canonicalizeOutcomes(outcomes, nextStepId) {
  const byType = new Map();
  for (const o of outcomes ?? []) {
    if (!OUTCOME_TYPES.has(o.type)) continue;
    const existing = byType.get(o.type);
    if (!existing) {
      byType.set(o.type, o);
      continue;
    }
    if (o.type === 'needs_correction') {
      const score =
        (o.route?.requireReupload?.length ?? 0) * 2 + (o.route?.returnToStepId ? 1 : 0);
      const prev =
        (existing.route?.requireReupload?.length ?? 0) * 2 +
        (existing.route?.returnToStepId ? 1 : 0);
      if (score > prev) byType.set(o.type, o);
    }
  }
  if (byType.size === 0) return defaultOutcomes(nextStepId);
  const approved = byType.get('approved');
  const rejected = byType.get('rejected');
  const needs = byType.get('needs_correction');
  return [
    approved ?? {
      type: 'approved',
      route: nextStepId
        ? { action: ROUTE_ACTION.NEXT_STEP, nextStepId }
        : { action: ROUTE_ACTION.END_WORKFLOW, terminalState: 'completed' },
    },
    rejected ?? {
      type: 'rejected',
      route: { action: ROUTE_ACTION.END_WORKFLOW, terminalState: 'rejected' },
    },
    needs ?? {
      type: 'needs_correction',
      route: {
        action: ROUTE_ACTION.RETURN_TO_STUDENT,
        requireReupload: [],
      },
    },
  ];
}

export function normalizeSteps(steps) {
  if (!steps?.length) return [];

  const hasV2 = steps.some((s) => s.stepId && s.handledBy && s.outcomes);
  if (hasV2) {
    const sorted = [...steps]
      .map((s, i) => ({ ...s, order: s.order ?? i + 1, stepId: s.stepId ?? uuid() }))
      .sort((a, b) => a.order - b.order);
    return relinkStepOutcomes(
      sorted.map((s, i) => ({
        ...s,
        outcomes: canonicalizeOutcomes(s.outcomes, sorted[i + 1]?.stepId ?? null),
      })),
    );
  }

  return steps.map((s, i, arr) => {
    const stepId = s.stepId ?? uuid();
    const next = arr[i + 1];
    const nextId = next?.stepId ?? null;
    return {
      stepId,
      order: s.order ?? i + 1,
      name: s.name,
      description: s.description ?? '',
      handledBy: s.handledBy ?? { type: HANDLER_TYPE.STAFF, assignee: s.assignedRole ?? 'general' },
      slaValue: s.slaValue ?? 24,
      slaUnit: s.slaUnit ?? 'hours',
      outcomes: defaultOutcomes(nextId),
    };
  });
}

export function relinkStepOutcomes(steps) {
  const sorted = [...steps].sort((a, b) => a.order - b.order);
  return sorted.map((step, i) => {
    const next = sorted[i + 1];
    return {
      ...step,
      outcomes: (step.outcomes ?? []).map((o) => {
        if (o.type !== 'approved') return o;
        if (!next) {
          return {
            ...o,
            route: { action: ROUTE_ACTION.END_WORKFLOW, terminalState: 'completed' },
          };
        }
        return {
          ...o,
          route: { action: ROUTE_ACTION.NEXT_STEP, nextStepId: next.stepId },
        };
      }),
    };
  });
}

export function getOutcomeSummary(step) {
  return (step.outcomes ?? [])
    .map((o) => {
      if (o.route.action === ROUTE_ACTION.END_WORKFLOW) {
        return o.type === 'rejected' ? 'Ends rejected' : 'Completes';
      }
      if (o.route.action === ROUTE_ACTION.RETURN_TO_STUDENT) return 'Returns to student';
      return 'Continues';
    })
    .join(' · ');
}

export function getHandlerLabel(handledBy, staffRoles) {
  if (!handledBy) return '—';
  if (handledBy.type === HANDLER_TYPE.STUDENT) return 'Student';
  if (handledBy.type === HANDLER_TYPE.AI) {
    return AI_HANDLERS.find((h) => h.value === handledBy.assignee)?.label ?? 'AI';
  }
  return staffRoles.find((r) => r.value === handledBy.assignee)?.label ?? handledBy.assignee;
}
