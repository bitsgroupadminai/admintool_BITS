import { APPLICATION_STATUS } from '../enums/application.enums.js';

const UNLOCKED_STATUSES = new Set([
  APPLICATION_STATUS.SUBMITTED,
  APPLICATION_STATUS.IN_REVIEW,
  APPLICATION_STATUS.ADMITTED,
]);

/**
 * Visit planning (queue/appointment) unlocks after required documents are uploaded
 * and the request has been submitted for institute review.
 * Approved requests always unlock — document review is already complete.
 * @param {{ status?: string, documentsComplete?: boolean } | null | undefined} application
 */
export function isVisitPlanningUnlocked(application) {
  if (!application) return false;
  if (!UNLOCKED_STATUSES.has(application.status)) return false;

  if (application.status === APPLICATION_STATUS.ADMITTED) {
    return true;
  }

  if (application.documentsComplete === false) return false;
  return true;
}

export function getVisitPlanningLockReason(application) {
  if (!application) {
    return 'Start and submit your request before booking a visit.';
  }
  if (application.status === APPLICATION_STATUS.DRAFT) {
    return 'Submit your request after uploading all required documents.';
  }
  if (application.status === APPLICATION_STATUS.NEEDS_CORRECTION) {
    return 'Update the requested documents and resubmit before booking a visit.';
  }
  if (application.status === APPLICATION_STATUS.REJECTED) {
    return 'This request was not approved, so visit booking is not available.';
  }
  if (application.status === APPLICATION_STATUS.ADMITTED) {
    return null;
  }
  if (application.documentsComplete === false) {
    return 'Upload all required documents before booking a visit.';
  }
  return null;
}
