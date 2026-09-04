import crypto from 'crypto';
import { Offering } from './offering.model.js';
import { Service } from '../services/service.model.js';
import { KnowledgeDocument } from '../knowledge-documents/knowledgeDocument.model.js';
import { AppError } from '../../core/utils/AppError.js';
import {
  RULE_FIELD_TYPE,
  RULE_OPERATOR,
  QUEUE_MODE,
} from '../../shared/enums/offering.enums.js';
import { HANDLER_TYPE, AI_HANDLER } from '../../shared/enums/workflow.enums.js';
import { deriveOfferingStatus } from '../../shared/helpers/offeringCompleteness.helper.js';
import { validateOperatingHoursWindow } from '../../shared/helpers/operatingHours.helper.js';
import { formatOfferingResponse } from './offering.format.js';
import {
  createWorkflowStep,
  normalizeWorkflowSteps,
  sanitizeWorkflowSteps,
} from '../../shared/helpers/workflow.helper.js';
import { generateOfferingSectionSuggestions } from '../../shared/services/knowledge-ai.service.js';
import { isOpenAiConfigured } from '../../shared/services/openai.client.js';
import { cachedRead } from '../../shared/helpers/cachedRead.helper.js';
import { cacheNs } from '../../shared/constants/cacheKeys.js';
import { flushInstituteReadCache } from '../../shared/helpers/cacheInvalidation.helper.js';
import {
  applyEligibilityTemplateToDocuments,
  eligibilityFromGenericRules,
  flattenDocumentEligibility,
} from '../../shared/helpers/documentEligibility.helper.js';

/**
 * @param {string} offeringId
 * @param {string} instituteId
 * @param {string} [section]
 */
export async function generateSuggestions(offeringId, instituteId, section) {
  const offering = await Offering.findOne({ _id: offeringId, instituteId });
  if (!offering) {
    throw new AppError('Offering not found', 404);
  }

  const service = await Service.findOne({ _id: offering.serviceId, instituteId });
  const documents = await KnowledgeDocument.find({
    serviceId: offering.serviceId,
    instituteId,
  });
  const insights = service?.knowledgeInsights ?? null;
  const docText = documents.map((d) => d.extractedText ?? '').join('\n').slice(0, 12000);
  const context = buildContext(service, offering, docText, insights);

  const existing = offering.aiSuggestions ?? {};
  const payload = { ...existing.payload };

  const sectionsToGenerate = section
    ? [section]
    : ['eligibility', 'documents', 'workflow', 'queue'];

  const useExtractiveOnly = isOpenAiConfigured() && docText.trim();

  for (const sec of sectionsToGenerate) {
    const aiPart = await generateOfferingSectionSuggestions({
      service,
      offering,
      documents,
      insights,
      section: sec,
      pendingDocumentRequirements: payload.documentRequirements,
    });

    if (sec === 'eligibility') {
      if (aiPart !== null) {
        payload.eligibilityRules = aiPart.eligibilityRules ?? [];
      } else if (!useExtractiveOnly) {
        payload.eligibilityRules = buildEligibilitySuggestions(context);
      }
    }

    if (sec === 'documents') {
      if (aiPart !== null) {
        payload.documentRequirements = aiPart.documentRequirements ?? [];
      } else if (!useExtractiveOnly) {
        payload.documentRequirements = buildDocumentSuggestions(context, offering);
      }
    }

    if (sec === 'workflow') {
      if (aiPart !== null) {
        payload.workflowSteps =
          aiPart.workflowSteps?.length > 0
            ? validateAndLinkSteps(aiPart.workflowSteps)
            : [];
      } else if (!useExtractiveOnly) {
        payload.workflowSteps = buildWorkflowSuggestions(context, offering);
      }
    }

    if (sec === 'queue') {
      if (aiPart !== null && aiPart.queueMode) {
        Object.assign(payload, aiPart);
      } else if (!useExtractiveOnly && aiPart === null) {
        Object.assign(payload, buildQueueSuggestions(context));
      }
    }
  }

  const diff = buildDiff(offering, payload, section);

  offering.aiSuggestions = {
    generatedAt: new Date().toISOString(),
    sourceDocumentCount: documents.length,
    section: section ?? 'all',
    understandingSummary: insights?.understandingSummary ?? context.summary,
    chatbotCanAnswer: insights?.chatbotCanAnswer ?? [],
    gaps: insights?.gaps ?? [],
    diff,
    payload,
  };

  await offering.save();

  await flushInstituteReadCache(instituteId);
  const workflowNote =
    section === 'workflow' || !section
      ? ' Workflow uses two passes: list all steps, then fill outcomes per step.'
      : '';
  const aiNote = useExtractiveOnly
    ? ` Extracted verbatim from documents where explicitly stated.${workflowNote}`
    : ' (set OPENAI_API_KEY to extract exact rules, documents, and workflow steps from uploads)';

  return {
    message: documents.length
      ? `Suggestions generated for ${section ?? 'all sections'}. Review before applying.${aiNote}`
      : `Upload knowledge documents on the service page first.${aiNote}`,
    data: { suggestions: offering.aiSuggestions },
  };
}

