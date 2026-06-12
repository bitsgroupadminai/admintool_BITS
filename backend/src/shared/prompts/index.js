/**
 * AI prompt templates for knowledge document analysis and offering configuration.
 *
 * - extraction-rules.prompt.js — interpretive vs extractive rules
 * - service-insights.prompt.js     — chatbot readiness (interpretive) + offerings (extractive)
 * - offering-config.prompt.js      — eligibility / documents / workflow / queue (extractive)
 */

export {
  SUMMARY_INTERPRETATION_RULES,
  DOCUMENT_EXTRACTION_RULES,
  OFFERING_DEFINITION,
} from './extraction-rules.prompt.js';

export {
  SERVICE_INSIGHTS_JSON_EXAMPLE,
  SERVICE_INSIGHTS_SYSTEM_PROMPT,
  buildServiceInsightsUserPrompt,
} from './service-insights.prompt.js';

export {
  WORKFLOW_SKELETON_EXTRACTION_RULES,
  WORKFLOW_OUTCOMES_EXTRACTION_RULES,
  WORKFLOW_SKELETON_JSON_EXAMPLE,
  WORKFLOW_OUTCOMES_JSON_EXAMPLE,
} from './workflow-extraction.prompt.js';

export { ADMISSION_WORKFLOW_REFERENCE } from './admission-workflow-reference.prompt.js';

export {
  OFFERING_ELIGIBILITY_SYSTEM_PROMPT,
  OFFERING_DOCUMENTS_SYSTEM_PROMPT,
  OFFERING_WORKFLOW_SKELETON_SYSTEM_PROMPT,
  OFFERING_WORKFLOW_OUTCOMES_SYSTEM_PROMPT,
  OFFERING_QUEUE_SYSTEM_PROMPT,
  buildOfferingBaseContext,
  buildOfferingEligibilityUserPrompt,
  buildOfferingDocumentsUserPrompt,
  buildOfferingWorkflowSkeletonUserPrompt,
  buildOfferingWorkflowOutcomesUserPrompt,
  buildOfferingQueueUserPrompt,
} from './offering-config.prompt.js';
