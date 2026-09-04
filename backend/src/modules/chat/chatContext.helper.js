import { describeEligibilityRequirement } from '../../shared/helpers/eligibilityEvaluation.helper.js';
import { formatWorkflowForClient } from '../../shared/helpers/workflowExecution.helper.js';
import { ROLES } from '../../shared/constants/roles.js';

const STEP_STATE_LABEL = {
  complete: 'Done',
  current: 'In progress',
  upcoming: 'Upcoming',
};

const CRITERION_LABEL = {
  passed: 'Met',
  failed: 'Not met',
  not_applicable: 'Not checked on this document',
  unchecked: 'Could not confirm',
};

const OUTCOME_LABEL = {
  approved: 'Completed',
  rejected: 'Not approved',
  needs_correction: 'Sent back for corrections',
  returned_for_correction: 'Sent back for corrections',
  rolled_back: 'Moved back to an earlier step',
  escalated_to_staff: 'Sent to staff for review',
};

const AI_ACTION_LABEL = {
  approved: 'Completed',
  returned_for_correction: 'Returned for corrections',
  escalated: 'Sent to staff for review',
  recommendation: 'Sent to staff with a recommendation',
  failed: 'Could not finish automatically',
};

const DOCUMENT_REVIEW_LABEL = {
  pending: 'Awaiting review',
  approved: 'Approved',
  rejected: 'Not accepted',
  needs_correction: 'Needs a new upload',
};

export function humanEligibilityRule(rule) {
  if (!rule) return '';
  const requirement = describeEligibilityRequirement(rule.operator, rule.value);
  const field = String(rule.field ?? '').trim();
  if (!field) return requirement;
  return `${field}: ${requirement}`;
}

