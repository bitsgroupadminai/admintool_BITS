import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';

const {
  buildEligibilityAnswer,
  buildFeedbackAnswer,
  buildStudentChatFacts,
  citationsFromStudentFacts,
  formatExtractedDocument,
  humanEligibilityRule,
  looksLikeTechnicalSource,
  sanitizeStudentFacingCitations,
} = await import('../src/modules/chat/chatContext.helper.js');

describe('student chat context', () => {
  it('writes eligibility rules in plain language', () => {
    assert.equal(humanEligibilityRule({ field: 'Aggregate Requirement', operator: 'gte', value: 75 }), 'Aggregate Requirement: at least 75');
    assert.equal(
      humanEligibilityRule({ field: 'Subjects', operator: 'eq', value: 'Physics, Chemistry, Mathematics' }),
      'Subjects: Physics, Chemistry, Mathematics',
    );
  });

  it('summarizes per-document scores and eligibility', () => {
    const doc = formatExtractedDocument({
      requirementName: 'Class 12 Marksheet',
      aggregate: 82,
      verdict: 'pass',
      subjects: [
        { name: 'Physics', score: 72 },
        { name: 'Chemistry', score: 68 },
        { name: 'Mathematics', score: 80 },
      ],
      eligibilityResult: {
        eligible: true,
        results: [
          {
            field: 'Aggregate Requirement',
            status: 'passed',
            actual: 82,
            expected: 75,
            requirement: 'at least 75',
          },
          {
            field: 'Subject Threshold',
            status: 'passed',
            expected: 60,
            requirement: 'at least 60',
            scoreChecks: [
              { name: 'Physics', score: 72, required: 60, status: 'passed' },
              { name: 'Chemistry', score: 68, required: 60, status: 'passed' },
              { name: 'Mathematics', score: 80, required: 60, status: 'passed' },
            ],
          },
        ],
      },
    });

    assert.equal(doc.documentName, 'Class 12 Marksheet');
    assert.equal(doc.eligibility, 'Eligible');
    assert.equal(doc.aggregate, 82);
    assert.equal(doc.subjects[0].result, 'Met');
    assert.match(doc.excerpt, /Class 12 Marksheet|Eligible|82|Physics/);
  });

  it('replaces JSON-path citations with document names', () => {
    const facts = buildStudentChatFacts({
      offering: {
        name: 'M.Sc. Economics',
        eligibilityRules: [{ field: 'Aggregate Requirement', operator: 'gte', value: 75 }],
      },
      application: {
        status: 'admitted',
        documents: [{ requirementName: 'Class 12 Marksheet', originalName: 'xii.pdf' }],
        workflowSnapshot: [],
      },
      progress: { documentsComplete: true, missingRequiredDocuments: [] },
      aiDecisions: [
        {
          summary: 'Extracted values meet the criteria.',
          eligibilityResult: { eligible: true, results: [] },
          perDocument: [
            {
              requirementName: 'Class 12 Marksheet',
              aggregate: 82,
              subjects: [{ name: 'Physics', score: 72 }],
              eligibilityResult: { eligible: true, results: [] },
            },
          ],
        },
      ],
    });

    const cleaned = sanitizeStudentFacingCitations(
      [
        {
          source: 'studentContext.offerings[0].eligibility',
          excerpt: 'Aggregate Requirement gte 75',
        },
        {
          source: 'studentContext.application',
          excerpt: 'status: admitted; documentsComplete: true',
        },
      ],
      facts,
    );

    assert.equal(looksLikeTechnicalSource('studentContext.offerings[0].eligibility'), true);
    assert.ok(cleaned.every((item) => !looksLikeTechnicalSource(item.source)));
    assert.ok(cleaned.some((item) => item.source === 'M.Sc. Economics eligibility rules' || item.source === 'Class 12 Marksheet' || item.source === 'Your admission request'));

    const docCitations = citationsFromStudentFacts(facts, { preferDocuments: true });
    assert.deepEqual(
      docCitations.map((item) => item.source),
      ['Class 12 Marksheet'],
    );

    const answer = buildEligibilityAnswer(facts);
    assert.match(answer, /Class 12 Marksheet/);
    assert.match(answer, /82/);
    assert.match(answer, /Physics 72/);
    assert.doesNotMatch(answer, /cannot confirm subject-wise/);
  });

  it('includes AI comments, staff document notes, and rollback reasons', () => {
    const facts = buildStudentChatFacts({
      offering: {
        name: 'M.Sc. Economics',
        workflowSteps: [
          { stepId: 's1', order: 1, name: 'Document Verification' },
          { stepId: 's2', order: 2, name: 'Eligibility Validation' },
        ],
      },
      application: {
        status: 'needs_correction',
        documents: [
          {
            requirementName: 'Class 12 Marksheet',
            originalName: 'xii.pdf',
            reviewStatus: 'needs_correction',
            reviewNote: 'Please upload a clearer scan of the original marksheet.',
            reviewedByName: 'Anita Rao',
          },
        ],
        correctionNote: 'Please replace the marksheet and resubmit.',
        correctionRequiredDocuments: ['Class 12 Marksheet'],
        rollbackNote: 'Eligibility could not be confirmed from the current scan.',
        rolledBackToStepId: 's1',
        rolledBackAt: new Date('2026-09-01T10:00:00.000Z'),
        workflowSnapshot: [
          { stepId: 's1', order: 1, name: 'Document Verification' },
          { stepId: 's2', order: 2, name: 'Eligibility Validation' },
        ],
        workflowHistory: [
          {
            stepId: 's2',
            stepName: 'Eligibility Validation',
            outcome: 'rolled_back',
            actedByName: 'Anita Rao',
            actedByRole: 'staff',
            note: 'Moved back so the student can upload a clearer marksheet.',
          },
        ],
      },
      progress: { documentsComplete: false, missingRequiredDocuments: [] },
      aiDecisions: [
        {
          stepName: 'Document Verification',
          action: 'returned_for_correction',
          summary: 'The marksheet image is too blurry to read subject scores.',
          issues: ['Class 12 Marksheet is not legible'],
          perDocument: [
            {
              requirementName: 'Class 12 Marksheet',
              issue: 'The subject table is not readable.',
              verdict: 'fail',
              eligibilityResult: { eligible: false, results: [] },
            },
          ],
        },
      ],
    });

    const feedback = facts.yourRequest.feedbackAndReturns;
    assert.equal(feedback.sentBackForCorrections, true);
    assert.match(feedback.sentBackReason, /replace the marksheet/i);
    assert.equal(feedback.rolledBack, true);
    assert.equal(feedback.rolledBackToStep, 'Document Verification');
    assert.match(feedback.rolledBackReason, /clearer scan|eligibility could not/i);
    assert.equal(feedback.aiReview.result, 'Returned for corrections');
    assert.ok(feedback.documentFeedback.some((item) => item.documentName === 'Class 12 Marksheet'));
    assert.ok(feedback.documentFeedback.some((item) => /clearer scan|not readable/i.test(item.reason)));
    assert.ok(feedback.officeComments.some((item) => item.from.includes('staff')));

    const reply = buildFeedbackAnswer(facts);
    assert.match(reply, /Document Verification/);
    assert.match(reply, /Class 12 Marksheet/);
    assert.match(reply, /AI review/i);
  });
});
