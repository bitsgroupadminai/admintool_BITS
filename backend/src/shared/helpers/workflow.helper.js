import crypto from 'crypto';
import { AppError } from '../../core/utils/AppError.js';
import {
  HANDLER_TYPE,
  AI_HANDLER,
  OUTCOME_TYPE,
  ROUTE_ACTION,
  TERMINAL_STATE,
} from '../enums/workflow.enums.js';

const STAFF_ASSIGNEES = new Set(['document_verifier', 'approver', 'counter_staff', 'general']);
const AI_ASSIGNEES = new Set(Object.values(AI_HANDLER));

/**
 * Mongoose subdocuments do not spread reliably; convert before normalization.
 * @param {unknown} value
 */
export function toPlainObject(value) {
  if (value == null || typeof value !== 'object') return value;
  if (typeof value.toObject === 'function') {
    return value.toObject({ flattenMaps: true, flattenObjectIds: true });
  }
  if (Array.isArray(value)) {
    return value.map(toPlainObject);
  }
  return value;
}

/**
 * @param {string} name
 * @param {number} order
 * @param {string} [nextStepId]
 */
export function defaultOutcomes(name, order, nextStepId) {
  return [
    {
      type: OUTCOME_TYPE.APPROVED,
      route: nextStepId
        ? { action: ROUTE_ACTION.NEXT_STEP, nextStepId }
        : { action: ROUTE_ACTION.END_WORKFLOW, terminalState: TERMINAL_STATE.COMPLETED },
    },
    {
      type: OUTCOME_TYPE.REJECTED,
      route: { action: ROUTE_ACTION.END_WORKFLOW, terminalState: TERMINAL_STATE.REJECTED },
    },
    {
      type: OUTCOME_TYPE.NEEDS_CORRECTION,
      route: {
        action: ROUTE_ACTION.RETURN_TO_STUDENT,
        returnToStepId: null,
        requireReupload: [],
      },
    },
  ];
}

/**
 * @param {number} order
 * @param {string} [nextStepId]
 */
export function createWorkflowStep(order, nextStepId) {
  const stepId = crypto.randomUUID();
  return {
    stepId,
    order,
    name: order === 1 ? 'Document Verification' : 'Final Approval',
    description:
      order === 1
        ? 'Verify uploaded documents before proceeding.'
        : 'Final review and decision on the request.',
    handledBy: {
      type: order === 1 ? HANDLER_TYPE.AI : HANDLER_TYPE.STAFF,
      assignee: order === 1 ? 'document_verification' : 'approver',
    },
    slaValue: 24,
    slaUnit: 'hours',
    outcomes: defaultOutcomes(order === 1 ? 'Document Verification' : 'Final Approval', order, nextStepId),
  };
}

/**
 * @param {Object} step
 * @param {number} index
 * @param {Object[]} all
 */
function migrateLegacyStep(step, index, all) {
  const stepId = step.stepId ?? crypto.randomUUID();
  const nextLegacy = all[index + 1];
  const nextStepId = nextLegacy?.stepId ?? nextLegacy?._id?.toString?.() ?? null;

  const outcomes = [];
  const actions = step.allowedActions ?? ['approve'];

  if (actions.includes('approve')) {
    outcomes.push({
      type: OUTCOME_TYPE.APPROVED,
      route: nextStepId
        ? { action: ROUTE_ACTION.NEXT_STEP, nextStepId }
        : { action: ROUTE_ACTION.END_WORKFLOW, terminalState: TERMINAL_STATE.COMPLETED },
    });
  }
  if (actions.includes('reject')) {
    outcomes.push({
      type: OUTCOME_TYPE.REJECTED,
      route: { action: ROUTE_ACTION.END_WORKFLOW, terminalState: TERMINAL_STATE.REJECTED },
    });
  }
  if (actions.includes('request_correction')) {
    outcomes.push({
      type: OUTCOME_TYPE.NEEDS_CORRECTION,
      route: {
        action: ROUTE_ACTION.RETURN_TO_STUDENT,
        returnToStepId: stepId,
        requireReupload: [],
      },
    });
  }

  if (!outcomes.length) {
    outcomes.push(...defaultOutcomes(step.name, step.order, nextStepId));
  }

  return {
    stepId,
    order: step.order ?? index + 1,
    name: step.name,
    description: step.description ?? '',
    handledBy: step.handledBy ?? {
      type: HANDLER_TYPE.STAFF,
      assignee: step.assignedRole ?? 'general',
    },
    slaValue: step.slaValue ?? 24,
    slaUnit: step.slaUnit ?? 'hours',
    outcomes,
  };
}

