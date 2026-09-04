import { Application } from '../applications/application.model.js';
import { Offering } from '../offerings/offering.model.js';
import { Service } from '../services/service.model.js';
import { Institute } from '../institutes/institute.model.js';
import { User } from '../users/user.model.js';
import { APPLICATION_STATUS } from '../../shared/enums/application.enums.js';
import { HANDLER_TYPE, OUTCOME_TYPE, AI_HANDLER } from '../../shared/enums/workflow.enums.js';
import { ROLES } from '../../shared/constants/roles.js';
import {
  applyWorkflowOutcome,
  findStepOutcome,
  getCurrentWorkflowStep,
} from '../../shared/helpers/workflowExecution.helper.js';
import { formatDocumentRequirements, getIntakeDocumentRequirement } from '../../shared/helpers/applicationDocument.helper.js';
import { flattenDocumentEligibility, hasScopedDocumentEligibility } from '../../shared/helpers/documentEligibility.helper.js';
import { prepareDocumentForVerification } from '../../shared/services/document-text.service.js';
import { ensureApplicationFileLocal } from '../../shared/services/applicationFile.storage.js';
import { chatJson, chatVisionJson } from '../../shared/services/openai.client.js';
import { retrieveRelevantChunks } from '../../shared/services/rag.service.js';
import { refreshApplicationRuntime } from '../../shared/services/applicationRuntime.service.js';
import { notifyApplicationStatusChange } from '../../shared/templates/applicationEmails.js';
import { createNotification } from '../notifications/notification.service.js';
import { emitApplicationUpdated } from '../../shared/helpers/realtime.helper.js';
import { flushInstituteReadCache } from '../../shared/helpers/cacheInvalidation.helper.js';
import { logger } from '../../core/logger/index.js';
import {
  getDocumentVerificationSystemPrompt,
  getEligibilityVerificationSystemPrompt,
  getIntakeVerificationSystemPrompt,
  buildDocumentVerificationUserPrompt,
  buildEligibilityVerificationUserPrompt,
  buildIntakeVerificationUserPrompt,
} from '../../shared/prompts/index.js';
import {
  documentVerificationResponseSchema,
  eligibilityVerificationResponseSchema,
  intakeVerificationResponseSchema,
} from '../../shared/schemas/verification.schemas.js';
import { AiDecision, AI_DECISION_HANDLER, AI_DECISION_ACTION } from './aiDecision.model.js';
import { AI_VERIFICATION_MODEL, AI_VERIFY_THRESHOLDS, SAMPLE_DOCUMENT_TESTING_THRESHOLDS, isAiVerificationEnabled } from './ai-verification.config.js';
import { loadCurrentStudentName } from '../../shared/helpers/applicantIdentity.helper.js';
import { readAiVerificationConfig } from '../institutes/institute.settings.service.js';
import {
  INTERNAL_ACTION,
  decideDocumentAction,
  decideEligibilityAction,
  mergeExtractedFields,
  mergeEligibilityProfile,
  hydrateEligibilityDecision,
  hydrateDocumentVerificationDecision,
  ELIGIBILITY_VERDICT,
} from './ai-verification.decision.js';

export { isAiVerificationEnabled } from './ai-verification.config.js';

const AI_ACTOR = { userId: undefined, name: 'AI Verifier', role: 'ai' };

/**
 * Worker entry point. Processes consecutive AI workflow steps for an application:
 * runs real verification, auto-approves clear passes, returns clear failures for
 * correction, and escalates uncertain cases to staff.
 *
 * @param {{ instituteId: string, applicationId: string }} job
 */
