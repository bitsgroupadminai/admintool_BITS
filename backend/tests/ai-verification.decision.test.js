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
  hydrateEligibilityDecision,
  hydrateDocumentVerificationDecision,
  documentEligibilityVerdict,
  ELIGIBILITY_VERDICT,
} from '../src/modules/ai-verification/ai-verification.decision.js';
import { evaluateEligibilityRules, uniqueSubjects } from '../src/shared/helpers/eligibilityEvaluation.helper.js';
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

test('document verification prompt includes eligibility rules', () => {
  const prompt = buildDocumentVerificationUserPrompt({
    applicantName: 'Aarav Mehta',
    requiredDocuments: [{ name: 'Class 12 marksheet', required: true }],
    documents: [],
    eligibilityRules: [{ field: 'Aggregate Requirement', fieldType: 'numeric', operator: 'gte', value: 75 }],
  });
  assert.match(prompt, /ELIGIBILITY RULES/);
  assert.match(prompt, /Aggregate Requirement: at least 75/);
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

test('evaluateEligibilityByDocument uses each file\'s own eligibility criteria', () => {
  const docs = evaluateEligibilityByDocument(
    [
      {
        requirementName: 'Class 10 marksheet',
        qualification: 'Class X',
        aggregate: 89,
        subjects: [
          { name: 'Science', score: 90 },
          { name: 'Mathematics', score: 92 },
        ],
      },
      {
        requirementName: 'Class 12 marksheet',
        qualification: 'Class XII',
        aggregate: 76,
        subjects: [
          { name: 'Physics', score: 70 },
          { name: 'Chemistry', score: 68 },
          { name: 'Mathematics', score: 80 },
        ],
      },
      {
        requirementName: 'BITSAT scorecard',
        aggregate: 280,
        examScore: 280,
        subjects: [
          { name: 'Physics', score: 72 },
          { name: 'Chemistry', score: 80 },
          { name: 'Mathematics', score: 88 },
        ],
      },
    ],
    bitsRules,
    [
      {
        name: 'Class 10 marksheet',
        eligibility: { enabled: true, aggregateMin: 75, subjectThreshold: 60 },
      },
      {
        name: 'Class 12 marksheet',
        eligibility: {
          enabled: true,
          qualification: '10+2 or equivalent',
          aggregateMin: 75,
          subjectThreshold: 60,
          requiredSubjects: [{ name: 'Physics' }, { name: 'Chemistry' }, { name: 'Mathematics' }],
        },
      },
      {
        name: 'BITSAT scorecard',
        eligibility: { enabled: true, aggregateMin: 75, subjectThreshold: 60 },
      },
      {
        name: 'Passport-size photograph',
        eligibility: { enabled: false },
      },
    ],
  );

  const class10 = docs.find((doc) => doc.requirementName === 'Class 10 marksheet');
  const class12 = docs.find((doc) => doc.requirementName === 'Class 12 marksheet');
  const bitsat = docs.find((doc) => doc.requirementName === 'BITSAT scorecard');
  assert.equal(class10.eligibilityResult.results.some((result) => result.field === 'Qualification'), false);
  assert.equal(class10.eligibilityResult.results.some((result) => result.field === 'Subjects'), false);
  assert.equal(class10.eligibilityResult.eligible, true);
  assert.equal(class12.eligibilityResult.eligible, true);
  assert.equal(bitsat.eligibilityResult.eligible, true);
});

test('PCM is a subset match and Class 12 counts as 10+2', () => {
  const evaluation = evaluateEligibilityRules(bitsRules, {
    qualification: 'Class XII (10+2)',
    customFields: {
      subjects:
        'English Language & Literature; Hindi Course-B; Mathematics Standard; Science; Social Science; Information Technology; English Core; Physics; Chemistry; Mathematics; Computer Science; Physical Education',
    },
  });
  assert.equal(evaluation.results.find((result) => result.field === 'Qualification').status, 'passed');
  assert.equal(evaluation.results.find((result) => result.field === 'Subjects').status, 'passed');
});

test('hydrateEligibilityDecision rebuilds Class 10, Class 12, and BITSAT cards', () => {
  const hydrated = hydrateEligibilityDecision(
    {
      handler: 'eligibility_screening',
      verdict: 'fail',
      extractedFields: [
        {
          field: 'Qualification',
          value: null,
          documentExcerpt:
            'Secondary School Examination (Class X) Sample Marksheet; Senior Secondary Examination (Class XII) Sample Marksheet',
        },
        {
          field: 'Subjects',
          value:
            'English Language & Literature; Hindi Course-B; Mathematics Standard; Science; Social Science; Information Technology / English Core; Physics; Chemistry; Mathematics; Computer Science; Physical Education',
        },
      ],
    },
    {
      eligibilityRules: bitsRules,
      documents: [
        { requirementName: 'Class 10 marksheet' },
        { requirementName: 'Class 12 marksheet' },
        { requirementName: 'BITSAT scorecard' },
        { requirementName: 'Passport-size photograph' },
      ],
    },
  );

  const names = hydrated.perDocument.map((doc) => doc.requirementName);
  assert.deepEqual(names.sort(), ['BITSAT scorecard', 'Class 10 marksheet', 'Class 12 marksheet'].sort());

  const class12 = hydrated.perDocument.find((doc) => doc.requirementName === 'Class 12 marksheet');
  assert.equal(class12.qualification, 'Class XII (10+2)');
  assert.equal(
    class12.eligibilityResult.results.find((result) => result.field === 'Qualification').status,
    'passed',
  );
  assert.equal(
    class12.eligibilityResult.results.find((result) => result.field === 'Subjects').status,
    'passed',
  );
  assert.ok(class12.subjects.some((subject) => /physics/i.test(subject.name)));

  const class10 = hydrated.perDocument.find((doc) => doc.requirementName === 'Class 10 marksheet');
  assert.equal(
    class10.eligibilityResult.results.find((result) => result.field === 'Qualification').status,
    'not_applicable',
  );
  assert.ok(class10.subjects.some((subject) => /science/i.test(subject.name)));

  assert.equal(
    hydrated.eligibilityResult.results.find((result) => result.field === 'Qualification').status,
    'passed',
  );
  assert.equal(
    hydrated.eligibilityResult.results.find((result) => result.field === 'Subjects').status,
    'passed',
  );
});

test('hydrateEligibilityDecision ignores malformed stored payloads', () => {
  const hydrated = hydrateEligibilityDecision(
    {
      handler: 'eligibility_screening',
      extractedFields: { field: 'Subjects', value: 'Physics' },
      perDocument: { requirementName: 'Class 12 marksheet' },
      raw: { extractedFields: { foo: 1 }, perDocument: { requirementName: 'BITSAT' } },
    },
    {
      eligibilityRules: bitsRules,
      documents: [{ requirementName: 'Class 12 marksheet' }],
    },
  );
  assert.equal(hydrated.perDocument[0].requirementName, 'Class 12 marksheet');
  assert.equal(
    hydrated.eligibilityResult.results.find((result) => result.field === 'Qualification').status,
    'passed',
  );
});

test('uniqueSubjects drops repeated names and keeps scored rows', () => {
  const unique = uniqueSubjects([
    { name: 'Physics' },
    { name: 'Physics', score: 85, grade: 'A2' },
    { name: 'Chemistry', score: 80 },
    { name: 'Physics' },
  ]);
  assert.equal(unique.length, 2);
  assert.equal(unique[0].score, 85);
});

test('hydrateEligibilityDecision does not duplicate subjects from raw', () => {
  const subjects = [
    { name: 'Physics', score: 85, grade: 'A2' },
    { name: 'Chemistry', score: 80, grade: 'B1' },
    { name: 'Mathematics', score: 90, grade: 'A1' },
  ];
  const hydrated = hydrateEligibilityDecision(
    {
      handler: 'eligibility_screening',
      perDocument: [
        { requirementName: 'Class 12 marksheet', qualification: 'Class XII', subjects },
        {
          requirementName: 'BITSAT scorecard',
          examScore: 312,
          subjects: [
            { name: 'Physics', score: 96 },
            { name: 'Chemistry', score: 88 },
            { name: 'Mathematics', score: 128 },
          ],
        },
      ],
      raw: {
        perDocument: [
          { requirementName: 'Class 12 marksheet', qualification: 'Class XII', subjects },
        ],
      },
    },
    {
      eligibilityRules: bitsRules,
      documents: [
        { requirementName: 'Class 12 marksheet' },
        { requirementName: 'BITSAT scorecard' },
      ],
    },
  );
  const class12 = hydrated.perDocument.find((doc) => doc.requirementName === 'Class 12 marksheet');
  const bitsat = hydrated.perDocument.find((doc) => doc.requirementName === 'BITSAT scorecard');
  assert.equal(class12.subjects.length, 3);
  assert.equal(class12.subjects[0].score, 85);
  assert.equal(bitsat.subjects.length, 3);
  assert.equal(bitsat.examScore, 312);
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

test('decideDocumentAction: eligibility failure blocks auto-approve', () => {
  const action = decideDocumentAction({
    verdict: 'pass',
    confidence: 0.95,
    thresholds,
    eligibilityEvaluation: {
      eligible: false,
      results: [{ status: 'failed', field: 'Aggregate Requirement' }],
    },
  });
  assert.equal(action, INTERNAL_ACTION.RETURN);
});

test('decideDocumentAction: unchecked eligibility escalates', () => {
  const action = decideDocumentAction({
    verdict: 'pass',
    confidence: 0.95,
    thresholds,
    eligibilityEvaluation: {
      eligible: true,
      results: [{ status: 'unchecked', field: 'Subjects' }],
    },
  });
  assert.equal(action, INTERNAL_ACTION.ESCALATE);
});

test('documentEligibilityVerdict: valid photo is eligible', () => {
  assert.equal(
    documentEligibilityVerdict({
      finding: { verdict: 'pass', matchesRequirement: true, belongsToApplicant: true, legible: true },
      isAcademic: false,
    }),
    ELIGIBILITY_VERDICT.ELIGIBLE,
  );
});

test('documentEligibilityVerdict: valid marksheet with failed scores is ineligible', () => {
  assert.equal(
    documentEligibilityVerdict({
      finding: { verdict: 'pass', matchesRequirement: true, belongsToApplicant: true, legible: true },
      eligibilityStatus: 'failed',
      isAcademic: true,
    }),
    ELIGIBILITY_VERDICT.INELIGIBLE,
  );
});

test('hydrateDocumentVerificationDecision uses eligible/ineligible verdicts', () => {
  const hydrated = hydrateDocumentVerificationDecision(
    {
      handler: 'document_verification',
      verdict: 'pass',
      perDocument: [
        {
          requirementName: 'Class 12 marksheet',
          present: true,
          matchesRequirement: true,
          legible: true,
          belongsToApplicant: true,
          verdict: 'pass',
          qualification: 'Class XII (10+2)',
          aggregate: 80,
          subjects: [
            { name: 'Physics', score: 70 },
            { name: 'Chemistry', score: 68 },
            { name: 'Mathematics', score: 80 },
          ],
        },
        {
          requirementName: 'Passport-size photograph',
          present: true,
          matchesRequirement: true,
          legible: true,
          belongsToApplicant: true,
          verdict: 'pass',
        },
      ],
    },
    {
      eligibilityRules: bitsRules,
      documents: [
        { requirementName: 'Class 12 marksheet' },
        { requirementName: 'Passport-size photograph' },
      ],
    },
  );

  const class12 = hydrated.perDocument.find((doc) => doc.requirementName === 'Class 12 marksheet');
  const photo = hydrated.perDocument.find((doc) => doc.requirementName === 'Passport-size photograph');
  assert.equal(class12.verdict, 'eligible');
  assert.equal(class12.eligibilityVerdict, 'eligible');
  assert.equal(photo.verdict, 'eligible');
  assert.equal(hydrated.verdict, 'eligible');
});
