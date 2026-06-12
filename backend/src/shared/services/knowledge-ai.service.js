import { chatJson, isOpenAiConfigured } from './openai.client.js';
import { buildCombinedDocumentText } from './document-text.service.js';
import { buildHeuristicServiceInsights } from './knowledge-heuristics.service.js';
import { logger } from '../../core/logger/index.js';
import {
  serviceInsightsResponseSchema,
  offeringEligibilityResponseSchema,
  offeringDocumentsResponseSchema,
  offeringWorkflowSkeletonResponseSchema,
  offeringWorkflowOutcomesResponseSchema,
  offeringQueueResponseSchema,
} from '../schemas/knowledge-ai.schemas.js';
import { mergeWorkflowSkeletonAndOutcomes } from '../helpers/workflow.helper.js';
import {
  ensureAdmissionWorkflowSkeleton,
  ensureAdmissionStepOutcomes,
  buildCanonicalAdmissionStepOutcomes,
} from '../helpers/admission-workflow.helper.js';
import { normalizeServiceInsightsPayload } from '../helpers/normalize-ai-response.helper.js';
import {
  SERVICE_INSIGHTS_SYSTEM_PROMPT,
  buildServiceInsightsUserPrompt,
  buildOfferingBaseContext,
  buildOfferingEligibilityUserPrompt,
  buildOfferingDocumentsUserPrompt,
  buildOfferingWorkflowSkeletonUserPrompt,
  buildOfferingWorkflowOutcomesUserPrompt,
  buildOfferingQueueUserPrompt,
  OFFERING_ELIGIBILITY_SYSTEM_PROMPT,
  OFFERING_DOCUMENTS_SYSTEM_PROMPT,
  OFFERING_WORKFLOW_SKELETON_SYSTEM_PROMPT,
  OFFERING_WORKFLOW_OUTCOMES_SYSTEM_PROMPT,
  OFFERING_QUEUE_SYSTEM_PROMPT,
} from '../prompts/index.js';

/**
 * @param {{ name: string, description?: string }} service
 * @param {Array} documents
 */
export async function generateServiceInsights(service, documents) {
  const docText = await buildCombinedDocumentText(documents);

  if (!isOpenAiConfigured()) {
    return {
      ...buildHeuristicServiceInsights(service, docText),
      analysisMode: 'heuristic',
      analysisWarning: null,
    };
  }

  if (!docText.trim()) {
    return {
      ...buildHeuristicServiceInsights(service, docText),
      analysisMode: 'heuristic',
      analysisWarning: 'No readable text in uploaded files.',
    };
  }

  try {
    const result = await chatJson({
      system: SERVICE_INSIGHTS_SYSTEM_PROMPT,
      user: buildServiceInsightsUserPrompt({
        serviceName: service.name,
        serviceDescription: service.description,
        docText,
      }),
      schema: serviceInsightsResponseSchema,
      normalize: normalizeServiceInsightsPayload,
    });

    const gaps = [...result.gaps];
    if (result.suggestedOfferings.length === 0) {
      gaps.push(
        'No explicitly named offerings were found in the document. Add clearer intake/category labels to the document, or create offerings manually.',
      );
    }

    return {
      understandingSummary: result.understandingSummary,
      chatbotReadinessSummary: result.chatbotReadinessSummary,
      chatbotCanAnswer: result.chatbotCanAnswer,
      gaps,
      suggestedOfferings: result.suggestedOfferings.map((o) => ({
        id: crypto.randomUUID(),
        name: o.name.trim(),
        description: o.description?.trim() ?? '',
        documentExcerpt: o.documentExcerpt.trim(),
        rationale: o.documentExcerpt.trim(),
        status: 'pending',
        source: 'ai',
      })),
      analysisMode: 'openai',
      analysisWarning: null,
    };
  } catch (err) {
    logger.warn({ err: err.message }, 'OpenAI service insights failed; using heuristics');
    const friendly = formatOpenAiError(err);
    return {
      ...buildHeuristicServiceInsights(service, docText),
      analysisMode: 'heuristic',
      analysisWarning: friendly,
    };
  }
}

function formatOpenAiError(err) {
  const msg = err?.message ?? String(err);
  if (msg.includes('insufficient_quota') || msg.includes('429')) {
    return 'OpenAI quota exceeded — add billing at platform.openai.com or use a key with credits. Showing basic fallback results.';
  }
  if (msg.includes('invalid_api_key') || msg.includes('401')) {
    return 'Invalid OpenAI API key — check OPENAI_API_KEY in backend/.env';
  }
  return `OpenAI analysis failed (${msg}). Showing basic fallback results.`;
}

/**
 * @param {Object} params
 */