export async function runApplicationAiVerification({ instituteId, applicationId }) {
  if (!isAiVerificationEnabled()) {
    return { skipped: 'ai_disabled' };
  }

  const application = await Application.findOne({ _id: applicationId, instituteId });
  if (!application) return { skipped: 'application_not_found' };

  const offering = await Offering.findOne({ _id: application.offeringId, instituteId });
  if (!offering) return { skipped: 'offering_not_found' };

  const initialStatus = application.status;
  const initialStepId = application.currentStepId;

  if (application.status !== APPLICATION_STATUS.IN_REVIEW) {
    if (application.aiVerificationPending) {
      application.aiVerificationPending = false;
      await application.save();
      await flushInstituteReadCache(instituteId);
      await emitAiVerificationUpdate(instituteId, application);
    }
    return { skipped: 'not_in_review', status: application.status };
  }

  const policyExcerpts = await loadPolicyExcerpts(application, offering);
  const allowSampleDocuments = Boolean(
    (await readAiVerificationConfig(instituteId)).allowSampleDocuments,
  );
  const processedSteps = [];
  let guard = 0;

  while (guard < 20) {
    guard += 1;

    if (application.status !== APPLICATION_STATUS.IN_REVIEW) break;

    const step = getCurrentWorkflowStep(application);
    if (!step || step.handledBy?.type !== HANDLER_TYPE.AI) break;

    const outcome = await evaluateAiStep({
      application,
      offering,
      step,
      policyExcerpts,
      allowSampleDocuments,
    });
    await applyAiOutcome({ instituteId, application, offering, step, outcome });
    processedSteps.push({ stepId: step.stepId, action: outcome.action });

    if (outcome.action !== INTERNAL_ACTION.APPROVE) break;
  }

  if (!processedSteps.length) {
    if (application.aiVerificationPending) {
      application.aiVerificationPending = false;
      await application.save();
      await flushInstituteReadCache(instituteId);
      await emitAiVerificationUpdate(instituteId, application);
    }
    return { skipped: 'no_ai_step', status: application.status };
  }

  application.aiVerificationPending = false;
  await refreshApplicationRuntime(application, instituteId);
  await application.save();
  await flushInstituteReadCache(instituteId);

  if (application.status !== initialStatus || application.currentStepId !== initialStepId) {
    await notifyOutcome(instituteId, application, offering);
  } else {
    await emitAiVerificationUpdate(instituteId, application);
  }

  return { processedSteps, status: application.status };
}

/**
 * Runs the model for one AI step and returns the intended action.
 * @returns {Promise<{ action: string, note: string, correctionRequiredDocuments: string[], decision: object }>}
 */
async function evaluateAiStep({ application, offering, step, policyExcerpts, allowSampleDocuments = false }) {
  const handler = step.handledBy?.assignee;

  try {
    if (handler === AI_HANDLER.ELIGIBILITY_SCREENING) {
      return await evaluateEligibilityStep({
        application,
        offering,
        step,
        policyExcerpts,
        allowSampleDocuments,
      });
    }
    // Default to document verification for document_verification and any other AI assignee.
    return await evaluateDocumentStep({
      application,
      offering,
      step,
      policyExcerpts,
      allowSampleDocuments,
    });
  } catch (err) {
    logger.error(
      { err, applicationId: application._id.toString(), stepId: step.stepId },
      'AI verification step failed',
    );
    return {
      action: INTERNAL_ACTION.ESCALATE,
      note: 'AI verification could not complete automatically. Please review manually.',
      correctionRequiredDocuments: [],
      decision: {
        handler: mapHandler(handler),
        action: AI_DECISION_ACTION.FAILED,
        error: err?.message ?? 'AI verification error',
      },
    };
  }
}

async function refreshApplicantNameFromProfile(application) {
  const liveName = await loadCurrentStudentName(
    application.instituteId,
    application.applicantEmail,
  );
  if (liveName && liveName !== application.applicantName) {
    application.applicantName = liveName;
  }
}