/**
 * @param {string} offeringId
 * @param {string} instituteId
 */
export async function getSuggestions(offeringId, instituteId) {
  return cachedRead(cacheNs.OFFERING_SUGGESTIONS, [instituteId, offeringId], async () => {
  const offering = await Offering.findOne({ _id: offeringId, instituteId });
  if (!offering) {
    throw new AppError('Offering not found', 404);
  }
  return offering.aiSuggestions ?? null;
  });
}

/**
 * @param {string} offeringId
 * @param {string} instituteId
 * @param {Object} options
 */
export async function applySuggestions(offeringId, instituteId, options) {
  const offering = await Offering.findOne({ _id: offeringId, instituteId });
  if (!offering?.aiSuggestions?.payload) {
    throw new AppError('No pending AI suggestions', 400);
  }

  const { payload } = offering.aiSuggestions;
  const section = options.section;

  if ((!section || section === 'eligibility') && (options.acceptEligibility || section === 'eligibility')) {
    if (payload.eligibilityRules?.length) {
      offering.eligibilityRules = stripExtractedFields(payload.eligibilityRules);
      if (offering.documentRequirements?.length) {
        const template = eligibilityFromGenericRules(offering.eligibilityRules);
        offering.documentRequirements = applyEligibilityTemplateToDocuments(
          offering.documentRequirements,
          template,
        );
        offering.markModified('documentRequirements');
        const flattened = flattenDocumentEligibility(offering.documentRequirements);
        if (flattened.length) {
          offering.eligibilityRules = flattened;
        }
      }
    }
  }
  if ((!section || section === 'documents') && (options.acceptDocuments || section === 'documents')) {
    if (payload.documentRequirements?.length) {
      offering.documentRequirements = stripExtractedFields(payload.documentRequirements);
    }
  }
  if ((!section || section === 'workflow') && (options.acceptWorkflow || section === 'workflow')) {
    if (payload.workflowSteps?.length) {
      offering.workflowSteps = validateAndLinkSteps(stripWorkflowSteps(payload.workflowSteps));
    }
  }
  if ((!section || section === 'queue') && (options.acceptQueue || section === 'queue')) {
    if (payload.queueMode) {
      offering.queueMode = payload.queueMode;
      offering.queueConfig = payload.queueConfig;
      if (payload.appointmentConfig) {
        const hours = validateOperatingHoursWindow(
          payload.appointmentConfig.operatingHoursStart,
          payload.appointmentConfig.operatingHoursEnd,
        );
        offering.appointmentConfig = {
          ...payload.appointmentConfig,
          operatingHoursStart:
            hours.start ?? payload.appointmentConfig.operatingHoursStart ?? '09:00',
          operatingHoursEnd:
            hours.end ?? payload.appointmentConfig.operatingHoursEnd ?? '17:00',
        };
      } else {
        offering.appointmentConfig = undefined;
      }
    }
  }

  if (section) {
    offering.aiSuggestions.payload = {
      ...payload,
      ...(section === 'eligibility' && { eligibilityRules: undefined }),
      ...(section === 'documents' && { documentRequirements: undefined }),
      ...(section === 'workflow' && { workflowSteps: undefined }),
      ...(section === 'queue' && {
        queueMode: undefined,
        queueConfig: undefined,
        appointmentConfig: undefined,
      }),
    };
    const remaining = offering.aiSuggestions.payload;
    if (
      !remaining.eligibilityRules &&
      !remaining.documentRequirements &&
      !remaining.workflowSteps &&
      !remaining.queueMode
    ) {
      offering.aiSuggestions = null;
    }
  } else {
    offering.aiSuggestions = null;
  }

  offering.configurationVersion += 1;
  offering.status = deriveOfferingStatus(offering);
  await offering.save();

  await flushInstituteReadCache(instituteId);
  return formatOfferingResponse(offering);
}

