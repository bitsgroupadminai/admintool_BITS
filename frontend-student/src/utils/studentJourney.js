import { formatQueueMode } from '@/utils/offering';
import { areAllRequiredDocumentsUploaded } from '@/utils/applicationDocuments';
import { areApplicantDetailsComplete, applicantDetailsToMap } from '@/utils/applicantDetails';
import { isPaymentPending } from '@/utils/payment';

const STATUS_LABELS = {
  draft: 'Draft saved',
  submitted: 'Submitted',
  in_review: 'Under review',
  needs_correction: 'Correction needed',
  admitted: 'Approved',
  rejected: 'Not approved',
};

export function getApplicationStatusLabel(status) {
  return STATUS_LABELS[status] ?? 'Not started';
}

/**
 * Student-facing steps for completing a service request (not institute backend workflow).
 * @param {Object} offering
 * @param {{ status?: string, documentsComplete?: boolean, workflow?: Object } | null} application
 */
export function buildStudentServiceSteps(offering, application) {
  if (application?.workflow?.steps?.length) {
    return application.workflow.steps.map((step) => ({
      id: step.stepId,
      title: step.name,
      description:
        step.state === 'current'
          ? 'The institute is working on this step now.'
          : step.state === 'complete'
            ? 'This step is complete.'
            : 'This step will happen after earlier steps finish.',
      state: step.state,
    }));
  }

  const requiredDocs =
    offering?.documentRequirements?.filter((doc) => doc.required !== false) ?? [];
  const hasApplicantFields = (offering?.applicantFields?.length ?? 0) > 0;
  const status = application?.status ?? null;
  const hasDraft = status === 'draft';
  const needsCorrection = status === 'needs_correction';
  const isSubmitted = ['submitted', 'in_review', 'admitted', 'rejected', 'needs_correction'].includes(status);
  const documentsComplete = areAllRequiredDocumentsUploaded(offering, application);
  const applicantDetailsComplete = areApplicantDetailsComplete(
    offering,
    applicantDetailsToMap(application?.applicantDetails),
  );

  const docDescription =
    requiredDocs.length > 0
      ? `Upload these files: ${requiredDocs.map((doc) => doc.name).join(', ')}.`
      : 'No documents are required for this request.';

  const steps = [
    {
      id: 'review',
      title: 'Check the requirements',
      description: 'Make sure this option fits you and note what the institute will check.',
      state: 'complete',
    },
    {
      id: 'start',
      title: 'Start your request',
      description: hasApplicantFields
        ? 'Fill in your personal details and save a draft so you can upload documents.'
        : 'Save a draft so you can upload documents and submit when ready.',
      state: application ? 'complete' : 'current',
    },
    ...(hasApplicantFields
      ? [
          {
            id: 'details',
            title: 'Provide your information',
            description: 'Share details such as date of birth, address, and phone number.',
            state: !application
              ? 'upcoming'
              : applicantDetailsComplete
                ? 'complete'
                : hasDraft || needsCorrection
                  ? 'current'
                  : 'complete',
          },
        ]
      : []),
    {
      id: 'documents',
      title: needsCorrection ? 'Update your documents' : 'Upload your documents',
      description: needsCorrection
        ? application?.correctionNote ||
          'The institute asked for corrections. Update the required files and resubmit.'
        : docDescription,
      state: !application
        ? 'upcoming'
        : documentsComplete
          ? 'complete'
          : hasDraft || needsCorrection
            ? 'current'
            : 'complete',
    },
    {
      id: 'submit',
      title: needsCorrection ? 'Resubmit for review' : 'Submit for review',
      description: needsCorrection
        ? 'Send your updated request back to the institute.'
        : 'Send your request to the institute once every required document is uploaded.',
      state: needsCorrection
        ? documentsComplete
          ? 'current'
          : 'upcoming'
        : isSubmitted
          ? 'complete'
          : hasDraft && documentsComplete
            ? 'current'
            : 'upcoming',
    },
    {
      id: 'follow-up',
      title: isSubmitted && !needsCorrection ? 'Wait for an update' : formatQueueMode(offering?.queueMode),
      description:
        isSubmitted && !needsCorrection
          ? 'The institute is reviewing your request. Check back here for status updates.'
          : needsCorrection
            ? 'Fix the requested items, then resubmit so review can continue.'
            : 'After you submit, the institute will process your request and contact you if needed.',
      state: isSubmitted && !needsCorrection ? 'current' : needsCorrection ? 'upcoming' : 'upcoming',
    },
  ];

  return steps;
}

export function getPrimaryAction(application, offering, applicantDetails = {}) {
  const hasApplicantFields = (offering?.applicantFields?.length ?? 0) > 0;
  const detailsComplete = areApplicantDetailsComplete(offering, applicantDetails);

  if (!application) {
    if (hasApplicantFields && !detailsComplete) {
      return null;
    }
    return { type: 'start', label: 'Start my request' };
  }

  if (application.status === 'draft') {
    if (hasApplicantFields && !detailsComplete) {
      return null;
    }
    if (!areAllRequiredDocumentsUploaded(offering, application)) {
      return null;
    }
    if (isPaymentPending(application)) {
      return null;
    }
    return { type: 'submit', label: 'Submit for review' };
  }

  if (application.status === 'needs_correction') {
    if (hasApplicantFields && !detailsComplete) {
      return null;
    }
    if (!areAllRequiredDocumentsUploaded(offering, application)) {
      return null;
    }
    return { type: 'resubmit', label: 'Resubmit for review' };
  }

  return null;
}