async function evaluateDocumentStep({
  application,
  offering,
  step,
  policyExcerpts,
  allowSampleDocuments = false,
}) {
  await refreshApplicantNameFromProfile(application);
  const { docs, images, anyUnreadable } = await gatherApplicationDocuments(application);
  const requiredDocuments = formatDocumentRequirements(offering.documentRequirements ?? []);
  const eligibilityRules = resolveOfferingEligibilityRules(offering);
  const promptOptions = { allowSampleDocuments };

  const user = buildDocumentVerificationUserPrompt({
    applicantName: application.applicantName,
    applicantEmail: application.applicantEmail,
    applicantMobile: application.applicantMobile,
    applicantDetails: application.applicantDetails,
    applicantFields: offering.applicantFields,
    requiredDocuments,
    documents: docs,
    policyExcerpts: allowSampleDocuments ? [] : policyExcerpts,
    allowSampleDocuments,
    eligibilityRules,
  });

  const raw = await callModel({
    system: getDocumentVerificationSystemPrompt(promptOptions),
    user,
    images,
    schema: documentVerificationResponseSchema,
  });

  logger.info(
    {
      applicationId: application._id.toString(),
      perDocument: (raw.perDocument ?? []).map((doc) => ({
        requirementName: doc.requirementName,
        subjectCount: doc.subjects?.length ?? 0,
        scoredSubjects: (doc.subjects ?? []).filter((subject) => subject?.score != null).length,
        aggregate: doc.aggregate ?? null,
      })),
    },
    'AI document extraction received',
  );

  const hydrated = hydrateDocumentVerificationDecision(
    {
      handler: AI_DECISION_HANDLER.DOCUMENT_VERIFICATION,
      verdict: raw.verdict,
      perDocument: raw.perDocument ?? [],
      extractedFields: mergeExtractedFields(raw.perDocument ?? [], raw.extractedFields ?? []),
    },
    {
      eligibilityRules,
      documents: application.documents ?? [],
      documentRequirements: offering.documentRequirements ?? [],
    },
  );

  const failingDocs = (hydrated.perDocument ?? [])
    .filter((doc) => doc.eligibilityVerdict === ELIGIBILITY_VERDICT.INELIGIBLE)
    .map((doc) => doc.requirementName)
    .filter(Boolean);

  const action = decideDocumentAction({
    verdict: raw.verdict,
    confidence: raw.confidence,
    thresholds: allowSampleDocuments ? SAMPLE_DOCUMENT_TESTING_THRESHOLDS : AI_VERIFY_THRESHOLDS,
    forceEscalate: allowSampleDocuments ? false : anyUnreadable && raw.verdict === 'pass',
    eligibilityEvaluation:
      eligibilityRules.length || hasScopedDocumentEligibility(offering.documentRequirements)
        ? hydrated.eligibilityResult
        : null,
  });

  const issues = [
    ...(hydrated.issues ?? []),
    ...formatEligibilityComparisonIssues(hydrated.eligibilityResult, hydrated.extractedFields),
  ].filter((issue, index, all) => issue && all.indexOf(issue) === index);

  return {
    action,
    note: buildNote({ ...raw, perDocument: hydrated.perDocument, issues }, action),
    correctionRequiredDocuments: action === INTERNAL_ACTION.RETURN ? failingDocs : [],
    decision: {
      handler: AI_DECISION_HANDLER.DOCUMENT_VERIFICATION,
      action: mapAction(action),
      verdict: hydrated.verdict,
      confidence: raw.confidence,
      summary:
        action === INTERNAL_ACTION.APPROVE
          ? buildEligibilitySummary(hydrated.eligibilityResult, raw.summary)
          : raw.summary,
      issues,
      perDocument: hydrated.perDocument,
      extractedFields: hydrated.extractedFields,
      eligibilityResult: hydrated.eligibilityResult,
      raw,
      modelUsed: AI_VERIFICATION_MODEL,
    },
  };
}

