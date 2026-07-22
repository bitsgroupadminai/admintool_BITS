import { HANDLER_TYPE } from '../../shared/enums/workflow.enums.js';
import {
  autoAdvanceAiSteps,
  getCurrentWorkflowStep,
} from '../../shared/helpers/workflowExecution.helper.js';
import { isAiVerificationEnabled } from './ai-verification.config.js';

/**
 * Decide how to handle AI workflow steps for an application that just reached one.
 *
 * - When AI verification is enabled AND the current step is AI-handled, the step is
 *   left in place (status stays in_review) so the async worker can verify it.
 *   Returns true, signalling the caller to enqueue a verification job after saving.
 * - Otherwise falls back to the legacy behavior of auto-advancing AI steps.
 *
 * @param {import('../applications/application.model.js').Application} application
 * @param {{ userId?: string, name?: string, role?: string }} actor
 * @returns {boolean} whether an AI verification job should be enqueued after save
 */
export function settleAiWorkflowSteps(application, actor) {
  const step = getCurrentWorkflowStep(application);
  const isAiStep = step?.handledBy?.type === HANDLER_TYPE.AI;

  if (isAiVerificationEnabled() && isAiStep) {
    return true;
  }

  autoAdvanceAiSteps(application, actor);
  return false;
}
