import { chatJson, isOpenAiConfigured } from './openai.client.js';
import { buildCombinedDocumentText } from './document-text.service.js';
import { buildHeuristicServiceInsights } from './knowledge-heuristics.service.js';
import { logger } from '../../core/logger/index.js';
import { env } from '../../core/config/env.js';
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
  extractStructuredOfferingsFromText,
  prepareInsightsDocumentText,
  mergeSuggestedOfferings,
  filterProgrammeOfferings,
  focusDocumentForOffering,
  extractEligibilityRulesFromText,
  mergeEligibilityRules,
  extractDocumentRequirementsFromText,
  mergeDocumentRequirements,
  extractQueueSettingsFromText,
  extractPaymentSettingsFromText,
} from '../helpers/structured-offerings.helper.js';
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
  const fullDocText = await buildCombinedDocumentText(documents);
  const structuredOfferings = extractStructuredOfferingsFromText(fullDocText);
  const insightsDocText = prepareInsightsDocumentText(fullDocText);

  if (!isOpenAiConfigured()) {
    return finalizeInsights(
      buildHeuristicServiceInsights(service, fullDocText, structuredOfferings),
      structuredOfferings,
      'heuristic',
      null,
    );
  }

  if (!fullDocText.trim()) {
    return finalizeInsights(
      buildHeuristicServiceInsights(service, fullDocText, structuredOfferings),
      structuredOfferings,
      'heuristic',
      'No readable text in uploaded files.',
    );
  }

  try {
    const result = await chatJson({
      system: SERVICE_INSIGHTS_SYSTEM_PROMPT,
      user: buildServiceInsightsUserPrompt({
        serviceName: service.name,
        serviceDescription: service.description,
        docText: insightsDocText,
      }),
      schema: serviceInsightsResponseSchema,
      normalize: normalizeServiceInsightsPayload,
      timeoutMs: env.OPENAI_INSIGHTS_TIMEOUT_MS,
    });

    const mergedOfferings = mergeSuggestedOfferings(
      filterProgrammeOfferings(result.suggestedOfferings),
      structuredOfferings,
    );

    const gaps = [...result.gaps];
    if (mergedOfferings.length === 0) {
      gaps.push(
        'No explicitly named offerings were found in the document. Add clearer intake/category labels to the document, or create offerings manually.',
      );
    } else if (result.suggestedOfferings.length < structuredOfferings.length) {
      gaps.push(
        `Structured catalogue listed ${structuredOfferings.length} offerings; merged list has ${mergedOfferings.length} after combining AI + document headers.`,
      );
    }

    return finalizeInsights(
      {
        understandingSummary: result.understandingSummary,
        chatbotReadinessSummary: result.chatbotReadinessSummary,
        chatbotCanAnswer: result.chatbotCanAnswer,
        gaps,
        suggestedOfferings: mergedOfferings,
      },
      structuredOfferings,
      'openai',
      null,
    );
  } catch (err) {
    logger.warn({ err: err.message }, 'OpenAI service insights failed; using heuristics');
    const friendly = formatOpenAiError(err);
    const heuristic = buildHeuristicServiceInsights(
      service,
      fullDocText,
      structuredOfferings,
    );
    return finalizeInsights(heuristic, structuredOfferings, 'heuristic', friendly);
  }
}

/**
 * @param {{
 *   understandingSummary: string,
 *   chatbotReadinessSummary: string,
 *   chatbotCanAnswer: string[],
 *   gaps: string[],
 *   suggestedOfferings: Array<{ name: string, description?: string, documentExcerpt: string }>,
 * }} base
 * @param {Array} structuredOfferings
 * @param {'openai'|'heuristic'} analysisMode
 * @param {string|null} analysisWarning
 */
function finalizeInsights(base, structuredOfferings, analysisMode, analysisWarning) {
  const merged = mergeSuggestedOfferings(
    filterProgrammeOfferings(base.suggestedOfferings ?? []),
    structuredOfferings,
  );
  const gaps = [...(base.gaps ?? [])];

  if (merged.length > 0) {
    const idx = gaps.findIndex((g) => /exact offering names/i.test(g));
    if (idx >= 0) gaps.splice(idx, 1);
  }

  return {
    understandingSummary: base.understandingSummary,
    chatbotReadinessSummary: base.chatbotReadinessSummary,
    chatbotCanAnswer: base.chatbotCanAnswer,
    gaps,
    suggestedOfferings: merged.map((o) => ({
      id: crypto.randomUUID(),
      name: o.name.trim(),
      description: o.description?.trim() ?? '',
      documentExcerpt: o.documentExcerpt.trim(),
      rationale: o.documentExcerpt.trim(),
      status: 'pending',
      source: analysisMode === 'openai' ? 'ai' : 'document',
    })),
    analysisMode,
    analysisWarning,
  };
}