function stripExtractedFields(items) {
  return items.map((item) => {
    const { documentExcerpt: _e, ...rest } = item;
    return rest;
  });
}

/** @param {Object[]} steps */
function stripWorkflowSteps(steps) {
  return steps.map((step) => {
    const {
      documentExcerpt: _e,
      handledByType: _ht,
      handledByAssignee: _ha,
      ...rest
    } = step;
    return rest;
  });
}

/** @param {Object[]} steps */
function validateAndLinkSteps(steps) {
  return sanitizeWorkflowSteps(normalizeWorkflowSteps(steps));
}

/**
 * @param {string} offeringId
 * @param {string} instituteId
 */
export async function rejectSuggestions(offeringId, instituteId) {
  const offering = await Offering.findOne({ _id: offeringId, instituteId });
  if (!offering) {
    throw new AppError('Offering not found', 404);
  }

  offering.aiSuggestions = null;
  await offering.save();
  await flushInstituteReadCache(instituteId);
  return formatOfferingResponse(offering);
}

function buildContext(service, offering, docText, insights) {
  const lower = `${service?.name} ${offering.name} ${docText}`.toLowerCase();
  return {
    lower,
    summary:
      insights?.understandingSummary ??
      `Configuration for ${offering.name} under ${service?.name}.`,
    isAdmission: lower.includes('admission') || lower.includes('admit'),
    hasFees: lower.includes('fee') || lower.includes('payment'),
  };
}

function buildEligibilitySuggestions(ctx) {
  const rules = [
    {
      field: ctx.isAdmission ? 'Marks' : 'CGPA',
      fieldType: RULE_FIELD_TYPE.NUMERIC,
      operator: RULE_OPERATOR.GTE,
      value: ctx.isAdmission ? 60 : 6,
    },
  ];
  if (ctx.hasFees) {
    rules.push({
      field: 'Fee Paid',
      fieldType: RULE_FIELD_TYPE.BOOLEAN,
      operator: RULE_OPERATOR.EQ,
      value: true,
    });
  }
  rules.push({
    field: 'Program',
    fieldType: RULE_FIELD_TYPE.TEXT,
    operator: RULE_OPERATOR.EQ,
    value: 'Eligible program',
  });
  return rules;
}

function buildDocumentSuggestions(ctx, offering) {
  const docs = [
    {
      name: 'Government ID',
      required: true,
      allowedTypes: ['pdf', 'jpg', 'jpeg', 'png'],
      maxSizeMb: 5,
    },
    {
      name: ctx.isAdmission ? '12th Marksheet' : 'Previous Marksheet',
      required: true,
      allowedTypes: ['pdf', 'jpg', 'jpeg', 'png'],
      maxSizeMb: 5,
    },
  ];
  if (ctx.isAdmission) {
    docs.push({
      name: '10th Marksheet',
      required: true,
      allowedTypes: ['pdf'],
      maxSizeMb: 5,
    });
  }
  if (offering.documentRequirements?.length) {
    return offering.documentRequirements;
  }
  return docs;
}