export function looksLikeTechnicalSource(text) {
  const value = String(text ?? '').trim();
  if (!value) return false;
  if (/studentContext|retrievedKnowledge|conversationHistory|focusOffering/i.test(value)) {
    return true;
  }
  if (/\[[0-9]+\]/.test(value)) return true;
  if (/\b(offerings|application|perDocument|extractedFields|eligibilityResult)\s*[.\[]/i.test(value)) {
    return true;
  }
  if (/^[a-zA-Z]+(\.[a-zA-Z][a-zA-Z0-9]*){1,}$/.test(value) && /eligibility|status|documentsComplete|workflow/i.test(value)) {
    return true;
  }
  return false;
}

function criterionLabel(status) {
  return CRITERION_LABEL[status] ?? 'Could not confirm';
}

function documentEligibilityLabel(doc) {
  const evaluation = doc?.eligibilityResult;
  if (evaluation?.eligible === false) return 'Not eligible';
  if (evaluation?.eligible === true) {
    const unchecked = (evaluation.results ?? []).some((result) => result.status === 'unchecked');
    return unchecked ? 'Could not fully confirm' : 'Eligible';
  }
  if (doc?.verdict === 'fail') return 'Not eligible';
  if (doc?.verdict === 'pass') return 'Eligible';
  return 'Could not confirm';
}

function overallEligibilityLabel(decision) {
  if (!decision) return null;
  const evaluation = decision.eligibilityResult;
  if (evaluation?.eligible === false) return 'Not eligible';
  if ((evaluation?.results ?? []).some((result) => result.status === 'unchecked')) {
    return 'Could not fully confirm';
  }
  if (evaluation?.eligible === true) return 'Eligible';
  if (decision.verdict === 'fail') return 'Not eligible';
  if (decision.verdict === 'pass') return 'Eligible';
  return null;
}

function formatSubjectRows(doc) {
  const checks = (doc.eligibilityResult?.results ?? []).flatMap((result) => result.scoreChecks ?? []);
  const checksByName = new Map(
    checks.map((item) => [String(item.name ?? '').trim().toLowerCase(), item]),
  );
  const threshold = (doc.eligibilityResult?.results ?? []).find((result) =>
    /threshold/i.test(String(result.field ?? '')),
  );
  const defaultRequired = threshold?.expected ?? null;
  const seen = new Set();
  const source = (doc.subjects ?? []).length
    ? doc.subjects
    : checks.map((item) => ({ name: item.name, score: item.score, grade: item.grade }));

  return source
    .map((subject) => {
      const name = String(subject.name ?? '').trim();
      const key = name.toLowerCase();
      if (!name || seen.has(key)) return null;
      seen.add(key);
      const check = checksByName.get(key);
      const score = subject.score ?? check?.score ?? null;
      const required = check?.required ?? defaultRequired ?? null;
      let result = check?.status;
      if (!result && score != null && required != null && Number.isFinite(Number(score)) && Number.isFinite(Number(required))) {
        result = Number(score) >= Number(required) ? 'passed' : 'failed';
      }
      return {
        name,
        score,
        maxScore: subject.maxScore ?? null,
        grade: subject.grade || check?.grade || '',
        required,
        result: criterionLabel(result),
      };
    })
    .filter(Boolean);
}

function formatCriteria(doc) {
  return (doc.eligibilityResult?.results ?? [])
    .filter((result) => result.status !== 'not_applicable')
    .map((result) => ({
      name: result.field,
      required: result.requirement || String(result.expected ?? ''),
      yourValue: result.actual == null || result.actual === '' ? 'Not found on this document' : String(result.actual),
      result: criterionLabel(result.status),
    }));
}

function excerptForExtractedDocument(doc) {
  const parts = [];
  if (doc.eligibility) parts.push(doc.eligibility);
  if (doc.aggregate != null) parts.push(`Aggregate ${doc.aggregate}`);
  if (doc.examScore != null) parts.push(`Exam score ${doc.examScore}`);
  const scored = (doc.subjects ?? [])
    .filter((subject) => subject.score != null)
    .slice(0, 4)
    .map((subject) => `${subject.name} ${subject.score}`);
  if (scored.length) parts.push(scored.join(', '));
  return parts.join(' · ').slice(0, 180);
}

export function formatExtractedDocument(doc) {
  const documentName = String(doc?.requirementName ?? '').trim() || 'Uploaded document';
  const subjects = formatSubjectRows(doc);
  const failedCriteria = (doc?.eligibilityResult?.results ?? [])
    .filter((result) => result.status === 'failed' || result.status === 'unchecked')
    .map((result) => result.message)
    .filter(Boolean);
  const formatted = {
    documentName,
    eligibility: documentEligibilityLabel(doc),
    qualification: doc?.qualification || '',
    aggregate: doc?.aggregate ?? null,
    examScore: doc?.examScore ?? null,
    subjects,
    criteria: formatCriteria(doc),
    aiComments: [doc?.issue, ...failedCriteria].filter(Boolean),
  };
  return {
    ...formatted,
    excerpt: excerptForExtractedDocument(formatted),
  };
}

function actorLabel(role, name) {
  const text = String(role ?? '').toLowerCase();
  const displayName = String(name ?? '').trim();
  if (text === 'ai' || /ai verifier|\(system\)/i.test(displayName)) return 'AI review';
  if (text === 'admin') return displayName ? `Institute admin (${displayName})` : 'Institute admin';
  if (text === 'staff') return displayName ? `Institute staff (${displayName})` : 'Institute staff';
  if (text === 'student') return 'You';
  return displayName || 'Institute office';
}

function formatUploadedDocuments(application) {
  return (application?.documents ?? [])
    .map((document) => ({
      name: document.requirementName || document.originalName || 'Uploaded document',
      fileName: document.originalName || '',
      reviewStatus: DOCUMENT_REVIEW_LABEL[document.reviewStatus] ?? '',
      staffComment: String(document.reviewNote ?? '').trim(),
      reviewedBy: document.reviewedByName ? actorLabel('staff', document.reviewedByName) : '',
    }))
    .filter((document) => document.name);
}

function formatWorkflowProgress(application, offering) {
  if (!application && !offering) return null;
  const workflow = application
    ? formatWorkflowForClient(application, { role: ROLES.STUDENT })
    : { currentStep: null, steps: [], history: [], correctionNote: '', correctionRequiredDocuments: [] };
  const sourceSteps = workflow.steps?.length
    ? workflow.steps
    : [...(offering?.workflowSteps ?? [])]
        .sort((a, b) => a.order - b.order)
        .map((step, index) => ({
          order: step.order,
          name: step.name,
          studentInstructions: step.studentInstructions ?? '',
          description: step.description ?? '',
          state: index === 0 && application ? 'current' : 'upcoming',
        }));
  const steps = sourceSteps.map((step) => ({
    order: step.order,
    name: step.name,
    progress: STEP_STATE_LABEL[step.state] ?? step.state ?? 'Upcoming',
    whatThisMeansForYou: step.studentInstructions || step.description || '',
  }));
  return {
    currentStep: workflow.currentStep?.name ?? steps.find((step) => step.progress === 'In progress')?.name ?? null,
    steps,
    history: (workflow.history ?? []).map((entry) => ({
      stepName: entry.stepName,
      outcome: OUTCOME_LABEL[entry.outcome] ?? humanizeToken(entry.outcome),
      outcomeKey: entry.outcome,
      from: actorLabel(entry.actedByRole, entry.actedByName),
      reason: entry.note || '',
    })),
    correctionNote: workflow.correctionNote || '',
    documentsToUpdate: workflow.correctionRequiredDocuments ?? [],
  };
}

function humanizeToken(value) {
  return String(value ?? '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatPaymentSummary(payment) {
  if (!payment || payment.status === 'not_required') return null;
  return {
    label: payment.label || 'Fee payment',
    amount: payment.amountDisplay || '',
    status: payment.status === 'paid' ? 'Paid' : 'Pending',
  };
}

function stepNameById(application, offering) {
  const steps = [
    ...(application?.workflowSnapshot ?? []),
    ...(offering?.workflowSteps ?? []),
  ];
  return new Map(steps.map((step) => [step.stepId, step.name]));
}

function formatDocumentFeedback(application, extractedFromDocuments) {
  const byName = new Map();
  const remember = (item) => {
    const key = String(item.documentName ?? '').trim().toLowerCase();
    if (!key) return;
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, { ...item, reasons: item.reason ? [item.reason] : [] });
      return;
    }
    if (item.reason && !existing.reasons.includes(item.reason)) existing.reasons.push(item.reason);
    if (item.status && existing.status === 'Awaiting review') existing.status = item.status;
  };

  for (const document of application?.documents ?? []) {
    const status = document.reviewStatus;
    const reason = String(document.reviewNote ?? '').trim();
    if (!reason && status !== 'rejected' && status !== 'needs_correction') continue;
    remember({
      documentName: document.requirementName || document.originalName || 'Uploaded document',
      from: document.reviewedByName ? actorLabel('staff', document.reviewedByName) : 'Institute staff',
      status: DOCUMENT_REVIEW_LABEL[status] ?? 'Needs attention',
      reason,
    });
  }

  for (const doc of extractedFromDocuments) {
    for (const comment of doc.aiComments ?? []) {
      remember({
        documentName: doc.documentName,
        from: 'AI review',
        status: doc.eligibility === 'Eligible' ? 'Reviewed' : doc.eligibility,
        reason: comment,
      });
    }
  }

  return [...byName.values()].map((item) => ({
    documentName: item.documentName,
    from: item.from,
    status: item.status,
    reason: item.reasons.filter(Boolean).join(' '),
  }));
}

