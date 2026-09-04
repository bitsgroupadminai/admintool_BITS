function text(step) {
  return `${step?.name ?? ''} ${step?.handledBy?.assignee ?? ''}`.toLowerCase();
}

export function classifyWorkflowStep(step) {
  const blob = text(step);
  const type = step?.handledBy?.type;

  if (/seat|merit|allocat/.test(blob)) return 'seat_allocation';
  if (/offer/.test(blob)) return 'offer_release';
  if (/fee|payment/.test(blob)) return 'fee_payment';
  if (/confirm/.test(blob) && /admission|enrol/.test(blob)) return 'admission_confirmation';
  if (/eligib/.test(blob)) return 'eligibility';
  if (/document/.test(blob)) return 'document_verification';
  if (type === 'student') return 'student_generic';
  if (type === 'ai') return 'ai_generic';
  return 'staff_generic';
}

const STAFF_TASK = {
  document_verification:
    'AI checks that each upload is the right document, is readable, and belongs to this student. You only need to act if AI could not finish or a file needs a human override.',
  eligibility:
    'AI compares extracted marks and subjects with this programme’s rules. You only need to act if eligibility could not be confirmed automatically.',
  seat_allocation:
    'This is a staff decision. Check merit, qualifying marks, preferences, and remaining capacity, then allocate a seat or reject if none is available. The student cannot complete this step.',
  offer_release:
    'Generate and send the admission offer for the allocated seat. Completing this step notifies the student and moves them to fee payment.',
  fee_payment:
    'The student pays the admission fee. You do not allocate anything here — wait until payment is recorded, then confirmation can proceed.',
  admission_confirmation:
    'Do a final check after fee payment, then confirm admission. Completing this step closes the request as admitted.',
  ai_generic: 'AI is handling this step. You only need to act if it escalates for a human decision.',
  student_generic: 'The student must complete this step. You can send the request back if they need to fix something first.',
  staff_generic: 'Review the request for this stage, then complete it to move the student forward or reject if they cannot continue.',
};

export function getStaffStepTask(step) {
  return STAFF_TASK[classifyWorkflowStep(step)] ?? STAFF_TASK.staff_generic;
}

export function getReviewerStepGuidance(step, role) {
  const adminText = String(step?.adminInstructions ?? '').trim();
  const staffText = String(step?.staffInstructions ?? '').trim();
  if (role === 'admin' && adminText) return adminText;
  if (staffText) return staffText;
  if (adminText) return adminText;
  return getStaffStepTask(step);
}

export function getStaffApproveLabel(step, nextStepName) {
  switch (classifyWorkflowStep(step)) {
    case 'seat_allocation':
      return nextStepName ? `Allocate seat and continue to ${nextStepName}` : 'Allocate seat';
    case 'offer_release':
      return nextStepName ? `Release offer and continue to ${nextStepName}` : 'Release offer';
    case 'admission_confirmation':
      return 'Confirm admission';
    case 'document_verification':
      return nextStepName ? `Confirm documents and continue to ${nextStepName}` : 'Confirm documents';
    case 'eligibility':
      return nextStepName ? `Confirm eligibility and continue to ${nextStepName}` : 'Confirm eligibility';
    default:
      return nextStepName ? `Complete this step and continue to ${nextStepName}` : 'Complete this step';
  }
}

export function getStaffRejectLabel(step) {
  return classifyWorkflowStep(step) === 'seat_allocation'
    ? 'No seat — reject request'
    : 'Reject request';
}

export function getStaffApproveConfirm(step, nextStepName) {
  switch (classifyWorkflowStep(step)) {
    case 'seat_allocation':
      return nextStepName
        ? `This records that a seat is available and moves the student to ${nextStepName}.`
        : 'This records that a seat is available for this student.';
    case 'offer_release':
      return 'This records that the offer has been released to the student.';
    case 'admission_confirmation':
      return 'This confirms admission and closes the request.';
    default:
      return nextStepName
        ? `This completes “${step?.name ?? 'this step'}” and moves the student to ${nextStepName}.`
        : `This completes “${step?.name ?? 'this step'}”.`;
  }
}
