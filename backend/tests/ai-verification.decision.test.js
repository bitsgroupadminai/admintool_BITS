import test from 'node:test';
import assert from 'node:assert/strict';

import {
  INTERNAL_ACTION,
  decideDocumentAction,
  decideEligibilityAction,
  buildProfileFromExtractedFields,
  mergeExtractedFields,
  evaluateEligibilityByDocument,
  mergeEligibilityProfile,
} from '../src/modules/ai-verification/ai-verification.decision.js';
import { evaluateEligibilityRules } from '../src/shared/helpers/eligibilityEvaluation.helper.js';
import {
  documentVerificationResponseSchema,
  eligibilityVerificationResponseSchema,
} from '../src/shared/schemas/verification.schemas.js';
import {
  buildDocumentVerificationUserPrompt,
  formatApplicantRecord,
  getDocumentVerificationSystemPrompt,
} from '../src/shared/prompts/verification.prompt.js';
import { canUserActOnWorkflowStep } from '../src/shared/helpers/workflowExecution.helper.js';
import { HANDLER_TYPE } from '../src/shared/enums/workflow.enums.js';
import { ROLES } from '../src/shared/constants/roles.js';

const thresholds = { autoApprove: 0.85, autoReject: 0.8 };

test('decideDocumentAction: clear pass above threshold auto-approves', () => {
  const action = decideDocumentAction({ verdict: 'pass', confidence: 0.95, thresholds });
  assert.equal(action, INTERNAL_ACTION.APPROVE);
});

test('decideDocumentAction: clear fail above threshold returns for correction', () => {
  const action = decideDocumentAction({ verdict: 'fail', confidence: 0.9, thresholds });
  assert.equal(action, INTERNAL_ACTION.RETURN);
});

test('decideDocumentAction: low-confidence pass escalates', () => {
  const action = decideDocumentAction({ verdict: 'pass', confidence: 0.6, thresholds });
  assert.equal(action, INTERNAL_ACTION.ESCALATE);
});

test('decideDocumentAction: uncertain verdict escalates', () => {
  const action = decideDocumentAction({ verdict: 'uncertain', confidence: 0.99, thresholds });
  assert.equal(action, INTERNAL_ACTION.ESCALATE);
});

test('decideDocumentAction: unreadable pass forces escalation', () => {
  const action = decideDocumentAction({
    verdict: 'pass',
    confidence: 0.99,
    thresholds,
    forceEscalate: true,
  });
  assert.equal(action, INTERNAL_ACTION.ESCALATE);
});

test('buildProfileFromExtractedFields normalizes field keys', () => {
  const profile = buildProfileFromExtractedFields([
    { field: 'PCM Percentage', value: 82 },
    { field: '  Marks ', value: 75 },
  ]);
  assert.equal(profile.customFields['pcm percentage'], 82);
  assert.equal(profile.customFields['marks'], 75);
});

const marksRule = [{ field: 'Marks', fieldType: 'numeric', operator: 'gte', value: 60 }];

test('decideEligibilityAction: meets rule with high confidence approves', () => {
  const { action, evaluation } = decideEligibilityAction({
    verdict: 'pass',
    confidence: 0.95,
    extractedFields: [{ field: 'Marks', value: 78 }],
    eligibilityRules: marksRule,
    thresholds,
  });
  assert.equal(action, INTERNAL_ACTION.APPROVE);
  assert.equal(evaluation.eligible, true);
});

test('decideEligibilityAction: fails rule with high confidence returns for correction', () => {
  const { action, evaluation } = decideEligibilityAction({
    verdict: 'pass',
    confidence: 0.95,
    extractedFields: [{ field: 'Marks', value: 42 }],
    eligibilityRules: marksRule,
    thresholds,
  });
  assert.equal(action, INTERNAL_ACTION.RETURN);
  assert.equal(evaluation.eligible, false);
  assert.match(
    evaluation.results[0].message,
    /Marks requires at least 60, but the value found is 42/,
  );
});