async function evaluateEligibilityStep({
  application,
  offering,
  step,
  policyExcerpts,
  allowSampleDocuments = false,
}) {
  const latestDocumentDecision = await AiDecision.findOne({
    applicationId: application._id,
    handler: AI_DECISION_HANDLER.DOCUMENT_VERIFICATION,
  })
    .sort({ createdAt: -1 })
    .lean();

  if (
    latestDocumentDecision &&
    (latestDocumentDecision.eligibilityResult ||
      (latestDocumentDecision.perDocument ?? []).some((doc) => doc.eligibilityVerdict))
  ) {
    const reusedAction =
      latestDocumentDecision.action === AI_DECISION_ACTION.APPROVED
        ? INTERNAL_ACTION.APPROVE
        : latestDocumentDecision.action === AI_DECISION_ACTION.RETURNED_FOR_CORRECTION
          ? INTERNAL_ACTION.RETURN
          : INTERNAL_ACTION.ESCALATE;
    return {
      action: reusedAction,
      note: latestDocumentDecision.summary ?? 'Eligibility was decided with document verification.',
      correctionRequiredDocuments: [],
      decision: {
        handler: AI_DECISION_HANDLER.ELIGIBILITY_SCREENING,
        action: latestDocumentDecision.action,
        verdict: latestDocumentDecision.verdict,
        confidence: latestDocumentDecision.confidence,
        summary: latestDocumentDecision.summary,
        issues: latestDocumentDecision.issues ?? [],
        perDocument: latestDocumentDecision.perDocument ?? [],
        extractedFields: latestDocumentDecision.extractedFields ?? [],
        eligibilityResult: latestDocumentDecision.eligibilityResult ?? null,
        modelUsed: latestDocumentDecision.modelUsed ?? AI_VERIFICATION_MODEL,
      },
    };
  }

  await refreshApplicantNameFromProfile(application);
  const { docs, images } = await gatherApplicationDocuments(application);
  const eligibilityRules = resolveOfferingEligibilityRules(offering);

  // No rules to check: nothing for AI to gate on, approve.
  if (!eligibilityRules.length && !hasScopedDocumentEligibility(offering.documentRequirements)) {
    return {
      action: INTERNAL_ACTION.APPROVE,
      note: 'No eligibility rules configured for this programme.',
      correctionRequiredDocuments: [],
      decision: {
        handler: AI_DECISION_HANDLER.ELIGIBILITY_SCREENING,
        action: AI_DECISION_ACTION.APPROVED,
        verdict: 'pass',
        confidence: 1,
        summary: 'No eligibility rules configured.',
        issues: [],
      },
    };
  }

  const user = buildEligibilityVerificationUserPrompt({
    applicantName: application.applicantName,
    applicantEmail: application.applicantEmail,
    applicantMobile: application.applicantMobile,
    applicantDetails: application.applicantDetails,
    applicantFields: offering.applicantFields,
    eligibilityRules,
    documents: docs,
    policyExcerpts: allowSampleDocuments ? [] : policyExcerpts,
    allowSampleDocuments,
  });

  const raw = await callModel({
    system: getEligibilityVerificationSystemPrompt({ allowSampleDocuments }),
    user,
    images,
    schema: eligibilityVerificationResponseSchema,
  });

  const extractedFields = mergeExtractedFields(raw.perDocument ?? [], raw.extractedFields ?? []);
  const hydrated = hydrateEligibilityDecision(
    {
      handler: AI_DECISION_HANDLER.ELIGIBILITY_SCREENING,
      verdict: raw.verdict,
      perDocument: raw.perDocument ?? [],
      extractedFields,
    },
    {
      eligibilityRules,
      documents: application.documents ?? [],
      documentRequirements: offering.documentRequirements ?? [],
    },
  );

  // Deterministic comparison against the actual rules using AI-extracted values.
  const thresholds = allowSampleDocuments ? SAMPLE_DOCUMENT_TESTING_THRESHOLDS : AI_VERIFY_THRESHOLDS;
  let action;
  let evaluation;
  if (hasScopedDocumentEligibility(offering.documentRequirements)) {
    evaluation = hydrated.eligibilityResult ?? { eligible: true, results: [] };
    const hasUnchecked = (evaluation.results ?? []).some((result) => result.status === 'unchecked');
    if (hasUnchecked || raw.verdict === 'uncertain') {
      action = INTERNAL_ACTION.ESCALATE;
    } else if (!evaluation.eligible) {
      action =
        raw.confidence >= thresholds.autoReject ? INTERNAL_ACTION.RETURN : INTERNAL_ACTION.ESCALATE;
    } else {
      action =
        raw.confidence >= thresholds.autoApprove ? INTERNAL_ACTION.APPROVE : INTERNAL_ACTION.ESCALATE;
    }
  } else {
    ({ action, evaluation } = decideEligibilityAction({
      verdict: hydrated.verdict,
      confidence: raw.confidence,
      extractedFields,
      eligibilityRules,
      thresholds,
      profile: mergeEligibilityProfile(hydrated.perDocument, extractedFields),
    }));
  }

  const comparisonIssues = formatEligibilityComparisonIssues(evaluation, extractedFields);
  const issues = comparisonIssues.length ? comparisonIssues : hydrated.issues ?? [];
  const summary = buildEligibilitySummary(evaluation, hydrated.summary);

  return {
    action,
    note: action === INTERNAL_ACTION.RETURN ? issues.join('\n') : summary,
    correctionRequiredDocuments: [],
    decision: {
      handler: AI_DECISION_HANDLER.ELIGIBILITY_SCREENING,
      action: mapAction(action),
      verdict: hydrated.verdict,
      confidence: raw.confidence,
      summary,
      issues,
      perDocument: hydrated.perDocument,
      extractedFields,
      eligibilityResult: evaluation,
      raw,
      modelUsed: AI_VERIFICATION_MODEL,
    },
  };
}

/**
 * Apply the decided action to the application workflow and persist an audit record.
 */
