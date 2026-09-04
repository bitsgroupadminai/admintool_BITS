import { Application } from './application.model.js';
import { Payment } from '../payments/payment.model.js';
import { Appointment } from '../appointments/appointment.model.js';
import { QueueTicket } from '../queue/queueTicket.model.js';
import { AiDecision } from '../ai-verification/aiDecision.model.js';
import { deleteStoredApplicationDocument } from '../../shared/services/applicationFile.storage.js';
import { flushInstituteReadCache } from '../../shared/helpers/cacheInvalidation.helper.js';
import { emitApplicationUpdated, emitDashboardUpdated } from '../../shared/helpers/realtime.helper.js';
import { logger } from '../../core/logger/index.js';

/**
 * Permanently remove an application and related files, AI decisions,
 * payments, appointments, and queue tickets.
 * @param {import('./application.model.js').Application} application
 * @param {{ emitRealtime?: boolean, flushCache?: boolean }} [options]
 */
export async function purgeApplicationRecord(application, options = {}) {
  const emitRealtime = options.emitRealtime !== false;
  const flushCache = options.flushCache !== false;
  const applicationId = application._id;
  const instituteId = application.instituteId.toString();

  for (const document of application.documents ?? []) {
    try {
      await deleteStoredApplicationDocument(document);
    } catch (err) {
      logger.warn(
        { err: err?.message, applicationId: applicationId.toString() },
        'Could not delete stored application document during purge',
      );
    }
  }

  await Promise.all([
    AiDecision.deleteMany({ applicationId }),
    Payment.deleteMany({ applicationId }),
    Appointment.deleteMany({ applicationId }),
    QueueTicket.deleteMany({ applicationId }),
  ]);

  await Application.deleteOne({ _id: applicationId, instituteId: application.instituteId });

  if (emitRealtime) {
    emitApplicationUpdated({
      instituteId,
      applicationId: applicationId.toString(),
      studentUserId: null,
      assigneeUserId: application.assignedTo?.toString() ?? null,
      summary: {
        status: 'deleted',
        serviceId: application.serviceId?.toString(),
        offeringId: application.offeringId?.toString(),
        applicantName: application.applicantName,
        updatedAt: new Date(),
      },
    });
    emitDashboardUpdated(instituteId);
  }
  if (flushCache) {
    await flushInstituteReadCache(instituteId);
  }

  return { id: applicationId.toString() };
}