function formatFeedbackAndReturns({ application, offering, latestDecision, extractedFromDocuments, workflow }) {
  if (!application) return null;
  const names = stepNameById(application, offering);
  const rolledBackToStep = application.rolledBackToStepId
    ? names.get(application.rolledBackToStepId) || application.rolledBackToStepId
    : null;
  const sentBack = application.status === 'needs_correction' || Boolean(application.correctionNote);
  const rolledBack = Boolean(application.rolledBackToStepId || application.rollbackNote || application.rolledBackAt);

  const staffAndAiNotes = (workflow?.history ?? [])
    .filter((entry) => {
      const key = entry.outcomeKey;
      return (
        entry.reason ||
        key === 'needs_correction' ||
        key === 'rolled_back' ||
        key === 'escalated_to_staff' ||
        key === 'rejected' ||
        key === 'returned_for_correction'
      );
    })
    .map((entry) => ({
      from: entry.from,
      stepName: entry.stepName,
      whatHappened: entry.outcome,
      reason: entry.reason || '',
    }));

  return {
    sentBackForCorrections: Boolean(sentBack),
    sentBackReason: String(application.correctionNote ?? workflow?.correctionNote ?? '').trim(),
    documentsToUpdate: workflow?.documentsToUpdate ?? application.correctionRequiredDocuments ?? [],
    rolledBack,
    rolledBackToStep,
    rolledBackReason: String(application.rollbackNote ?? '').trim(),
    rolledBackAt: application.rolledBackAt ?? null,
    aiReview: latestDecision
      ? {
          stepName: latestDecision.stepName || 'Document review',
          result: AI_ACTION_LABEL[latestDecision.action] || humanizeToken(latestDecision.action),
          summary: latestDecision.summary || '',
          issues: (latestDecision.issues ?? []).filter(Boolean),
        }
      : null,
    officeComments: staffAndAiNotes,
    documentFeedback: formatDocumentFeedback(application, extractedFromDocuments),
  };
}