test('documentVerificationResponseSchema: observedContent is optional with default', () => {
  const parsed = documentVerificationResponseSchema.parse({
    verdict: 'fail',
    confidence: 0.92,
    summary: 'The uploaded file is a selfie, which is not a government ID.',
    perDocument: [
      {
        requirementName: 'Government ID',
        present: true,
        matchesRequirement: false,
        verdict: 'fail',
        observedContent: 'a selfie of a person',
        issue:
          'The uploaded file is a selfie of a person, which is not a Government ID. This does not meet the requirement.',
      },
    ],
  });
  assert.equal(parsed.perDocument[0].observedContent, 'a selfie of a person');
});

test('decideEligibilityAction: missing value (unchecked) escalates', () => {
  const { action } = decideEligibilityAction({
    verdict: 'pass',
    confidence: 0.95,
    extractedFields: [],
    eligibilityRules: marksRule,
    thresholds,
  });
  assert.equal(action, INTERNAL_ACTION.ESCALATE);
});

test('decideEligibilityAction: uncertain extraction escalates even when rule met', () => {
  const { action } = decideEligibilityAction({
    verdict: 'uncertain',
    confidence: 0.95,
    extractedFields: [{ field: 'Marks', value: 90 }],
    eligibilityRules: marksRule,
    thresholds,
  });
  assert.equal(action, INTERNAL_ACTION.ESCALATE);
});

test('decideEligibilityAction: no rules configured approves', () => {
  // With no rules the deterministic engine reports eligible with no unchecked entries.
  const { action } = decideEligibilityAction({
    verdict: 'pass',
    confidence: 0.9,
    extractedFields: [],
    eligibilityRules: [],
    thresholds,
  });
  assert.equal(action, INTERNAL_ACTION.APPROVE);
});

test('canUserActOnWorkflowStep: staff cannot act on AI step by default', () => {
  const step = { handledBy: { type: HANDLER_TYPE.AI, assignee: 'document_verification' } };
  assert.equal(canUserActOnWorkflowStep({ role: ROLES.STAFF, staffRole: 'general' }, step), false);
});

test('canUserActOnWorkflowStep: staff can act on escalated AI step', () => {
  const step = { handledBy: { type: HANDLER_TYPE.AI, assignee: 'document_verification' } };
  assert.equal(
    canUserActOnWorkflowStep({ role: ROLES.STAFF, staffRole: 'general' }, step, {
      allowAiStep: true,
    }),
    true,
  );
});

test('canUserActOnWorkflowStep: admin can always act on AI step', () => {
  const step = { handledBy: { type: HANDLER_TYPE.AI, assignee: 'document_verification' } };
  assert.equal(canUserActOnWorkflowStep({ role: ROLES.ADMIN }, step), true);
});

test('canUserActOnWorkflowStep: nobody acts on student step via helper', () => {
  const step = { handledBy: { type: HANDLER_TYPE.STUDENT, assignee: 'student' } };
  assert.equal(
    canUserActOnWorkflowStep({ role: ROLES.STAFF, staffRole: 'general' }, step, {
      allowAiStep: true,
    }),
    false,
  );
});

test('documentVerificationResponseSchema: valid payload parses and applies defaults', () => {
  const parsed = documentVerificationResponseSchema.parse({
    verdict: 'pass',
    confidence: 0.9,
    summary: 'All documents present and legible.',
  });
  assert.equal(parsed.verdict, 'pass');
  assert.deepEqual(parsed.perDocument, []);
  assert.deepEqual(parsed.issues, []);
});

test('documentVerificationResponseSchema: out-of-range confidence fails', () => {
  const result = documentVerificationResponseSchema.safeParse({
    verdict: 'pass',
    confidence: 1.5,
    summary: 'bad',
  });
  assert.equal(result.success, false);
});

test('formatApplicantRecord includes name, email, mobile, details, and age from DOB', () => {
  const record = formatApplicantRecord({
    applicantName: 'Priya Sharma',
    applicantEmail: 'priya@example.com',
    applicantMobile: '+919876543210',
    applicantDetails: [
      { fieldKey: 'date_of_birth', label: 'Date of birth', value: '2004-06-15' },
      { fieldKey: 'city', label: 'City', value: 'Jaipur' },
    ],
  });
  assert.match(record, /Full name: Priya Sharma/);
  assert.match(record, /Email: priya@example.com/);
  assert.match(record, /Mobile: \+919876543210/);
  assert.match(record, /Date of birth: 2004-06-15/);
  assert.match(record, /City: Jaipur/);
  assert.match(record, /Age \(from date of birth\): \d+/);
});