async function applyAiOutcome({ instituteId, application, offering, step, outcome }) {
  const decision = outcome.decision ?? {};

  if (outcome.action === INTERNAL_ACTION.APPROVE) {
    const stepOutcome = findStepOutcome(step, OUTCOME_TYPE.APPROVED);
    if (stepOutcome) {
      applyWorkflowOutcome(application, step, stepOutcome, { ...AI_ACTOR }, outcome.note ?? '');
    } else {
      escalateStep(application, step, 'No approval path configured for this step.');
      decision.action = AI_DECISION_ACTION.ESCALATED;
    }
  } else if (outcome.action === INTERNAL_ACTION.RETURN) {
    const stepOutcome =
      findStepOutcome(step, OUTCOME_TYPE.NEEDS_CORRECTION) ??
      findStepOutcome(step, OUTCOME_TYPE.REJECTED);
    if (stepOutcome) {
      applyWorkflowOutcome(application, step, stepOutcome, { ...AI_ACTOR }, outcome.note ?? '', {
        correctionRequiredDocuments: outcome.correctionRequiredDocuments ?? [],
      });
    } else {
      escalateStep(application, step, outcome.note ?? 'Issues found; manual review needed.');
      decision.action = AI_DECISION_ACTION.ESCALATED;
    }
  } else {
    escalateStep(application, step, outcome.note ?? 'AI was not confident; manual review needed.');
  }

  await persistDecision({ instituteId, application, offering, step, decision });
}

function escalateStep(application, step, note) {
  application.workflowHistory = application.workflowHistory ?? [];
  application.workflowHistory.push({
    stepId: step.stepId,
    stepName: step.name,
    outcome: 'escalated_to_staff',
    actedByName: AI_ACTOR.name,
    actedByRole: AI_ACTOR.role,
    note: note ?? '',
    createdAt: new Date(),
  });
  application.status = APPLICATION_STATUS.PENDING_AI_REVIEW;
  application.currentStepId = step.stepId;
}

async function persistDecision({ instituteId, application, offering, step, decision }) {
  try {
    await AiDecision.create({
      instituteId,
      applicationId: application._id,
      offeringId: offering._id,
      stepId: step.stepId,
      stepName: step.name,
      handler: decision.handler,
      action: decision.action,
      verdict: decision.verdict,
      confidence: decision.confidence,
      summary: decision.summary ?? '',
      issues: decision.issues ?? [],
      perDocument: decision.perDocument ?? [],
      extractedFields: decision.extractedFields ?? [],
      eligibilityResult: decision.eligibilityResult ?? null,
      modelUsed: decision.modelUsed ?? '',
      error: decision.error ?? '',
      raw: decision.raw ?? null,
    });
  } catch (err) {
    logger.error({ err, applicationId: application._id.toString() }, 'Failed to persist AiDecision');
  }
}

/* ------------------------------------------------------------------ */
/* Intake pre-screen                                                  */
/* ------------------------------------------------------------------ */

/**
 * Advisory AI pre-screen for an enrollment intake awaiting admin authorization.
 * Does NOT change status; stores a recommendation the admin can act on.
 *
 * @param {{ instituteId: string, applicationId: string }} params
 */
