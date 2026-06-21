import {
  emitToInstitute,
  emitToOffering,
  emitToApplication,
  emitToUser,
} from '../../core/config/websocket.js';
import { WS_EVENTS } from '../../core/config/websocket.events.js';

/**
 * Notify viewers that an application changed.
 * REST remains source of truth; clients refetch or patch local state.
 */
export function emitApplicationUpdated({
  instituteId,
  applicationId,
  studentUserId,
  assigneeUserId,
  summary,
}) {
  const payload = { applicationId, ...summary };

  emitToApplication(applicationId, WS_EVENTS.APPLICATION_UPDATED, payload);

  if (studentUserId) {
    emitToUser(studentUserId, WS_EVENTS.APPLICATION_UPDATED, payload);
  }
  if (assigneeUserId) {
    emitToUser(assigneeUserId, WS_EVENTS.APPLICATION_UPDATED, payload);
  }

  emitToInstitute(instituteId, WS_EVENTS.APPLICATION_UPDATED, payload);
  emitDashboardUpdated(instituteId);
}

/** Signal staff/admin dashboards to refresh analytics summaries. */
export function emitDashboardUpdated(instituteId, scope = 'all') {
  emitToInstitute(instituteId, WS_EVENTS.DASHBOARD_UPDATED, { scope });
}

/** Student queue ticket position/status changed. */
export function emitQueueTicketUpdated(userId, ticket, offeringId) {
  if (userId) {
    emitToUser(userId, WS_EVENTS.QUEUE_TICKET, { offeringId, ticket });
  }
  emitToOffering(offeringId, WS_EVENTS.QUEUE_TICKET, { offeringId, ticket });
}

export function emitQueueBoardUpdated(instituteId, offeringId) {
  emitToInstitute(instituteId, WS_EVENTS.QUEUE_UPDATED, { offeringId });
}

export function emitAppointmentSlotsUpdated(instituteId, offeringId) {
  emitToOffering(offeringId, WS_EVENTS.APPOINTMENT_SLOTS_UPDATED, { offeringId });
  emitToInstitute(instituteId, WS_EVENTS.APPOINTMENT_UPDATED, { offeringId });
}

export function emitAppointmentUpdated(instituteId, offeringId) {
  emitToInstitute(instituteId, WS_EVENTS.APPOINTMENT_UPDATED, { offeringId });
}