test('document verification prompt includes the full applicant record', () => {
  const prompt = buildDocumentVerificationUserPrompt({
    applicantName: 'Aarav Mehta',
    applicantEmail: 'aarav@example.com',
    applicantMobile: '+911234567890',
    applicantDetails: [{ fieldKey: 'age', label: 'Age', value: 19 }],
    requiredDocuments: [{ name: 'Government ID', required: true }],
    documents: [],
  });
  assert.match(prompt, /APPLICANT RECORD/);
  assert.match(prompt, /Aarav Mehta/);
  assert.match(prompt, /aarav@example.com/);
  assert.match(prompt, /Age: 19/);
});

test('eligibilityVerificationResponseSchema: extracted fields parse', () => {
  const parsed = eligibilityVerificationResponseSchema.parse({
    verdict: 'pass',
    confidence: 0.88,
    summary: 'Extracted marks from marksheet.',
    extractedFields: [{ field: 'Marks', value: 78, documentExcerpt: 'Total: 78%' }],
  });
  assert.equal(parsed.extractedFields[0].value, 78);
});

test('sample-document testing prompt relaxes authenticity rules', () => {
  const live = getDocumentVerificationSystemPrompt();
  const sample = getDocumentVerificationSystemPrompt({ allowSampleDocuments: true });
  assert.doesNotMatch(live, /SAMPLE DOCUMENT TESTING MODE IS ON/);
  assert.match(sample, /SAMPLE DOCUMENT TESTING MODE IS ON/);
  assert.match(sample, /AI-generated/);
  assert.match(sample, /Do not fail because the photo looks synthetic/);
});

test('sample-document testing user prompt skips authenticity policy excerpts', () => {
  const prompt = buildDocumentVerificationUserPrompt({
    applicantName: 'Aarav Mehta',
    requiredDocuments: [{ name: 'Government ID', required: true }],
    documents: [],
    policyExcerpts: ['Documents must be authentic. Reject forged marksheets.'],
    allowSampleDocuments: true,
  });
  assert.match(prompt, /SAMPLE DOCUMENT TESTING MODE IS ON/);
  assert.doesNotMatch(prompt, /Reject forged marksheets/);
});

test('sample-document testing thresholds approve a modest pass', () => {
  const action = decideDocumentAction({
    verdict: 'pass',
    confidence: 0.55,
    thresholds: { autoApprove: 0.5, autoReject: 0.95 },
  });
  assert.equal(action, INTERNAL_ACTION.APPROVE);
});

test('mergeExtractedFields prefers Class 12 values over Class 10', () => {
  const merged = mergeExtractedFields([
    {
      requirementName: 'Class 10 marksheet',
      extractedFields: [{ field: 'Aggregate Requirement', value: 89 }],
    },
    {
      requirementName: 'Class 12 marksheet',
      extractedFields: [{ field: 'Aggregate Requirement', value: 76 }],
    },
  ]);
  assert.equal(merged[0].value, 76);
});

test('evaluateEligibilityByDocument scores each file against the same rules', () => {
  const docs = evaluateEligibilityByDocument(
    [
      {
        requirementName: 'Class 10 marksheet',
        extractedFields: [{ field: 'Aggregate Requirement', value: 89 }],
      },
      {
        requirementName: 'Class 12 marksheet',
        extractedFields: [{ field: 'Aggregate Requirement', value: 70 }],
      },
    ],
    [{ field: 'Aggregate Requirement', fieldType: 'numeric', operator: 'gte', value: 75 }],
  );
  assert.equal(docs[0].eligibilityResult.results[0].status, 'passed');
  assert.equal(docs[1].eligibilityResult.results[0].status, 'failed');
  assert.equal(docs[0].eligibilityResult.results[0].requirement, 'at least 75');
});