export async function runIntakeAiPrescreen({ instituteId, applicationId }) {
  if (!isAiVerificationEnabled()) {
    return { skipped: 'ai_disabled' };
  }

  const application = await Application.findOne({ _id: applicationId, instituteId });
  if (!application) return { skipped: 'application_not_found' };
  if (application.status !== APPLICATION_STATUS.PENDING_AUTHORIZATION) {
    return { skipped: 'not_pending_authorization' };
  }

  const offering = await Offering.findOne({ _id: application.offeringId, instituteId });
  if (!offering) return { skipped: 'offering_not_found' };

  try {
    await refreshApplicantNameFromProfile(application);
    if (application.isModified('applicantName')) {
      await application.save();
    }
    const allowSampleDocuments = Boolean(
      (await readAiVerificationConfig(instituteId)).allowSampleDocuments,
    );
    const { docs, images } = await gatherApplicationDocuments(application);
    const policyExcerpts = allowSampleDocuments ? [] : await loadPolicyExcerpts(application, offering);
    const intakeRequirement = getIntakeDocumentRequirement(offering);

    const user = buildIntakeVerificationUserPrompt({
      applicantName: application.applicantName,
      applicantEmail: application.applicantEmail,
      applicantMobile: application.applicantMobile,
      applicantDetails: application.applicantDetails,
      applicantFields: offering.applicantFields,
      offeringName: offering.name,
      intakeRequirement: intakeRequirement
        ? { label: intakeRequirement.name, helpText: offering.intakeDocument?.helpText }
        : null,
      documents: docs,
      policyExcerpts,
      allowSampleDocuments,
    });

    const raw = await callModel({
      system: getIntakeVerificationSystemPrompt({ allowSampleDocuments }),
      user,
      images,
      schema: intakeVerificationResponseSchema,
    });

    await persistDecision({
      instituteId,
      application,
      offering,
      step: { stepId: 'intake_authorization', name: 'Intake Authorization' },
      decision: {
        handler: AI_DECISION_HANDLER.INTAKE_AUTHORIZATION,
        action: AI_DECISION_ACTION.RECOMMENDATION,
        verdict: raw.verdict,
        confidence: raw.confidence,
        summary: raw.summary,
        issues: raw.issues ?? [],
        raw,
        modelUsed: AI_VERIFICATION_MODEL,
      },
    });

    // Refresh cached intake detail so the recommendation shows up for admins.
    await flushInstituteReadCache(instituteId);

    return { recommendation: raw.recommendation, confidence: raw.confidence };
  } catch (err) {
    logger.error({ err, applicationId }, 'Intake AI pre-screen failed');
    return { skipped: 'error', error: err?.message };
  }
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function buildNote(raw, action) {
  const labeledIssues = (raw.perDocument ?? [])
    .filter((doc) => doc.issue)
    .map((doc) =>
      doc.requirementName ? `${doc.requirementName}: ${doc.issue}` : doc.issue,
    );
  const issues = labeledIssues.length ? labeledIssues : raw.issues ?? [];
  if (action === INTERNAL_ACTION.RETURN) {
    return issues.length
      ? issues.join('\n')
      : raw.summary || 'Please review and re-upload the required documents.';
  }
  return raw.summary ?? '';
}

function formatEligibilityComparisonIssues(evaluation, extractedFields = []) {
  const excerptByField = new Map(
    extractedFields.map((field) => [
      String(field.field ?? '')
        .trim()
        .toLowerCase(),
      field.documentExcerpt,
    ]),
  );

  return (evaluation.results ?? [])
    .filter((result) => result.status === 'failed' || result.status === 'unchecked')
    .map((result) => {
      const excerpt = excerptByField.get(String(result.field ?? '').trim().toLowerCase());
      return excerpt ? `${result.message} Evidence: "${excerpt}"` : result.message;
    });
}

function buildEligibilitySummary(evaluation, extractionSummary) {
  if (!evaluation.eligible) {
    return 'The extracted values do not meet one or more eligibility criteria.';
  }
  if ((evaluation.results ?? []).some((result) => result.status === 'unchecked')) {
    return 'Some eligibility values could not be confirmed from the uploaded documents.';
  }
  return extractionSummary || 'The extracted values meet the configured eligibility criteria.';
}

async function emitAiVerificationUpdate(instituteId, application) {
  try {
    const studentUser = await User.findOne({
      instituteId,
      email: application.applicantEmail,
      role: ROLES.STUDENT,
    }).select('_id');

    emitApplicationUpdated({
      instituteId,
      applicationId: application._id.toString(),
      studentUserId: studentUser?._id?.toString() ?? null,
      assigneeUserId: application.assignedTo?.toString() ?? null,
      summary: {
        status: application.status,
        serviceId: application.serviceId.toString(),
        offeringId: application.offeringId.toString(),
        aiVerificationPending: Boolean(application.aiVerificationPending),
        updatedAt: application.updatedAt,
      },
    });
  } catch (err) {
    logger.error(
      { err, applicationId: application._id.toString() },
      'Failed to emit AI verification update',
    );
  }
}

async function callModel({ system, user, images, schema }) {
  if (images?.length) {
    return chatVisionJson({ system, user, images, schema, model: AI_VERIFICATION_MODEL });
  }
  return chatJson({ system, user, schema, timeoutMs: undefined, model: AI_VERIFICATION_MODEL });
}

async function gatherApplicationDocuments(application) {
  const docs = [];
  const images = [];
  let imageCount = 0;
  let anyUnreadable = false;

  for (const document of application.documents ?? []) {
    const localPath = await ensureApplicationFileLocal(document);
    const prep = await prepareDocumentForVerification(localPath, document.mimeType);
    const entry = {
      requirementName: document.requirementName,
      originalName: document.originalName,
      kind: prep.kind,
    };

    if (prep.kind === 'image') {
      const dataUrls = (prep.dataUrls?.length ? prep.dataUrls : [prep.dataUrl]).filter(Boolean);
      if (!dataUrls.length) {
        entry.kind = 'unreadable';
        entry.reason = 'Image could not be attached for verification';
        anyUnreadable = true;
      } else {
        const imageNumbers = [];
        for (const dataUrl of dataUrls) {
          imageCount += 1;
          imageNumbers.push(imageCount);
          images.push({ dataUrl, detail: 'high' });
        }
        entry.imageNumber = imageNumbers[0];
        entry.imageNumbers = imageNumbers;
        if (prep.text) entry.text = prep.text;
      }
    } else if (prep.kind === 'text') {
      entry.text = prep.text;
    } else {
      entry.reason = prep.reason;
      anyUnreadable = true;
    }

    docs.push(entry);
  }

  logger.info(
    {
      applicationId: application._id.toString(),
      documents: docs.map((doc) => ({
        requirementName: doc.requirementName,
        kind: doc.kind,
        imageNumbers: doc.imageNumbers,
        textChars: doc.text?.length ?? 0,
        reason: doc.reason,
      })),
    },
    'Prepared documents for AI verification',
  );

  return { docs, images, anyUnreadable };
}

async function loadPolicyExcerpts(application, offering) {
  try {
    const query = `${offering.name} admission document requirements and eligibility criteria`;
    const chunks = await retrieveRelevantChunks(
      application.instituteId.toString(),
      application.serviceId.toString(),
      query,
    );
    return chunks.slice(0, 5).map((chunk) => chunk.text?.slice(0, 700) ?? '').filter(Boolean);
  } catch {
    return [];
  }
}

function mapHandler(assignee) {
  if (assignee === AI_HANDLER.ELIGIBILITY_SCREENING) {
    return AI_DECISION_HANDLER.ELIGIBILITY_SCREENING;
  }
  return AI_DECISION_HANDLER.DOCUMENT_VERIFICATION;
}

function mapAction(action) {
  if (action === INTERNAL_ACTION.APPROVE) return AI_DECISION_ACTION.APPROVED;
  if (action === INTERNAL_ACTION.RETURN) return AI_DECISION_ACTION.RETURNED_FOR_CORRECTION;
  return AI_DECISION_ACTION.ESCALATED;
}

async function notifyOutcome(instituteId, application, offering) {
  try {
    const [service, institute] = await Promise.all([
      Service.findById(application.serviceId).select('name'),
      Institute.findById(instituteId).select('name'),
    ]);

    const context = {
      serviceName: service?.name ?? 'Service',
      offeringName: offering.name,
      instituteName: institute?.name ?? 'Your institute',
    };

    notifyApplicationStatusChange(application, context, application.status).catch(() => {});

    const studentUser = await User.findOne({
      instituteId,
      email: application.applicantEmail,
      role: ROLES.STUDENT,
    }).select('_id');

    if (studentUser) {
      createNotification({
        instituteId,
        userId: studentUser._id.toString(),
        type: 'status',
        title: 'Request status updated',
        body: `Your request is now: ${application.status.replace(/_/g, ' ')}`,
        link: `/services/${application.serviceId.toString()}`,
        metadata: { applicationId: application._id.toString(), status: application.status },
      }).catch(() => {});
    }

    emitApplicationUpdated({
      instituteId,
      applicationId: application._id.toString(),
      studentUserId: studentUser?._id?.toString() ?? null,
      assigneeUserId: application.assignedTo?.toString() ?? null,
      summary: {
        status: application.status,
        serviceId: application.serviceId.toString(),
        offeringId: application.offeringId.toString(),
        applicantName: application.applicantName,
        aiVerificationPending: Boolean(application.aiVerificationPending),
        updatedAt: application.updatedAt,
      },
    });
  } catch (err) {
    logger.error({ err, applicationId: application._id.toString() }, 'Failed to emit AI outcome notifications');
  }
}

function resolveOfferingEligibilityRules(offering) {
  const fromDocuments = flattenDocumentEligibility(offering?.documentRequirements ?? []);
  const source = fromDocuments.length ? fromDocuments : offering?.eligibilityRules ?? [];
  return source.map((rule) => ({
    field: rule.field,
    fieldType: rule.fieldType,
    operator: rule.operator,
    value: rule.value,
  }));
}
