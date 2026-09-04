/**
 * Reference: test data/example-admission-workflow-steps.txt
 * Maps programme knowledge docs (overview + eligibility + documents + errors) → 6-step offering workflow.
 */

export const ADMISSION_WORKFLOW_REFERENCE = `
REFERENCE — B.E. / undergraduate admission offering (e.g. "B.E. Computer Science (UG-CS)"):

When the knowledge document has programme details, eligibility rules, required documents, and operational/error-handling notes BUT does not literally list "Step 1 / Step 2", you MUST still emit this full 6-step workflow for that offering:

| Order | Step name | Handled by (map to JSON) | Purpose |
| 1 | Document Verification | ai + document_verification | Verify uploads complete, authentic, readable |
| 2 | Eligibility Validation | ai + eligibility_screening | Verify academic eligibility (PCM, aggregate, subjects) |
| 3 | Seat Allocation & Merit Processing | staff + approver | Seat availability from rank/preferences |
| 4 | Offer Release | staff + approver | Generate admission offer |
| 5 | Fee Payment | student + student | Student pays admission fee |
| 6 | Admission Confirmation | staff + approver | Finalize admission |

Ground each step's description, audience instructions, and documentExcerpt in the document (eligibility table, mandatory documents list, common applicant errors, escalation conditions, operational notes).

For every step you MUST also write:
- staffInstructions — what staff do on this step
- adminInstructions — what an admin does or oversees on this step
- studentInstructions — what the student does or waits for

PHASE 2 outcome mapping (three UI types per step — put extra labels in step description):

Step 1 — Document Verification
- approved (Documents Verified) → next_step order 2
- needs_correction (Missing/Invalid Documents) → return_to_student, requireReupload = ALL mandatory document names from the document
- rejected (Fraud/Serious Mismatch) → end_workflow rejected. Examples in description: forged marksheet, identity mismatch, duplicate application

Step 2 — Eligibility Validation
- approved (Eligible) → next_step order 3
- needs_correction (Eligibility Clarification) → return_to_student. Description: foreign board equivalency, aggregate dispute, marks conversion
- rejected (Not Eligible) → end_workflow rejected. Description: PCM missing, maths missing, aggregate below threshold, individual subject below minimum

Step 3 — Seat Allocation & Merit Processing
- approved (Seat Available) → next_step order 4
- rejected (No Seat Available OR Waitlisted) → end_workflow rejected. If document mentions waitlist, note in description; both use rejected terminal (UI has no waitlist state)
- needs_correction → return_to_student only if document describes clarification before seat decision

Step 4 — Offer Release
- approved (Offer Generated) → next_step order 5
- rejected (Offer Expired) → end_workflow rejected

Step 5 — Fee Payment
- approved (Fee Paid) → next_step order 6
- needs_correction (Payment Pending) → return_to_student, returnToStepOrder: 5 (same step). Description: reminders sent
- rejected (Payment Deadline Missed / Offer Lapsed) → end_workflow rejected

Step 6 — Admission Confirmation (final)
- approved (Admission Confirmed) → end_workflow completed
- rejected (Final Verification Failure) → end_workflow rejected
- needs_correction → return_to_student returnToStepOrder 1 if document says return for doc fixes at final stage
`;

export const ADMISSION_SKELETON_SIGNALS = [
  'eligibility',
  'required documents',
  'mandatory documents',
  'marksheet',
  'admission',
  'programme',
  'program',
  'bitsat',
  'applicant',
  'qualification',
  '10+2',
  'pcm',
];