function formatOpenAiError(err) {
  const msg = err?.message ?? String(err);
  if (msg.includes('insufficient_quota') || msg.includes('429')) {
    return 'OpenAI quota exceeded — add billing at platform.openai.com or use a key with credits. Showing basic fallback results.';
  }
  if (msg.includes('invalid_api_key') || msg.includes('401')) {
    return 'Invalid OpenAI API key — check OPENAI_API_KEY in backend/.env';
  }
  if (msg.includes('timed out')) {
    return 'OpenAI analysis timed out on a large document. Offering names were still extracted from the document structure where available.';
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
  const fullDocText = await buildCombinedDocumentText(documents);
  const priorRules = offering.eligibilityRules?.length
    ? JSON.stringify(offering.eligibilityRules, null, 2)
    : '(none yet)';
  const priorDocs = offering.documentRequirements?.length
    ? JSON.stringify(offering.documentRequirements, null, 2)
    : '(none yet)';

  if (!isOpenAiConfigured() || !fullDocText.trim()) {
    if (section === 'eligibility' && fullDocText.trim()) {
      const structured = extractEligibilityRulesFromText(fullDocText, offering.name);
      return structured.length ? { eligibilityRules: structured } : null;
    }
    if (section === 'documents' && fullDocText.trim()) {
      const structured = extractDocumentRequirementsFromText(fullDocText, offering.name);
      return structured.length ? { documentRequirements: structured } : null;
    }
    if (section === 'queue' && fullDocText.trim()) {
      return extractQueueSettingsFromText(fullDocText, offering.name);
    }
    return null;
  }

  const docText = focusDocumentForOffering(fullDocText, offering.name);

  const baseContext = buildOfferingBaseContext({
    serviceName: service.name,
    offeringName: offering.name,
    offeringDescription: offering.description,
    understandingSummary: insights?.understandingSummary,
    docText,
  });

  try {
    if (section === 'eligibility') {
      const structured = extractEligibilityRulesFromText(fullDocText, offering.name);
      let aiRules = [];
      try {
        const result = await chatJson({
          system: OFFERING_ELIGIBILITY_SYSTEM_PROMPT,
          user: buildOfferingEligibilityUserPrompt({
            baseContext,
            priorRules,
            priorDocs,
            offeringName: offering.name,
          }),
          schema: offeringEligibilityResponseSchema,
          timeoutMs: env.OPENAI_TIMEOUT_MS,
        });
        aiRules = result.eligibilityRules ?? [];
      } catch (eligibilityErr) {
        logger.warn(
          { err: eligibilityErr.message, offering: offering.name },
          'OpenAI eligibility extract failed; using structured document rules',
        );
      }
      const merged = mergeEligibilityRules(aiRules, structured);
      return { eligibilityRules: merged };
    }

    if (section === 'documents') {
      const structured = extractDocumentRequirementsFromText(fullDocText, offering.name);
      let aiDocs = [];
      try {
        const result = await chatJson({
          system: OFFERING_DOCUMENTS_SYSTEM_PROMPT,
          user: buildOfferingDocumentsUserPrompt({
            baseContext,
            priorDocs,
            priorRules,
            offeringName: offering.name,
          }),
          schema: offeringDocumentsResponseSchema,
          timeoutMs: env.OPENAI_TIMEOUT_MS,
        });
        aiDocs = result.documentRequirements ?? [];
      } catch (documentsErr) {
        logger.warn(
          { err: documentsErr.message, offering: offering.name },
          'OpenAI documents extract failed; using structured document list',
        );
      }
      return { documentRequirements: mergeDocumentRequirements(aiDocs, structured) };
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
      const structured = extractQueueSettingsFromText(fullDocText, offering.name);
      let aiQueue = null;
      try {
        const result = await chatJson({
          system: OFFERING_QUEUE_SYSTEM_PROMPT,
          user: buildOfferingQueueUserPrompt({ baseContext }),
          schema: offeringQueueResponseSchema,
          timeoutMs: env.OPENAI_TIMEOUT_MS,
        });
        if (result.queueMode) {
          aiQueue = result;
        }
      } catch (queueErr) {
        logger.warn(
          { err: queueErr.message, offering: offering.name },
          'OpenAI queue extract failed; using structured queue settings',
        );
      }

      const merged = aiQueue?.queueMode ? aiQueue : structured;
      if (!merged?.queueMode) {
        return { queueMode: null };
      }

      // Attach payment hint in payload for admin (payment step is configured separately)
      const payment = extractPaymentSettingsFromText(fullDocText, offering.name);
      return {
        ...merged,
        ...(payment ? { paymentHint: payment } : {}),
      };
    }
  } catch (err) {
    logger.warn({ err: err.message, section }, 'OpenAI offering section failed');
    return null;
  }

  return null;
}
