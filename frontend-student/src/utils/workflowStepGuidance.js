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

const CURRENT = {
  document_verification:
    'The institute is checking that your uploads are the right documents and belong to you. You do not need to do anything unless you are asked to fix a file.',
  eligibility:
    'The institute is checking your marks and subjects against the programme rules. You do not need to do anything on this step.',
  seat_allocation:
    'Admissions staff are deciding whether a seat can be offered, based on merit, your preferences, and remaining capacity. You cannot complete this step yourself — wait here for an update.',
  offer_release:
    'The institute is preparing your admission offer. You will be able to continue once the offer is released.',
  fee_payment:
    'Pay the admission fee below to complete this step.',
  admission_confirmation:
    'The institute is doing a final check after your payment. You do not need to do anything unless staff asks for a correction.',
  ai_generic: 'The institute is reviewing this step automatically. You do not need to do anything unless you are asked to fix something.',
  student_generic: 'This step needs an action from you on this page.',
  staff_generic:
    'Admissions staff are working on this step. You do not need to do anything unless they ask you to update your request.',
};

const COMPLETE = {
  document_verification: 'Your documents were verified.',
  eligibility: 'You met the eligibility checks for this programme.',
  seat_allocation: 'A seat was allocated. The next step is your offer.',
  offer_release: 'Your offer was released.',
  fee_payment: 'Fee received. You can continue with your request.',
  admission_confirmation: 'Admission is confirmed.',
  student_generic: 'You completed this step.',
  ai_generic: 'This check is complete.',
  staff_generic: 'This step is complete.',
};

const UPCOMING = {
  document_verification: 'After you submit, the institute verifies your documents.',
  eligibility: 'After your documents are verified, the institute checks eligibility.',
  seat_allocation:
    'If you are eligible, admissions staff will decide whether a seat can be allocated. You wait for that decision — there is nothing to submit here.',
  offer_release: 'If a seat is allocated, the institute releases your offer.',
  fee_payment: 'The course fee is collected at this step after earlier steps finish.',
  admission_confirmation: 'After fee payment, the institute confirms your admission.',
  student_generic: 'You will complete this step after earlier steps finish.',
  ai_generic: 'The institute will review this step after earlier steps finish.',
  staff_generic: 'Institute staff will handle this step after earlier steps finish.',
};

const ACTOR = {
  document_verification: 'The institute completes this automatically. You wait unless asked to fix a file.',
  eligibility: 'The institute completes this automatically. You wait.',
  seat_allocation: 'Admissions staff decide this. You wait — there is nothing to submit here.',
  offer_release: 'Admissions staff release the offer. You wait.',
  fee_payment: 'You complete this step by paying the fee.',
  admission_confirmation: 'Admissions staff confirm admission. You wait unless asked to fix something.',
  ai_generic: 'The institute completes this automatically. You wait.',
  student_generic: 'You complete this step.',
  staff_generic: 'Admissions staff handle this. You wait unless they ask you to update your request.',
};

const WAITING_ON = {
  document_verification: 'Waiting on automatic document checks',
  eligibility: 'Waiting on automatic eligibility checks',
  seat_allocation: 'Waiting on admissions staff',
  offer_release: 'Waiting on admissions staff',
  admission_confirmation: 'Waiting on admissions staff',
  fee_payment: 'Your action is needed',
  student_generic: 'Your action is needed',
  ai_generic: 'Waiting on automatic checks',
  staff_generic: 'Waiting on admissions staff',
};

export function getStudentStepActor(step, { isFeeStep = false } = {}) {
  if (isFeeStep) return ACTOR.fee_payment;
  return ACTOR[classifyWorkflowStep(step)] ?? ACTOR.staff_generic;
}

export function getStudentWaitingOn(step, { isFeeStep = false } = {}) {
  if (isFeeStep) return WAITING_ON.fee_payment;
  return WAITING_ON[classifyWorkflowStep(step)] ?? WAITING_ON.staff_generic;
}

export function getStudentStepDescription(
  step,
  { isFeeStep = false, paymentPaid = false, status, documentsComplete, index } = {},
) {
  if (isFeeStep) {
    if (paymentPaid || step.state === 'complete') return COMPLETE.fee_payment;
    if (step.state === 'current') return CURRENT.fee_payment;
    return UPCOMING.fee_payment;
  }

  const kind = classifyWorkflowStep(step);

  if (index === 0 && status === 'needs_correction') {
    return 'The institute asked you to update your documents. Fix the files below, then resubmit so review can continue.';
  }
  if (index === 0 && (!status || status === 'draft')) {
    return documentsComplete
      ? 'Documents are ready. Complete your details below and submit this step to start institute verification.'
      : 'Upload the required documents below, then complete your details and submit this step.';
  }

  const authored = String(step?.studentInstructions ?? '').trim();
  if (authored) return authored;

  if (step.state === 'current') return CURRENT[kind] ?? CURRENT.staff_generic;
  if (step.state === 'complete') return COMPLETE[kind] ?? COMPLETE.staff_generic;
  return UPCOMING[kind] ?? UPCOMING.staff_generic;
}