/**
 * @param {Object[]} steps
 */
const OUTCOME_TYPES = new Set(Object.values(OUTCOME_TYPE));

/**
 * Collapse duplicate outcome types to exactly approved, rejected, needs_correction.
 * @param {Object[]} outcomes
 * @param {{ stepIndex: number, nextStepId: string|null, stepId: string, documentNames?: string[] }} ctx
 */
export function canonicalizeStepOutcomes(outcomes, ctx) {
  const byType = new Map();

  for (const o of outcomes ?? []) {
    if (!OUTCOME_TYPES.has(o.type)) continue;
    const existing = byType.get(o.type);
    if (!existing) {
      byType.set(o.type, o);
      continue;
    }
    if (o.type === OUTCOME_TYPE.NEEDS_CORRECTION) {
      const score =
        (o.route?.requireReupload?.length ?? 0) * 2 + (o.route?.returnToStepId ? 1 : 0);
      const prev =
        (existing.route?.requireReupload?.length ?? 0) * 2 +
        (existing.route?.returnToStepId ? 1 : 0);
      if (score > prev) byType.set(o.type, o);
    }
  }

  const orderToId = ctx.orderToId ?? new Map();
  const stepIds = ctx.stepIds ?? [];

  return normalizeExtractedOutcomes(
    [...byType.values()],
    ctx.stepIndex,
    '',
    ctx.stepIndex + 1,
    ctx.nextStepId,
    orderToId,
    stepIds,
    ctx.documentNames ?? [],
  );
}

/**
 * @param {Object[]} steps
 */
export function sanitizeWorkflowSteps(steps) {
  if (!steps?.length) return [];

  const sorted = [...steps].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const stepIds = sorted.map((s) => s.stepId ?? crypto.randomUUID());
  const orderToId = new Map(sorted.map((s, i) => [s.order ?? i + 1, stepIds[i]]));

  const sanitized = sorted.map((s, i) => ({
    ...s,
    stepId: stepIds[i],
    order: s.order ?? i + 1,
    handledBy: s.handledBy?.type
      ? s.handledBy
      : normalizeHandler(
          s.handledByType ?? HANDLER_TYPE.STAFF,
          s.handledByAssignee ?? 'general',
        ),
    outcomes: canonicalizeStepOutcomes(s.outcomes, {
      stepIndex: i,
      nextStepId: stepIds[i + 1] ?? null,
      stepId: stepIds[i],
      orderToId,
      stepIds,
    }),
  }));

  return relinkWorkflowOutcomes(sanitized);
}

export function normalizeWorkflowSteps(steps) {
  if (!steps?.length) return [];

  const plainSteps = steps.map((step) => toPlainObject(step));
  const hasV2 = plainSteps.some((s) => s.stepId && s.handledBy && s.outcomes?.length);
  const normalized = hasV2
    ? plainSteps.map((s, i) => ({
        ...s,
        stepId: s.stepId ?? crypto.randomUUID(),
        order: s.order ?? i + 1,
      }))
    : plainSteps.map((s, i, arr) => migrateLegacyStep(s, i, arr));

  return sanitizeWorkflowSteps(normalized.sort((a, b) => a.order - b.order));
}

/**
 * @param {Object[]} steps
 */
export function validateWorkflowSteps(steps) {
  const normalized = normalizeWorkflowSteps(steps);
  if (!normalized.length) {
    throw new AppError('At least one workflow step is required', 400);
  }

  const ids = new Set(normalized.map((s) => s.stepId));

  for (const step of normalized) {
    if (!step.name?.trim()) {
      throw new AppError('Every step needs a name', 400);
    }
    if (!step.handledBy?.type || !step.handledBy?.assignee) {
      throw new AppError(`"${step.name}" must specify who handles it`, 400);
    }
    if (!step.slaValue || !step.slaUnit) {
      throw new AppError(`"${step.name}" must have an SLA`, 400);
    }
    if (!step.outcomes?.length) {
      throw new AppError(`"${step.name}" must define at least one outcome`, 400);
    }

    for (const outcome of step.outcomes) {
      const { route } = outcome;
      if (!route?.action) {
        throw new AppError(`Outcome routing incomplete on "${step.name}"`, 400);
      }
      if (route.action === ROUTE_ACTION.NEXT_STEP && !ids.has(route.nextStepId)) {
        throw new AppError(`Invalid next step reference on "${step.name}"`, 400);
      }
      if (route.action === ROUTE_ACTION.RETURN_TO_STUDENT && route.returnToStepId && !ids.has(route.returnToStepId)) {
        throw new AppError(`Invalid return step on "${step.name}"`, 400);
      }
    }
  }

  return normalized;
}