test('eligibilityVerificationResponseSchema: per-document extractions parse', () => {
  const parsed = eligibilityVerificationResponseSchema.parse({
    verdict: 'pass',
    confidence: 0.9,
    summary: 'Extracted from each marksheet.',
    perDocument: [
      {
        requirementName: 'Class 12 marksheet',
        qualification: 'Class XII',
        aggregate: '82%',
        subjects: [{ name: 'Physics', score: '85', grade: 'A2' }],
        extractedFields: [{ field: 'Aggregate Requirement', value: 82, documentExcerpt: '82%' }],
      },
    ],
  });
  assert.equal(parsed.perDocument[0].requirementName, 'Class 12 marksheet');
  assert.equal(parsed.perDocument[0].extractedFields[0].value, 82);
  assert.equal(parsed.perDocument[0].aggregate, 82);
  assert.equal(parsed.perDocument[0].subjects[0].score, 85);
});

const bitsRules = [
  { field: 'Qualification', fieldType: 'text', operator: 'eq', value: '10+2 or equivalent' },
  { field: 'Subjects', fieldType: 'text', operator: 'eq', value: 'Physics, Chemistry, Mathematics' },
  { field: 'Aggregate Requirement', fieldType: 'numeric', operator: 'gte', value: 75 },
  { field: 'Subject Threshold', fieldType: 'numeric', operator: 'gte', value: 60 },
];

test('evaluateEligibilityRules: qualification and PCM match from structured fields', () => {
  const evaluation = evaluateEligibilityRules(bitsRules, {
    qualification: 'Class XII / Senior Secondary',
    aggregate: 81,
    subjects: [
      { name: 'Physics', score: 78, grade: 'A2' },
      { name: 'Chemistry', score: 72, grade: 'B1' },
      { name: 'Mathematics', score: 88, grade: 'A1' },
      { name: 'English', score: 70, grade: 'B1' },
    ],
  });
  assert.equal(evaluation.eligible, true);
  assert.equal(evaluation.results.find((result) => result.field === 'Subjects').status, 'passed');
  assert.equal(evaluation.results.find((result) => result.field === 'Subject Threshold').status, 'passed');
  assert.equal(
    evaluation.results.find((result) => result.field === 'Subject Threshold').scoreChecks.length,
    3,
  );
});

test('evaluateEligibilityByDocument: Class 10 skips 10+2 qualification; photos are ignored', () => {
  const docs = evaluateEligibilityByDocument(
    [
      {
        requirementName: 'Passport-size photograph',
        extractedFields: [{ field: 'Qualification', value: 'photo' }],
      },
      {
        requirementName: 'Class 10 marksheet',
        qualification: 'Class X',
        aggregate: 89,
        subjects: [
          { name: 'Science', score: 90, grade: 'A1' },
          { name: 'Mathematics', score: 92, grade: 'A1' },
        ],
      },
      {
        requirementName: 'Class 12 marksheet',
        qualification: 'Class XII',
        aggregate: 76,
        subjects: [
          { name: 'Physics', score: 70, grade: 'B1' },
          { name: 'Chemistry', score: 68, grade: 'B1' },
          { name: 'Mathematics', score: 80, grade: 'A2' },
        ],
      },
    ],
    bitsRules,
  );
  assert.equal(docs.length, 2);
  assert.equal(docs[0].requirementName, 'Class 10 marksheet');
  assert.equal(
    docs[0].eligibilityResult.results.find((result) => result.field === 'Qualification').status,
    'not_applicable',
  );
  assert.equal(
    docs[0].eligibilityResult.results.find((result) => result.field === 'Subjects').status,
    'not_applicable',
  );
  assert.equal(docs[1].eligibilityResult.eligible, true);
  assert.equal(docs[1].verdict, 'passed');
});

test('mergeEligibilityProfile prefers Class 12 subjects over Class 10', () => {
  const profile = mergeEligibilityProfile([
    {
      requirementName: 'Class 10 marksheet',
      qualification: 'Class X',
      aggregate: 91,
      subjects: [{ name: 'Science', score: 90 }],
    },
    {
      requirementName: 'Class 12 marksheet',
      qualification: 'Class XII',
      aggregate: 76,
      subjects: [{ name: 'Physics', score: 70 }, { name: 'Chemistry', score: 68 }, { name: 'Mathematics', score: 80 }],
    },
    {
      requirementName: 'BITSAT scorecard',
      examScore: 312,
    },
  ]);
  assert.equal(profile.qualification, 'Class XII');
  assert.equal(profile.aggregate, 76);
  assert.equal(profile.examScore, 312);
  assert.equal(profile.subjects.length, 3);
  assert.equal(profile.subjects[0].name, 'Physics');
});
