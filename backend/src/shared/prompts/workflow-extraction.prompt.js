/**
 * Workflow Builder UI — two-phase extraction (steps first, outcomes second).
 * Reference: test data/example-admission-workflow-steps.txt
 */

import { ADMISSION_WORKFLOW_REFERENCE } from './admission-workflow-reference.prompt.js';

export const WORKFLOW_STAFF_ASSIGNEES =
  'document_verifier | approver | counter_staff | general';

export const WORKFLOW_AI_ASSIGNEES =
  'document_verification | eligibility_screening | template_validation';

/** Phase 1 example — six admission steps (UG programme pattern) */
export const WORKFLOW_SKELETON_JSON_EXAMPLE = `{
  "workflowSteps": [
    {
      "order": 1,
      "name": "Document Verification",
      "description": "Verify uploaded documents are complete, authentic, and readable.",
      "handledByType": "ai",
      "handledByAssignee": "document_verification",
      "slaValue": 4,
      "slaUnit": "hours",
      "staffInstructions": "AI checks each upload is the right document, readable, and belongs to the student. Act only if AI escalates.",
      "adminInstructions": "Same check as staff. You can re-run AI or send the request back if uploads are wrong.",
      "studentInstructions": "The institute checks that your uploads are the correct documents and belong to you. Wait unless asked to fix a file.",
      "documentExcerpt": "Required Documents / Common Applicant Errors section"
    },
    {
      "order": 2,
      "name": "Eligibility Validation",
      "description": "Verify academic eligibility against programme rules.",
      "handledByType": "ai",
      "handledByAssignee": "eligibility_screening",
      "slaValue": 24,
      "slaUnit": "hours",
      "staffInstructions": "AI compares extracted marks with programme rules. Act only if eligibility cannot be confirmed automatically.",
      "adminInstructions": "Review an escalated eligibility result. Completing this step means the student meets the published academic rules.",
      "studentInstructions": "The institute checks your marks and subjects against the programme rules. You do not need to do anything here.",
      "documentExcerpt": "Eligibility Rules section"
    },
    {
      "order": 3,
      "name": "Seat Allocation & Merit Processing",
      "description": "Determine seat availability based on rank and preferences.",
      "handledByType": "staff",
      "handledByAssignee": "approver",
      "slaValue": 48,
      "slaUnit": "hours",
      "staffInstructions": "Decide if a seat can be offered from rank, preferences, and remaining capacity. Allocate a seat or reject if none is available.",
      "adminInstructions": "This is the seat decision. Completing it moves the student to offer release. Reject if there is no seat.",
      "studentInstructions": "Admissions staff decide whether a seat can be offered. Wait here — there is nothing for you to submit.",
      "documentExcerpt": "Operational Notes / counselling"
    },
    {
      "order": 4,
      "name": "Offer Release",
      "description": "Generate admission offer.",
      "handledByType": "staff",
      "handledByAssignee": "approver",
      "slaValue": 48,
      "slaUnit": "hours",
      "staffInstructions": "Generate and release the admission offer for the allocated seat.",
      "adminInstructions": "Confirm the offer is ready, then complete this step so the student can pay.",
      "studentInstructions": "The institute is preparing your admission offer. You continue once it is released.",
      "documentExcerpt": "quote if offer release is described"
    },
    {
      "order": 5,
      "name": "Fee Payment",
      "description": "Collect admission fee from student.",
      "handledByType": "student",
      "handledByAssignee": "student",
      "slaValue": 72,
      "slaUnit": "hours",
      "staffInstructions": "The student pays the admission fee. Wait until payment is recorded.",
      "adminInstructions": "Monitor payment. Complete this step only after the fee is received.",
      "studentInstructions": "Pay the admission fee to complete this step.",
      "documentExcerpt": "quote if fees/payment mentioned"
    },
    {
      "order": 6,
      "name": "Admission Confirmation",
      "description": "Finalize admission.",
      "handledByType": "staff",
      "handledByAssignee": "approver",
      "slaValue": 24,
      "slaUnit": "hours",
      "staffInstructions": "Do a final check after fee payment, then confirm admission.",
      "adminInstructions": "Confirm admission after payment. Completing this step admits the student.",
      "studentInstructions": "The institute is doing a final check after your payment. Wait unless staff asks for a correction.",
      "documentExcerpt": "quote if final confirmation described"
    }
  ]
}`;