/**
 * @param {Object} step
 */
export function getStepOutcomeSummary(step) {
  return step.outcomes
    ?.map((o) => {
      if (o.route.action === ROUTE_ACTION.END_WORKFLOW) {
        return o.type === OUTCOME_TYPE.REJECTED ? 'Rejected' : 'Completes';
      }
      if (o.route.action === ROUTE_ACTION.RETURN_TO_STUDENT) return 'Returns to student';
      return 'Continues';
    })
    .join(' · ');
}

/**
 * Normalize handler from AI extraction payload.
 * @param {string} handledByType
 * @param {string} assignee
 */
function normalizeHandler(handledByType, assignee) {
  if (handledByType === HANDLER_TYPE.STUDENT) {
    return { type: HANDLER_TYPE.STUDENT, assignee: 'student' };
  }
  if (handledByType === HANDLER_TYPE.AI) {
    if (AI_ASSIGNEES.has(assignee)) {
      return { type: HANDLER_TYPE.AI, assignee };
    }
    return { type: HANDLER_TYPE.STAFF, assignee: 'general' };
  }
  const staffAssignee = STAFF_ASSIGNEES.has(assignee) ? assignee : 'general';
  return { type: HANDLER_TYPE.STAFF, assignee: staffAssignee };
}

/**
 * @param {Object} route
 * @param {number} stepIndex
 * @param {Map<number, string>} orderToId
 * @param {string[]} stepIds
 * @param {string[]} documentNames
 */
function mapExtractedRoute(route, stepIndex, orderToId, stepIds, documentNames) {
  const action = route?.action ?? ROUTE_ACTION.NEXT_STEP;

  if (action === ROUTE_ACTION.NEXT_STEP) {
    const nextId =
      (route.nextStepOrder != null ? orderToId.get(route.nextStepOrder) : null) ??
      stepIds[stepIndex + 1] ??
      null;
    return nextId ? { action: ROUTE_ACTION.NEXT_STEP, nextStepId: nextId } : {
      action: ROUTE_ACTION.END_WORKFLOW,
      terminalState: TERMINAL_STATE.COMPLETED,
    };
  }

  if (action === ROUTE_ACTION.END_WORKFLOW) {
    return {
      action: ROUTE_ACTION.END_WORKFLOW,
      terminalState:
        route.terminalState === TERMINAL_STATE.REJECTED
          ? TERMINAL_STATE.REJECTED
          : TERMINAL_STATE.COMPLETED,
    };
  }

  if (action === ROUTE_ACTION.RETURN_TO_STUDENT) {
    const returnToStepId =
      route.returnToStepOrder != null
        ? orderToId.get(route.returnToStepOrder) ?? null
        : null;
    const requireReupload = (route.requireReupload ?? []).filter(
      (name) => !documentNames.length || documentNames.includes(name),
    );
    return {
      action: ROUTE_ACTION.RETURN_TO_STUDENT,
      returnToStepId,
      requireReupload,
    };
  }

  return { action: ROUTE_ACTION.END_WORKFLOW, terminalState: TERMINAL_STATE.COMPLETED };
}

/**
 * @param {Object[]} rawOutcomes
 * @param {number} stepIndex
 * @param {string} stepName
 * @param {number} order
 * @param {string|null} defaultNextStepId
 * @param {Map<number, string>} orderToId
 * @param {string[]} stepIds
 * @param {string[]} documentNames
 */