export function buildStudentChatFacts({ application, offering, progress, aiDecisions = [], payment = null } = {}) {
  const programmeName = offering?.name ?? '';
  const eligibilityRules = (offering?.eligibilityRules ?? [])
    .filter((rule) => rule && (rule.field || rule.value))
    .map(humanEligibilityRule)
    .filter(Boolean);

  const latestDecision = aiDecisions[0] ?? null;
  const extractedFromDocuments = (latestDecision?.perDocument ?? []).map(formatExtractedDocument);
  const uploadedDocuments = formatUploadedDocuments(application);
  const uploadedByName = new Map(
    uploadedDocuments.map((document) => [document.name.trim().toLowerCase(), document]),
  );
  for (const doc of extractedFromDocuments) {
    const uploaded = uploadedByName.get(doc.documentName.trim().toLowerCase());
    if (!uploaded) continue;
    if (uploaded.staffComment) doc.staffComment = uploaded.staffComment;
    if (uploaded.reviewStatus) doc.staffReviewStatus = uploaded.reviewStatus;
    if (uploaded.reviewedBy) doc.staffReviewer = uploaded.reviewedBy;
  }
  const workflow = formatWorkflowProgress(application, offering);
  const feedbackAndReturns = formatFeedbackAndReturns({
    application,
    offering,
    latestDecision,
    extractedFromDocuments,
    workflow,
  });

  const sourceNames = [
    ...extractedFromDocuments.map((doc) => doc.documentName),
    ...uploadedDocuments.map((doc) => doc.name),
    programmeName ? `${programmeName} eligibility rules` : '',
    programmeName ? `${programmeName} admission process` : '',
    'Your admission request',
    feedbackAndReturns?.documentFeedback?.length || feedbackAndReturns?.sentBackForCorrections || feedbackAndReturns?.rolledBack
      ? 'Feedback on your request'
      : '',
  ].filter(Boolean);

  return {
    programmeName,
    programmeEligibilityRules: eligibilityRules,
    yourRequest: application
      ? {
          status: humanizeToken(application.status),
          documentsComplete: Boolean(progress?.documentsComplete),
          uploadedDocuments,
          missingDocuments: progress?.missingRequiredDocuments?.map((item) => item.name) ?? [],
          workflow,
          extractedFromDocuments,
          overallEligibility: latestDecision
            ? {
                result: overallEligibilityLabel(latestDecision),
                summary: latestDecision.summary || '',
              }
            : null,
          payment: formatPaymentSummary(payment),
          feedbackAndReturns,
        }
      : null,
    citationSourcesYouMayUse: [...new Set(sourceNames)],
  };
}

function mapTechnicalSource(source, facts) {
  const text = String(source ?? '');
  const names = facts?.citationSourcesYouMayUse ?? [];
  const matched = names.find((name) => name && text.toLowerCase().includes(String(name).toLowerCase()));
  if (matched) return matched;

  if (/eligibility/i.test(text) && facts?.programmeName) {
    return `${facts.programmeName} eligibility rules`;
  }
  if (/workflow|step/i.test(text)) {
    return facts?.programmeName ? `${facts.programmeName} admission process` : 'Your admission request';
  }
  if (/feedback|rollback|correction|comment/i.test(text)) {
    return 'Feedback on your request';
  }
  if (/application|status|documentsComplete|yourRequest/i.test(text)) {
    return 'Your admission request';
  }

  const extracted = facts?.yourRequest?.extractedFromDocuments ?? [];
  if (extracted.length === 1) return extracted[0].documentName;
  if (facts?.programmeName) return `${facts.programmeName} eligibility rules`;
  return 'Your admission request';
}

