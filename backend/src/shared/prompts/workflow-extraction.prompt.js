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
- Each step: order, name, description (include purpose + document-specific notes), handledByType, handledByAssignee, slaValue, slaUnit, documentExcerpt.

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