function normalizeExtractedOutcomes(
  rawOutcomes,
  stepIndex,
  stepName,
  order,
  defaultNextStepId,
  orderToId,
  stepIds,
  documentNames,
) {
  const byType = new Map((rawOutcomes ?? []).map((o) => [o.type, o]));

  const build = (type, fallbackRoute) => {
    const raw = byType.get(type);
    const route = raw?.route
      ? mapExtractedRoute(raw.route, stepIndex, orderToId, stepIds, documentNames)
      : fallbackRoute;
    return { type, route };
  };

  const approvedFallback = defaultNextStepId
    ? { action: ROUTE_ACTION.NEXT_STEP, nextStepId: defaultNextStepId }
    : { action: ROUTE_ACTION.END_WORKFLOW, terminalState: TERMINAL_STATE.COMPLETED };

  return [
    build(OUTCOME_TYPE.APPROVED, approvedFallback),
    build(OUTCOME_TYPE.REJECTED, {
      action: ROUTE_ACTION.END_WORKFLOW,
      terminalState: TERMINAL_STATE.REJECTED,
    }),
    build(OUTCOME_TYPE.NEEDS_CORRECTION, {
      action: ROUTE_ACTION.RETURN_TO_STUDENT,
      returnToStepId: null,
      requireReupload: [],
    }),
  ];
}

/**
 * Merge phase-1 skeleton with phase-2 outcomes, then map to Workflow Builder v2 steps.
 * @param {Object[]} skeletonSteps
 * @param {{ order: number, outcomes: Object[] }[]} stepOutcomes
 * @param {{ documentNames?: string[] }} [options]
 */
export function mergeWorkflowSkeletonAndOutcomes(skeletonSteps, stepOutcomes, options = {}) {
  const outcomesByOrder = new Map(
    (stepOutcomes ?? []).map((entry) => [entry.order, entry.outcomes]),
  );

  const merged = [...skeletonSteps]
    .sort((a, b) => a.order - b.order)
    .map((step) => ({
      ...step,
      outcomes: outcomesByOrder.get(step.order) ?? [],
    }));

  return mapExtractedWorkflowSteps(merged, options);
}

/**
 * Convert AI workflow extraction into Workflow Builder v2 steps (stepId + outcomes linked).
 * @param {Object[]} rawSteps
 * @param {{ documentNames?: string[] }} [options]
 */
export function mapExtractedWorkflowSteps(rawSteps, options = {}) {
  if (!rawSteps?.length) return [];

  const documentNames = options.documentNames ?? [];
  const sorted = [...rawSteps].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const stepIds = sorted.map(() => crypto.randomUUID());
  const orderToId = new Map(sorted.map((s, i) => [s.order ?? i + 1, stepIds[i]]));

  const mapped = sorted.map((s, i) => {
    const order = s.order ?? i + 1;
    const nextStepId = stepIds[i + 1] ?? null;
    const handledBy = normalizeHandler(s.handledByType, s.handledByAssignee);

    const outcomes = normalizeExtractedOutcomes(
      s.outcomes,
      i,
      s.name,
      order,
      nextStepId,
      orderToId,
      stepIds,
      documentNames,
    );

    const { documentExcerpt: _excerpt, handledByType: _t, handledByAssignee: _a, ...rest } = s;

    return {
      ...rest,
      stepId: stepIds[i],
      order,
      name: s.name,
      description: s.description ?? '',
      handledBy,
      slaValue: s.slaValue ?? 24,
      slaUnit: s.slaUnit ?? 'hours',
      outcomes,
    };
  });

  return relinkWorkflowOutcomes(mapped);
}

/**
 * Ensure approved routes point to the next step in order when using next_step.
 * @param {Object[]} steps
 */
export function relinkWorkflowOutcomes(steps) {
  const sorted = [...steps].sort((a, b) => a.order - b.order);
  return sorted.map((step, i) => {
    const next = sorted[i + 1];
    return {
      ...step,
      outcomes: (step.outcomes ?? []).map((outcome) => {
        if (outcome.type !== OUTCOME_TYPE.APPROVED) return outcome;
        if (!next) {
          return {
            ...outcome,
            route: {
              action: ROUTE_ACTION.END_WORKFLOW,
              terminalState: TERMINAL_STATE.COMPLETED,
            },
          };
        }
        if (outcome.route?.action === ROUTE_ACTION.NEXT_STEP) {
          return {
            ...outcome,
            route: { action: ROUTE_ACTION.NEXT_STEP, nextStepId: next.stepId },
          };
        }
        return outcome;
      }),
    };
  });
}