function buildWorkflowSuggestions(ctx, offering) {
  const step1Id = crypto.randomUUID();
  const step2Id = crypto.randomUUID();
  const step3Id = crypto.randomUUID();

  const steps = [
    {
      stepId: step1Id,
      order: 1,
      name: 'AI Document Review',
      description:
        'AI reviews uploaded documents for completeness, format, and basic authenticity signals. Flags suspicious submissions for staff.',
      handledBy: { type: HANDLER_TYPE.AI, assignee: AI_HANDLER.DOCUMENT_VERIFICATION },
      slaValue: 2,
      slaUnit: 'hours',
      outcomes: [
        {
          type: 'approved',
          route: { action: 'next_step', nextStepId: step2Id },
        },
        {
          type: 'rejected',
          route: { action: 'end_workflow', terminalState: 'rejected' },
        },
        {
          type: 'needs_correction',
          route: {
            action: 'return_to_student',
            returnToStepId: step1Id,
            requireReupload: ['Government ID', '12th Marksheet'],
          },
        },
      ],
    },
    {
      stepId: step2Id,
      order: 2,
      name: 'Eligibility Screening',
      description:
        'AI cross-checks application data against eligibility rules. Unclear cases are escalated to staff.',
      handledBy: { type: HANDLER_TYPE.AI, assignee: AI_HANDLER.ELIGIBILITY_SCREENING },
      slaValue: 4,
      slaUnit: 'hours',
      outcomes: [
        {
          type: 'approved',
          route: { action: 'next_step', nextStepId: step3Id },
        },
        {
          type: 'rejected',
          route: { action: 'end_workflow', terminalState: 'rejected' },
        },
        {
          type: 'needs_correction',
          route: {
            action: 'return_to_student',
            returnToStepId: step1Id,
            requireReupload: [],
          },
        },
      ],
    },
    {
      stepId: step3Id,
      order: 3,
      name: 'Final Approval',
      description: 'Staff makes the final decision after AI checks are complete.',
      handledBy: { type: HANDLER_TYPE.STAFF, assignee: 'approver' },
      slaValue: 48,
      slaUnit: 'hours',
      outcomes: [
        {
          type: 'approved',
          route: { action: 'end_workflow', terminalState: 'completed' },
        },
        {
          type: 'rejected',
          route: { action: 'end_workflow', terminalState: 'rejected' },
        },
        {
          type: 'needs_correction',
          route: {
            action: 'return_to_student',
            returnToStepId: step1Id,
            requireReupload: [],
          },
        },
      ],
    },
  ];

  if (!ctx.isAdmission) {
    return [createWorkflowStep(1), createWorkflowStep(2, null)];
  }

  return steps;
}

function buildQueueSuggestions(ctx) {
  return {
    queueMode: QUEUE_MODE.HYBRID,
    queueConfig: { capacity: 50, processingRatePerHour: 10 },
    appointmentConfig: {
      slotDurationMinutes: 15,
      slotCapacity: 5,
      operatingHoursStart: '09:00',
      operatingHoursEnd: '17:00',
    },
  };
}

/**
 * @param {import('./offering.model.js').Offering} current
 * @param {Object} suggested
 * @param {string} [section]
 */
function buildDiff(current, suggested, section) {
  const sections = [];
  const add = (key, label, hasCurrent) => {
    sections.push({ key, label, status: hasCurrent ? 'updated' : 'new' });
  };

  if (!section || section === 'eligibility') {
    if (suggested.eligibilityRules?.length) {
      add('eligibilityRules', 'Eligibility rules', !!current.eligibilityRules?.length);
    }
  }
  if (!section || section === 'documents') {
    if (suggested.documentRequirements?.length) {
      add('documentRequirements', 'Documents', !!current.documentRequirements?.length);
    }
  }
  if (!section || section === 'workflow') {
    if (suggested.workflowSteps?.length) {
      add('workflowSteps', 'Workflow journey', !!current.workflowSteps?.length);
    }
  }
  if (!section || section === 'queue') {
    if (suggested.queueMode) {
      add('queue', 'Queue / appointment', !!current.queueMode);
    }
  }

  return sections;
}
