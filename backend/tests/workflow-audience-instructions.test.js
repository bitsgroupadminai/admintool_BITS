import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';

const {
  applyCanonicalAudienceInstructions,
  canonicalAudienceInstructionsForStep,
  mergeGeneratedAudienceInstructions,
  hasAudienceInstructions,
} = await import('../src/shared/helpers/workflowAudienceInstructions.helper.js');

const { createWorkflowStep, validateWorkflowSteps, mapExtractedWorkflowSteps } =
  await import('../src/shared/helpers/workflow.helper.js');

describe('workflow audience instructions', () => {
  it('matches offer release and fee payment by name, not only order', () => {
    const offer = canonicalAudienceInstructionsForStep({ name: 'Offer Release', order: 1 });
    assert.match(offer.staffInstructions, /admission offer/i);
    assert.match(offer.studentInstructions, /offer/i);

    const fee = canonicalAudienceInstructionsForStep({ name: 'Fee Payment', order: 2 });
    assert.match(fee.studentInstructions, /pay the admission fee/i);
  });

  it('fills missing fields and keeps existing edits', () => {
    const steps = applyCanonicalAudienceInstructions([
      {
        order: 1,
        name: 'Document Verification',
        staffInstructions: 'Custom staff note',
        adminInstructions: '',
        studentInstructions: '',
      },
      { order: 3, name: 'Seat Allocation & Merit Processing' },
    ]);
    assert.equal(steps[0].staffInstructions, 'Custom staff note');
    assert.match(steps[0].adminInstructions, /re-run AI/i);
    assert.match(steps[1].staffInstructions, /seat/i);
    assert.equal(hasAudienceInstructions(steps[0]), true);
    assert.equal(hasAudienceInstructions(steps[1]), true);
  });

  it('merges AI copy then falls back to canonical for remaining gaps', () => {
    const steps = mergeGeneratedAudienceInstructions(
      [{ order: 4, name: 'Offer Release' }],
      [
        {
          order: 4,
          staffInstructions: 'AI staff: release the offer letter.',
          adminInstructions: '',
          studentInstructions: 'AI student: wait for your offer.',
        },
      ],
    );
    assert.equal(steps[0].staffInstructions, 'AI staff: release the offer letter.');
    assert.match(steps[0].adminInstructions, /offer is ready/i);
    assert.equal(steps[0].studentInstructions, 'AI student: wait for your offer.');
  });

  it('seeds instructions on a newly created step so save is not blocked', () => {
    const step = createWorkflowStep(1);
    assert.equal(hasAudienceInstructions(step), true);
    validateWorkflowSteps([step]);
  });

  it('leaves empty extracted instructions so the AI fill pass can write them', () => {
    const mapped = mapExtractedWorkflowSteps([
      {
        order: 1,
        name: 'Document Verification',
        handledByType: 'ai',
        handledByAssignee: 'document_verification',
        slaValue: 4,
        slaUnit: 'hours',
        staffInstructions: '',
        adminInstructions: '',
        studentInstructions: '',
        outcomes: [
          { type: 'approved', route: { action: 'next_step', nextStepOrder: 2 } },
          { type: 'rejected', route: { action: 'end_workflow', terminalState: 'rejected' } },
          { type: 'needs_correction', route: { action: 'return_to_student' } },
        ],
      },
      {
        order: 2,
        name: 'Final Approval',
        handledByType: 'staff',
        handledByAssignee: 'approver',
        slaValue: 24,
        slaUnit: 'hours',
        staffInstructions: 'Already written by AI.',
        adminInstructions: 'Admin already written.',
        studentInstructions: 'Student already written.',
        outcomes: [
          { type: 'approved', route: { action: 'end_workflow', terminalState: 'completed' } },
          { type: 'rejected', route: { action: 'end_workflow', terminalState: 'rejected' } },
          { type: 'needs_correction', route: { action: 'return_to_student' } },
        ],
      },
    ]);
    assert.equal(mapped[1].staffInstructions, 'Already written by AI.');
    assert.equal(hasAudienceInstructions(mapped[0]), false);
  });
});