function excerptForSource(source, facts) {
  const extracted = facts?.yourRequest?.extractedFromDocuments ?? [];
  const doc = extracted.find((item) => item.documentName === source);
  if (doc?.excerpt) return doc.excerpt;

  if (source?.includes('eligibility rules')) {
    return (facts.programmeEligibilityRules ?? []).join('; ').slice(0, 180);
  }
  if (source === 'Your admission request' || source?.includes('admission process') || source === 'Feedback on your request') {
    const request = facts?.yourRequest;
    if (!request) return '';
    const bits = [`Status: ${request.status}`];
    if (request.overallEligibility?.result) bits.push(`Eligibility: ${request.overallEligibility.result}`);
    if (request.workflow?.currentStep) bits.push(`Current step: ${request.workflow.currentStep}`);
    const feedback = request.feedbackAndReturns;
    if (feedback?.rolledBack && feedback.rolledBackToStep) {
      bits.push(`Moved back to ${feedback.rolledBackToStep}`);
    }
    if (feedback?.sentBackReason) bits.push(feedback.sentBackReason.slice(0, 80));
    return bits.join(' · ');
  }
  return '';
}

export function sanitizeStudentFacingCitations(citations, facts) {
  if (!Array.isArray(citations) || !facts) return [];
  const seen = new Set();
  const next = [];

  for (const item of citations) {
    let source = String(item?.source ?? '').trim();
    if (!source) continue;
    if (looksLikeTechnicalSource(source) || looksLikeTechnicalSource(item?.excerpt)) {
      source = mapTechnicalSource(source, facts);
    }
    if (!facts.citationSourcesYouMayUse?.includes(source) && looksLikeTechnicalSource(source)) {
      source = mapTechnicalSource(source, facts);
    }
    if (seen.has(source)) continue;
    seen.add(source);
    next.push({
      source,
      excerpt: excerptForSource(source, facts) || String(item?.excerpt ?? '').trim().slice(0, 180),
    });
  }

  return next.filter((item) => item.source && !looksLikeTechnicalSource(item.source));
}

export function citationsFromStudentFacts(facts, { preferDocuments = false, preferFeedback = false } = {}) {
  const extracted = facts?.yourRequest?.extractedFromDocuments ?? [];
  const feedback = facts?.yourRequest?.feedbackAndReturns;
  if (preferFeedback) {
    const fromDocs = (feedback?.documentFeedback ?? []).map((item) => ({
      source: item.documentName,
      excerpt: item.reason || item.status,
    }));
    if (fromDocs.length) return fromDocs;
    if (feedback?.sentBackForCorrections || feedback?.rolledBack || feedback?.aiReview) {
      return [
        {
          source: 'Feedback on your request',
          excerpt: excerptForSource('Feedback on your request', facts),
        },
      ];
    }
  }
  if (preferDocuments && extracted.length) {
    return extracted
      .filter((doc) => doc.subjects?.length || doc.aggregate != null || doc.examScore != null || doc.criteria?.length)
      .map((doc) => ({
        source: doc.documentName,
        excerpt: doc.excerpt,
      }));
  }

  const names = facts?.citationSourcesYouMayUse ?? [];
  if (!names.length) return [];
  return names.slice(0, 2).map((source) => ({
    source,
    excerpt: excerptForSource(source, facts),
  }));
}

