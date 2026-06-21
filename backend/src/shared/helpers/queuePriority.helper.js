import { QUEUE_PRIORITY } from '../enums/operations.enums.js';

/** Lower rank = served first */
export const PRIORITY_RANK = {
  [QUEUE_PRIORITY.URGENT]: 0,
  [QUEUE_PRIORITY.HIGH]: 1,
  [QUEUE_PRIORITY.NORMAL]: 2,
  [QUEUE_PRIORITY.LOW]: 3,
};

export const PRIORITY_LABELS = {
  [QUEUE_PRIORITY.URGENT]: 'Urgent',
  [QUEUE_PRIORITY.HIGH]: 'High priority',
  [QUEUE_PRIORITY.NORMAL]: 'Normal',
  [QUEUE_PRIORITY.LOW]: 'Low',
};

/**
 * Auto-assign queue priority from application deadlines (college use case).
 * @param {import('../../modules/applications/application.model.js').Application} application
 * @param {import('../../modules/offerings/offering.model.js').Offering | null} offering
 */
export function computeAutoQueuePriority(application, offering = null) {
  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  if (application.slaBreached) {
    return {
      priority: QUEUE_PRIORITY.URGENT,
      reason: 'SLA deadline has been breached — needs immediate attention',
    };
  }

  if (application.currentStepDueAt) {
    const due = new Date(application.currentStepDueAt);
    if (due <= endOfToday) {
      return {
        priority: QUEUE_PRIORITY.HIGH,
        reason: 'Workflow step deadline is today',
      };
    }
    const tomorrow = new Date(endOfToday);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (due <= tomorrow) {
      return {
        priority: QUEUE_PRIORITY.HIGH,
        reason: 'Workflow step deadline is tomorrow',
      };
    }
  }

  if (offering?.endDate) {
    const offeringEnd = new Date(offering.endDate);
    if (offeringEnd <= endOfToday) {
      return {
        priority: QUEUE_PRIORITY.HIGH,
        reason: 'Programme enrollment deadline is today',
      };
    }
  }

  return {
    priority: QUEUE_PRIORITY.NORMAL,
    reason: 'Standard queue priority',
  };
}

/**
 * @param {Array<{ priority?: string, createdAt: Date | string }>} tickets
 */
export function sortQueueTicketsByPriority(tickets) {
  return [...tickets].sort((left, right) => {
    const leftRank = PRIORITY_RANK[left.priority ?? QUEUE_PRIORITY.NORMAL] ?? 2;
    const rightRank = PRIORITY_RANK[right.priority ?? QUEUE_PRIORITY.NORMAL] ?? 2;
    if (leftRank !== rightRank) return leftRank - rightRank;
    return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
  });
}

/**
 * @param {string | null | undefined} priority
 */
export function assertValidQueuePriority(priority) {
  if (!Object.values(QUEUE_PRIORITY).includes(priority)) {
    throw new Error(`Invalid queue priority: ${priority}`);
  }
}