export async function generateOfferingSectionSuggestions({
  service,
  offering,
  documents,
  insights,
  section,
  pendingDocumentRequirements,
}) {
  const docText = await buildCombinedDocumentText(documents);
  const priorRules = offering.eligibilityRules?.length
    ? JSON.stringify(offering.eligibilityRules, null, 2)
    : '(none yet)';
  const priorDocs = offering.documentRequirements?.length
    ? JSON.stringify(offering.documentRequirements, null, 2)
    : '(none yet)';

  if (!isOpenAiConfigured() || !docText.trim()) {
    return null;
  }

  const baseContext = buildOfferingBaseContext({
    serviceName: service.name,
    offeringName: offering.name,
    offeringDescription: offering.description,
    understandingSummary: insights?.understandingSummary,
    docText,
  });

  try {
    if (section === 'eligibility') {
      const result = await chatJson({
        system: OFFERING_ELIGIBILITY_SYSTEM_PROMPT,
        user: buildOfferingEligibilityUserPrompt({ baseContext, priorRules, offeringName: offering.name }),
        schema: offeringEligibilityResponseSchema,
      });
      return { eligibilityRules: result.eligibilityRules };
    }

    if (section === 'documents') {
      const result = await chatJson({
        system: OFFERING_DOCUMENTS_SYSTEM_PROMPT,
        user: buildOfferingDocumentsUserPrompt({
          baseContext,
          priorDocs,
          priorRules,
          offeringName: offering.name,
        }),
        schema: offeringDocumentsResponseSchema,
      });
      return { documentRequirements: result.documentRequirements };
    }

    if (section === 'workflow') {
      const documentNames = [
        ...(offering.documentRequirements ?? []),
        ...(pendingDocumentRequirements ?? []),
      ]
        .map((d) => d.name)
        .filter(Boolean);
      const uniqueDocNames = [...new Set(documentNames)];

      const skeletonResult = await chatJson({
        system: OFFERING_WORKFLOW_SKELETON_SYSTEM_PROMPT,
        user: buildOfferingWorkflowSkeletonUserPrompt({
          baseContext,
          priorRules,
          priorDocs,
          offeringName: offering.name,
        }),
        schema: offeringWorkflowSkeletonResponseSchema,
      });

      let skeletonSteps = ensureAdmissionWorkflowSkeleton(
        skeletonResult.workflowSteps ?? [],
        {
          offeringName: offering.name,
          docText,
          priorRules,
          priorDocs,
          documentNames: uniqueDocNames,
        },
      );

      if (!skeletonSteps.length) {
        return { workflowSteps: [] };
      }

      if (skeletonSteps.length !== (skeletonResult.workflowSteps?.length ?? 0)) {
        logger.info(
          {
            aiSteps: skeletonResult.workflowSteps?.length ?? 0,
            finalSteps: skeletonSteps.length,
          },
          'Adjusted admission workflow skeleton',
        );
      }

      const skeletonJson = JSON.stringify(skeletonSteps, null, 2);

      let stepOutcomes = [];
      try {
        const outcomesResult = await chatJson({
          system: OFFERING_WORKFLOW_OUTCOMES_SYSTEM_PROMPT,
          user: buildOfferingWorkflowOutcomesUserPrompt({
            baseContext,
            priorRules,
            priorDocs,
            documentNames: uniqueDocNames,
            offeringName: offering.name,
            workflowSkeletonJson: skeletonJson,
          }),
          schema: offeringWorkflowOutcomesResponseSchema,
        });
        stepOutcomes = outcomesResult.stepOutcomes ?? [];
      } catch (outcomesErr) {
        logger.warn(
          { err: outcomesErr.message, stepCount: skeletonSteps.length },
          'Workflow outcomes phase failed — using canonical admission routing where applicable',
        );
      }

      let alignedOutcomes = ensureAdmissionStepOutcomes(
        skeletonSteps,
        stepOutcomes,
        uniqueDocNames,
        docText,
        offering.name,
      );

      const missingOutcomes = alignedOutcomes.filter((e) => !e.outcomes?.length);
      if (missingOutcomes.length > 0) {
        const canonical = buildCanonicalAdmissionStepOutcomes(uniqueDocNames);
        alignedOutcomes = skeletonSteps.map((step) => {
          const entry = alignedOutcomes.find((e) => e.order === step.order);
          if (entry?.outcomes?.length >= 3) return entry;
          const fallback = canonical.find((c) => c.order === step.order);
          return { order: step.order, outcomes: fallback?.outcomes ?? [] };
        });
      }

      return {
        workflowSteps: mergeWorkflowSkeletonAndOutcomes(skeletonSteps, alignedOutcomes, {
          documentNames: uniqueDocNames,
        }),
      };
    }

    if (section === 'queue') {
      const result = await chatJson({
        system: OFFERING_QUEUE_SYSTEM_PROMPT,
        user: buildOfferingQueueUserPrompt({ baseContext }),
        schema: offeringQueueResponseSchema,
      });
      if (!result.queueMode) {
        return { queueMode: null };
      }
      return result;
    }
  } catch (err) {
    logger.warn({ err: err.message, section }, 'OpenAI offering section failed');
    return null;
  }

  return null;
}

