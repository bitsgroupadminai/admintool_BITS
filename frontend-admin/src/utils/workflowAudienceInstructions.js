const KIND_TO_ORDER = {
  document_verification: 1,
  eligibility: 2,
  seat_allocation: 3,
  offer_release: 4,
  fee_payment: 5,
  admission_confirmation: 6,
};

function classifyStepName(name = '') {
  const label = String(name).toLowerCase();
  if (/offer/.test(label)) return 'offer_release';
  if (/fee|payment/.test(label)) return 'fee_payment';
  if (/confirm/.test(label)) return 'admission_confirmation';
  if (/seat|merit|allocat/.test(label)) return 'seat_allocation';
  if (/eligib/.test(label)) return 'eligibility';
  if (/document/.test(label)) return 'document_verification';
  return 'progress';
}

function canonicalByOrder(order) {
  switch (order) {
    case 1:
      return {
        staffInstructions:
          'AI checks that each upload is the right document, is readable, and belongs to the student. Act only if AI escalates or a file needs a human override.',
        adminInstructions:
          'Same check as staff. You can re-run AI, override a file, or send the request back if uploads are wrong.',
        studentInstructions:
          'The institute checks that your uploads are the correct documents and belong to you. You wait unless you are asked to fix a file.',
      };
    case 2:
      return {
        staffInstructions:
          'AI compares extracted marks and subjects with this programme’s rules. Act only if eligibility could not be confirmed automatically.',
        adminInstructions:
          'Review the AI eligibility result if it is escalated. Completing this step means the student meets the published academic rules.',
        studentInstructions:
          'The institute checks your marks and subjects against the programme rules. You do not need to do anything on this step.',
      };
    case 3:
      return {
        staffInstructions:
          'Decide whether a seat can be offered. Check merit, qualifying marks, preferences, and remaining capacity, then allocate a seat or reject if none is available. The student cannot complete this step.',
        adminInstructions:
          'This is the seat decision. Completing it records that a seat is available and moves the student to offer release. Reject if there is no seat. Send back only if an earlier step must be repeated.',
        studentInstructions:
          'Admissions staff decide whether a seat can be offered, based on merit, your preferences, and remaining capacity. Wait here — there is nothing for you to submit.',
      };
    case 4:
      return {
        staffInstructions:
          'Generate and release the admission offer for the allocated seat. Completing this step notifies the student and moves them to fee payment.',
        adminInstructions:
          'Confirm the offer is ready, then complete this step so the student can pay. Reject only if the offer cannot be issued.',
        studentInstructions:
          'The institute is preparing your admission offer. You can continue once the offer is released.',
      };
    case 5:
      return {
        staffInstructions:
          'The student pays the admission fee. You do not allocate a seat here — wait until payment is recorded.',
        adminInstructions:
          'Monitor payment. Complete this step only after the fee is received, or send reminders if payment is still pending.',
        studentInstructions: 'Pay the admission fee to complete this step.',
      };
    case 6:
      return {
        staffInstructions:
          'Do a final check after fee payment, then confirm admission. Completing this step closes the request as admitted.',
        adminInstructions:
          'Confirm admission after payment and any last verification. Completing this step admits the student.',
        studentInstructions:
          'The institute is doing a final check after your payment. You wait unless staff asks for a correction.',
      };
    default:
      return {
        staffInstructions:
          'Complete the work this step requires, then move the request forward or reject it.',
        adminInstructions:
          'Oversee this step. Complete it to progress the request, or send it back if an earlier stage must be repeated.',
        studentInstructions:
          'The institute is working on this step. You wait unless you are asked to take an action.',
      };
  }
}

export function audienceInstructionsForStep(step = {}) {
  const kind = classifyStepName(step.name);
  const order = KIND_TO_ORDER[kind] ?? 0;
  return canonicalByOrder(order);
}

export function isUneditedAudienceCopy(step = {}) {
  const current = {
    staffInstructions: String(step.staffInstructions ?? '').trim(),
    adminInstructions: String(step.adminInstructions ?? '').trim(),
    studentInstructions: String(step.studentInstructions ?? '').trim(),
  };
  if (!current.staffInstructions && !current.adminInstructions && !current.studentInstructions) {
    return true;
  }
  const names = [
    '',
    'Document Verification',
    'Eligibility Validation',
    'Seat Allocation',
    'Offer Release',
    'Fee Payment',
    'Admission Confirmation',
    'Final Approval',
    step.name,
  ];
  return names.some((name) => {
    const canonical = audienceInstructionsForStep({ name });
    return (
      canonical.staffInstructions === current.staffInstructions &&
      canonical.adminInstructions === current.adminInstructions &&
      canonical.studentInstructions === current.studentInstructions
    );
  });
}
