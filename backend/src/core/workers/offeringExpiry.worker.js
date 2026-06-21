import { Offering } from '../../modules/offerings/offering.model.js';
import { OFFERING_STATUS } from '../../shared/enums/offering.enums.js';
import { flushInstituteReadCache } from '../../shared/helpers/cacheInvalidation.helper.js';
import { logger } from '../logger/index.js';

const EXPIRY_INTERVAL_MS = 60 * 60 * 1000;

/** @type {NodeJS.Timeout | null} */
let expiryTimer = null;

async function expireOfferings() {
  const now = new Date();
  const result = await Offering.updateMany(
    {
      endDate: { $lt: now },
      status: { $nin: [OFFERING_STATUS.EXPIRED, OFFERING_STATUS.ARCHIVED] },
    },
    { $set: { status: OFFERING_STATUS.EXPIRED } },
  );

  if (result.modifiedCount > 0) {
    logger.info({ count: result.modifiedCount }, 'Expired offerings updated');
    const institutes = await Offering.distinct('instituteId', {
      endDate: { $lt: now },
      status: OFFERING_STATUS.EXPIRED,
    });
    await Promise.all(institutes.map((id) => flushInstituteReadCache(id.toString())));
  }
}

export function startOfferingExpiryJob() {
  if (expiryTimer) return;

  expireOfferings().catch((err) => {
    logger.error({ err }, 'Initial offering expiry job failed');
  });

  expiryTimer = setInterval(() => {
    expireOfferings().catch((err) => {
      logger.error({ err }, 'Offering expiry job failed');
    });
  }, EXPIRY_INTERVAL_MS);

  logger.info('Offering expiry job started');
}

export function stopOfferingExpiryJob() {
  if (expiryTimer) {
    clearInterval(expiryTimer);
    expiryTimer = null;
  }
}