/** Phase 2 example — outcomes for steps 1–3 (pattern repeats for 4–6) */
export const WORKFLOW_OUTCOMES_JSON_EXAMPLE = `{
  "stepOutcomes": [
    {
      "order": 1,
      "outcomes": [
        { "type": "approved", "route": { "action": "next_step", "nextStepOrder": 2 } },
        { "type": "rejected", "route": { "action": "end_workflow", "terminalState": "rejected" } },
        {
          "type": "needs_correction",
          "route": {
            "action": "return_to_student",
            "returnToStepOrder": null,
            "requireReupload": ["Class 10 marksheet", "Class 12 marksheet", "BITSAT scorecard", "Government-issued ID proof", "Passport-size photograph", "Signature image"]
          }
        }
      ]
    },
    {
      "order": 2,
      "outcomes": [
        { "type": "approved", "route": { "action": "next_step", "nextStepOrder": 3 } },
        { "type": "rejected", "route": { "action": "end_workflow", "terminalState": "rejected" } },
        {
          "type": "needs_correction",
          "route": { "action": "return_to_student", "returnToStepOrder": null, "requireReupload": [] }
        }
      ]
    },
    {
      "order": 3,
      "outcomes": [
        { "type": "approved", "route": { "action": "next_step", "nextStepOrder": 4 } },
        { "type": "rejected", "route": { "action": "end_workflow", "terminalState": "rejected" } },
        {
          "type": "needs_correction",
          "route": { "action": "return_to_student", "returnToStepOrder": null, "requireReupload": [] }
        }
      ]
    },
    {
      "order": 4,
      "outcomes": [
        { "type": "approved", "route": { "action": "next_step", "nextStepOrder": 5 } },
        { "type": "rejected", "route": { "action": "end_workflow", "terminalState": "rejected" } },
        { "type": "needs_correction", "route": { "action": "return_to_student", "returnToStepOrder": null, "requireReupload": [] } }
      ]
    },
    {
      "order": 5,
      "outcomes": [
        { "type": "approved", "route": { "action": "next_step", "nextStepOrder": 6 } },
        { "type": "rejected", "route": { "action": "end_workflow", "terminalState": "rejected" } },
        {
          "type": "needs_correction",
          "route": { "action": "return_to_student", "returnToStepOrder": 5, "requireReupload": [] }
        }
      ]
    },
    {
      "order": 6,
      "outcomes": [
        { "type": "approved", "route": { "action": "end_workflow", "terminalState": "completed" } },
        { "type": "rejected", "route": { "action": "end_workflow", "terminalState": "rejected" } },
        {
          "type": "needs_correction",
          "route": { "action": "return_to_student", "returnToStepOrder": 1, "requireReupload": [] }
        }
      ]
    }
  ]
}`;

export const WORKFLOW_SKELETON_EXTRACTION_RULES = `PHASE 1 — WORKFLOW STEPS ONLY (no outcomes):

KNOWLEDGE DOC → WORKFLOW (admission / programme offerings):
- Many knowledge files describe programme overview, eligibility rules, required documents, and error/escalation tables WITHOUT a numbered workflow section.
- For undergraduate/admission offerings (programme name, BITSAT, eligibility table, mandatory documents), infer the standard multi-step admissions pipeline — do NOT return only "Document Verification".
- Use section headings and tables as documentExcerpt sources (Eligibility Rules, Required Documents, Common Applicant Errors, Escalation Conditions).

Step handlers (pick one primary per step):
- Document verification stage → ai + document_verification
- Eligibility / rules screening → ai + eligibility_screening
- Seat allocation, offer release, admission confirmation → staff + approver
- Fee payment → student + student

Rules:
- One workflowSteps entry per distinct stage; preserve logical order (verify docs → eligibility → seat → offer → fee → confirm).
- Do NOT merge stages. Do NOT include outcomes in this phase.
- Each step: order, name, description, handledByType, handledByAssignee, slaValue, slaUnit, staffInstructions, adminInstructions, studentInstructions, documentExcerpt.
- staffInstructions: what the assigned staff member must do on this step, in plain language. Include how they move the request forward.
- adminInstructions: what an institute admin should know or do on this step, including oversight (re-run, send back, assign).
- studentInstructions: what the applicant should do or wait for. Say clearly if they have no action.
- Write instructions from the knowledge document (counselling, seats, fees, eligibility). Do not leave these three fields empty.

${ADMISSION_WORKFLOW_REFERENCE}`;

export const WORKFLOW_OUTCOMES_EXTRACTION_RULES = `PHASE 2 — OUTCOME ROUTING ONLY:

You are given workflow steps from phase 1. For EACH order, return exactly three outcomes (approved, rejected, needs_correction).

Routing rules:
- approved = positive progress (next_step to next order, or end_workflow completed on order 6)
- rejected = terminal stop (fraud, ineligible, no seat, offer expired, payment missed, final failure). Waitlist / offer lapsed → rejected terminal (note in step description)
- needs_correction = return_to_student; Step 1 requireReupload = all mandatory document names from the knowledge doc; Step 5 payment pending → returnToStepOrder: 5

Use nextStepOrder / returnToStepOrder only (never stepId).
Return stepOutcomes for every step order from phase 1 — none missing.

${ADMISSION_WORKFLOW_REFERENCE}`;

export const WORKFLOW_BUILDER_JSON_EXAMPLE = WORKFLOW_SKELETON_JSON_EXAMPLE;
export const WORKFLOW_BUILDER_EXTRACTION_RULES = WORKFLOW_SKELETON_EXTRACTION_RULES;