export function buildEligibilityAnswer(facts) {
  const request = facts?.yourRequest;
  const programme = facts?.programmeName || 'this programme';
  const rules = facts?.programmeEligibilityRules ?? [];
  const extracted = request?.extractedFromDocuments ?? [];
  const lines = [];

  if (request?.overallEligibility?.result) {
    lines.push(
      `For ${programme}, the records from your uploaded documents currently show: ${request.overallEligibility.result}.`,
    );
  } else {
    lines.push(`Here are the eligibility rules for ${programme}.`);
  }
  lines.push('');

  if (rules.length) {
    lines.push('Programme rules:');
    rules.forEach((rule, index) => lines.push(`${index + 1}. ${rule}`));
    lines.push('');
  }

  const academicDocs = extracted.filter(
    (doc) => doc.subjects?.length || doc.aggregate != null || doc.examScore != null || doc.criteria?.length,
  );
  if (academicDocs.length) {
    for (const doc of academicDocs) {
      lines.push(`${doc.documentName} — ${doc.eligibility}`);
      if (doc.aggregate != null) lines.push(`Aggregate: ${doc.aggregate}`);
      if (doc.examScore != null) lines.push(`Exam score: ${doc.examScore}`);
      if (doc.subjects.length) {
        lines.push(
          `Subject scores: ${doc.subjects
            .map((subject) => {
              const score = subject.score == null ? 'not found' : subject.score;
              const required = subject.required == null ? '' : ` (required ${subject.required})`;
              return `${subject.name} ${score}${required}`;
            })
            .join('; ')}`,
        );
      }
      lines.push('');
    }
  } else if (request) {
    lines.push(
      'Scores have not been extracted from your documents yet, so I cannot confirm subject-wise marks from the file contents.',
    );
    lines.push('');
  }

  if (request?.status) {
    lines.push(`Your request status is "${request.status}".`);
  }

  const feedback = request?.feedbackAndReturns;
  if (feedback?.rolledBack && feedback.rolledBackToStep) {
    lines.push(
      `Your request was moved back to "${feedback.rolledBackToStep}"${feedback.rolledBackReason ? `: ${feedback.rolledBackReason}` : '.'}`,
    );
  } else if (feedback?.sentBackForCorrections && feedback.sentBackReason) {
    lines.push(`Staff or AI sent it back for corrections: ${feedback.sentBackReason}`);
  }

  return lines.join('\n').trim();
}

export function buildFeedbackAnswer(facts) {
  const request = facts?.yourRequest;
  const feedback = request?.feedbackAndReturns;
  const lines = [];

  if (!request) {
    return 'I do not have a submitted request to check for comments yet. Start or open your request on this page.';
  }

  lines.push(`Your request status is "${request.status}".`);

  if (feedback?.rolledBack) {
    lines.push(
      `It was moved back to "${feedback.rolledBackToStep || 'an earlier step'}"${
        feedback.rolledBackReason ? `. Reason: ${feedback.rolledBackReason}` : '.'
      }`,
    );
  }
  if (feedback?.sentBackForCorrections) {
    lines.push(
      feedback.sentBackReason
        ? `It was sent back for corrections: ${feedback.sentBackReason}`
        : 'It was sent back so you can update your request.',
    );
    if (feedback.documentsToUpdate?.length) {
      lines.push(`Please update: ${feedback.documentsToUpdate.join(', ')}.`);
    }
  }

  if (feedback?.aiReview?.summary || feedback?.aiReview?.issues?.length) {
    lines.push('');
    lines.push(`AI review${feedback.aiReview.stepName ? ` (${feedback.aiReview.stepName})` : ''}: ${feedback.aiReview.result || 'Reviewed'}.`);
    if (feedback.aiReview.summary) lines.push(feedback.aiReview.summary);
    for (const issue of feedback.aiReview.issues ?? []) {
      lines.push(`- ${issue}`);
    }
  }

  if (feedback?.documentFeedback?.length) {
    lines.push('');
    lines.push('Document comments:');
    for (const item of feedback.documentFeedback) {
      const reason = item.reason ? `: ${item.reason}` : '';
      lines.push(`- ${item.documentName} (${item.from}, ${item.status})${reason}`);
    }
  }

  const otherNotes = (feedback?.officeComments ?? []).filter(
    (item) => item.reason && item.reason !== feedback.sentBackReason && item.reason !== feedback.rolledBackReason,
  );
  if (otherNotes.length) {
    lines.push('');
    lines.push('Other notes from the office:');
    for (const item of otherNotes) {
      lines.push(`- ${item.from} on ${item.stepName}: ${item.whatHappened}${item.reason ? `. ${item.reason}` : ''}`);
    }
  }

  if (lines.length === 1) {
    lines.push('There are no send-back comments, document notes, or rollback reasons on this request right now.');
  }

  return lines.join('\n').trim();
}
