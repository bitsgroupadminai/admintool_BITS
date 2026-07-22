import { Institute } from '../institutes/institute.model.js';
import { Offering } from '../offerings/offering.model.js';
import { Application } from '../applications/application.model.js';
import { User } from '../users/user.model.js';
import { Appointment } from './appointment.model.js';
import { AppError } from '../../core/utils/AppError.js';
import { MEETING_STATUS, VISIT_MODE, MEETING_PROVIDER } from '../../shared/enums/operations.enums.js';
import { generateMeetingLink, isValidMeetingUrl } from '../../shared/helpers/meetingLink.helper.js';
import { deleteGoogleMeetEvent } from '../../shared/services/googleMeet.service.js';
import {
  sendAppointmentBookedEmail,
  sendVirtualMeetingEmail,
  sendAppointmentRescheduledEmail,
  sendAppointmentCancelledEmail,
  getStudentPortalUrl,
} from '../../shared/templates/operationsEmails.js';
import { buildStudentServiceLink } from '../../shared/helpers/applicationLinks.helper.js';
import { enqueueOperationsJob, OPERATIONS_JOB } from '../../core/queues/operations.queue.js';
import { flushInstituteReadCache } from '../../shared/helpers/cacheInvalidation.helper.js';
import {
  emitAppointmentSlotsUpdated,
  emitAppointmentUpdated,
} from '../../shared/helpers/realtime.helper.js';

function getMaxAdditionalRecipients(offering) {
  const configured = offering?.appointmentConfig?.virtualAppointment?.maxAdditionalRecipients;
  return Number.isFinite(configured) && configured > 0 ? configured : 50;
}

function assertAdditionalRecipientsWithinLimit(offering, emails = []) {
  const max = getMaxAdditionalRecipients(offering);
  if (emails.length > max) {
    throw new AppError(
      `You can invite up to ${max} additional participants for this service (configured in offering settings)`,
      400,
    );
  }
}

/**
 * @param {{ action: string, appointmentId: string, instituteId: string, [key: string]: unknown }} payload
 */
export async function enqueueAppointmentLifecycle(payload) {
  return enqueueOperationsJob(OPERATIONS_JOB.APPOINTMENT_LIFECYCLE, {
    ...payload,
    jobId: `${payload.action}-${payload.appointmentId}-${Date.now()}`,
  });
}

function formatMeetingForResponse(appointment) {
  if (!appointment.meeting) return null;
  return {
    provider: appointment.meeting.provider ?? null,
    link: appointment.meeting.link ?? null,
    meetingId: appointment.meeting.meetingId ?? null,
    passcode: appointment.meeting.passcode ?? null,
    status: appointment.meeting.status ?? null,
    additionalRecipients: appointment.meeting.additionalRecipients ?? [],
    hostStaffEmail: appointment.meeting.hostStaffEmail ?? null,
    hostStaffName: appointment.meeting.hostStaffName ?? null,
    generatedAt: appointment.meeting.generatedAt ?? null,
    confirmedAt: appointment.meeting.confirmedAt ?? null,
    sentAt: appointment.meeting.sentAt ?? null,
    linkSentToStudent: appointment.meeting.linkSentToStudent ?? false,
  };
}

export function formatAppointmentRecord(appointment) {
  return {
    id: appointment._id.toString(),
    slotStart: appointment.slotStart,
    slotEnd: appointment.slotEnd,
    status: appointment.status,
    visitMode: appointment.visitMode ?? VISIT_MODE.IN_PERSON,
    meeting: formatMeetingForResponse(appointment),
    createdAt: appointment.createdAt,
  };
}

/** Students only see the Meet link after staff explicitly sends it. */
export function formatStudentAppointmentRecord(appointment) {
  const record = formatAppointmentRecord(appointment);
  if (!record.meeting) return record;

  const released = appointment.meeting?.linkSentToStudent === true;
  return {
    ...record,
    meeting: {
      provider: record.meeting.provider,
      status: record.meeting.status,
      linkSentToStudent: released,
      link: released ? record.meeting.link : null,
      meetingId: released ? record.meeting.meetingId : null,
      passcode: released ? record.meeting.passcode : null,
    },
  };
}

async function loadAppointmentContext(appointmentId, instituteId) {
  const appointment = await Appointment.findOne({ _id: appointmentId, instituteId });
  if (!appointment) return null;

  const [institute, offering, application] = await Promise.all([
    Institute.findById(instituteId).select('name'),
    Offering.findOne({ _id: appointment.offeringId, instituteId }).select(
      'name serviceId appointmentConfig',
    ),
    Application.findOne({ _id: appointment.applicationId, instituteId }).select(
      'applicantName applicantEmail serviceId',
    ),
  ]);

  return { appointment, institute, offering, application };
}

function buildMeetingContext(appointment, offering, application, institute) {
  const offeringName = offering?.name ?? 'Institute visit';
  const studentName = application?.applicantName ?? 'Student';
  return {
    summary: `${offeringName} — ${studentName}`,
    description: `Virtual appointment scheduled via EduPortal for ${studentName} (${appointment.applicantEmail}).`,
    slotStart: appointment.slotStart,
    slotEnd: appointment.slotEnd,
    instituteName: institute?.name ?? 'Institute',
  };
}

/**
 * @param {{ action: string, appointmentId: string, instituteId: string }} data
 */
export async function processAppointmentLifecycleJob(data) {
  const context = await loadAppointmentContext(data.appointmentId, data.instituteId);
  if (!context) return;

  const { appointment, institute, offering, application } = context;
  const instituteName = institute?.name ?? 'Your institute';
  const offeringName = offering?.name ?? 'Service visit';
  const serviceLink = application
    ? `${getStudentPortalUrl()}${buildStudentServiceLink(application.serviceId.toString())}`
    : getStudentPortalUrl();

  const emailBase = {
    recipientName: application?.applicantName ?? 'Student',
    applicantEmail: appointment.applicantEmail,
    instituteName,
    offeringName,
    slotStart: appointment.slotStart,
    studentPortalUrl: getStudentPortalUrl(),
    serviceLink,
    visitMode: appointment.visitMode,
  };

  if (data.action === 'booked') {
    await sendAppointmentBookedEmail(emailBase);
    return;
  }

  if (data.action === 'meeting_generate') {
    await setupVirtualMeetingLink(appointment._id.toString(), data.instituteId, {
      provider: MEETING_PROVIDER.GOOGLE_MEET,
      staffUserId: data.staffUserId,
      staffEmail: data.staffEmail,
      staffName: data.staffName,
    });
    return;
  }

  if (data.action === 'meeting_send' || data.action === 'meeting_confirm') {
    await sendVirtualMeetingNotifications(appointment._id.toString(), data.instituteId, {
      confirmedByUserId: data.confirmedByUserId,
      includeStudent: data.includeStudent === true,
      additionalRecipients: data.additionalRecipients ?? [],
    });
    return;
  }

  if (data.action === 'rescheduled') {
    await sendAppointmentRescheduledEmail(emailBase);
    return;
  }

  if (data.action === 'cancelled') {
    await sendAppointmentCancelledEmail(emailBase);
  }
}

/**
 * Staff-only: create a real Google Meet link via Calendar API.
 * Students never trigger this.
 *
 * @param {string} appointmentId
 * @param {string} instituteId
 * @param {{ provider?: string, staffUserId?: string, staffEmail?: string, staffName?: string }} [options]
 */
export async function setupVirtualMeetingLink(appointmentId, instituteId, options = {}) {
  const context = await loadAppointmentContext(appointmentId, instituteId);
  if (!context) return null;

  const { appointment, offering, application, institute } = context;
  if (appointment.visitMode !== VISIT_MODE.VIRTUAL) return null;

  const provider = options.provider ?? MEETING_PROVIDER.GOOGLE_MEET;

  if (provider === MEETING_PROVIDER.ZOOM) {
    throw new AppError('Zoom integration is coming soon. Please use Google Meet.', 501);
  }

  if (appointment.meeting?.calendarEventId) {
    await deleteGoogleMeetEvent(appointment.meeting.calendarEventId);
  }

  const generated = await generateMeetingLink(
    provider,
    buildMeetingContext(appointment, offering, application, institute),
  );

  if (!generated) return null;

  appointment.meeting = {
    ...(appointment.meeting ?? {}),
    provider: generated.provider,
    link: generated.link,
    meetingId: generated.meetingId ?? undefined,
    calendarEventId: generated.calendarEventId ?? undefined,
    passcode: generated.passcode ?? undefined,
    status: MEETING_STATUS.GENERATED,
    generatedAt: new Date(),
    additionalRecipients: appointment.meeting?.additionalRecipients ?? [],
    hostStaffId: options.staffUserId ?? appointment.meeting?.hostStaffId,
    hostStaffEmail: options.staffEmail ?? appointment.meeting?.hostStaffEmail,
    hostStaffName: options.staffName ?? appointment.meeting?.hostStaffName,
    linkSentToStudent: false,
  };
  await appointment.save();
  await flushInstituteReadCache(instituteId);

  emitAppointmentUpdated(instituteId, appointment.offeringId.toString());
  emitAppointmentSlotsUpdated(instituteId, appointment.offeringId.toString());

  return appointment;
}

/**
 * Staff-only: email meeting link to staff-selected recipients.
 * Students never choose recipients — staff controls who receives the link.
 *
 * @param {string} instituteId
 * @param {string} appointmentId
 * @param {{ includeStudent?: boolean, additionalRecipients?: string[], confirmedByUserId?: string }} options
 */
export async function sendVirtualMeetingNotifications(appointmentId, instituteId, options = {}) {
  const context = await loadAppointmentContext(appointmentId, instituteId);
  if (!context) return;

  const { appointment, institute, offering, application } = context;
  if (appointment.visitMode !== VISIT_MODE.VIRTUAL || !appointment.meeting?.link) {
    throw new AppError('Generate a Google Meet link before sending', 400);
  }

  const instituteName = institute?.name ?? 'Your institute';
  const offeringName = offering?.name ?? 'Virtual appointment';

  const meetingPayload = {
    instituteName,
    offeringName,
    slotStart: appointment.slotStart,
    provider: appointment.meeting.provider,
    meetingLink: appointment.meeting.link,
    meetingId: appointment.meeting.meetingId,
    passcode: appointment.meeting.passcode,
  };

  const includeStudent = options.includeStudent === true;
  const extraRecipients = (options.additionalRecipients ?? appointment.meeting.additionalRecipients ?? [])
    .map((email) => String(email).trim().toLowerCase())
    .filter(Boolean);

  assertAdditionalRecipientsWithinLimit(offering, extraRecipients);

  if (!includeStudent && extraRecipients.length === 0) {
    throw new AppError('Select at least one recipient (student or additional email)', 400);
  }

  if (includeStudent) {
    await sendVirtualMeetingEmail({
      ...meetingPayload,
      recipientName: application?.applicantName ?? 'Student',
      recipientEmail: appointment.applicantEmail,
      role: 'student',
    });
    appointment.meeting.linkSentToStudent = true;
  }

  if (appointment.meeting.hostStaffEmail) {
    await sendVirtualMeetingEmail({
      ...meetingPayload,
      recipientName: appointment.meeting.hostStaffName ?? 'Staff member',
      recipientEmail: appointment.meeting.hostStaffEmail,
      role: 'host',
    });
  }

  for (const email of [...new Set(extraRecipients)]) {
    if (!email || email === appointment.applicantEmail) continue;
    await sendVirtualMeetingEmail({
      ...meetingPayload,
      recipientName: 'Invited participant',
      recipientEmail: email,
      role: 'participant',
    });
  }

  appointment.meeting.additionalRecipients = [...new Set(extraRecipients)];
  appointment.meeting.status = MEETING_STATUS.SENT;
  appointment.meeting.sentAt = new Date();
  if (options.confirmedByUserId) {
    appointment.meeting.confirmedAt = new Date();
    appointment.meeting.confirmedBy = options.confirmedByUserId;
    appointment.meeting.status = MEETING_STATUS.CONFIRMED;
  }
  await appointment.save();
  await flushInstituteReadCache(instituteId);
}

/**
 * Staff-only: save recipient list or manual link override.
 */
export async function updateVirtualMeetingDetails(instituteId, appointmentId, payload, staffUser = {}) {
  const context = await loadAppointmentContext(appointmentId, instituteId);
  if (!context) throw new AppError('Appointment not found', 404);

  const { appointment, offering } = context;
  if (appointment.visitMode !== VISIT_MODE.VIRTUAL) {
    throw new AppError('This is not a virtual appointment', 400);
  }

  const virtualConfig = offering?.appointmentConfig?.virtualAppointment ?? {};
  if (!virtualConfig.enabled) {
    throw new AppError('Virtual appointments are not enabled for this service', 400);
  }

  if (payload.link) {
    throw new AppError('Meeting links are created via Google Meet only. Use Generate Google Meet.', 400);
  }

  if (payload.provider === MEETING_PROVIDER.ZOOM) {
    throw new AppError('Zoom integration is coming soon', 501);
  }

  if (staffUser.userId) {
    appointment.meeting = {
      ...(appointment.meeting ?? {}),
      hostStaffId: staffUser.userId,
      hostStaffEmail: staffUser.email ?? appointment.meeting?.hostStaffEmail,
      hostStaffName: staffUser.name ?? appointment.meeting?.hostStaffName,
    };
  }

  if (payload.hostStaffId) {
    const staff = await User.findOne({ _id: payload.hostStaffId, instituteId }).select('email name');
    if (staff) {
      appointment.meeting = {
        ...(appointment.meeting ?? {}),
        hostStaffId: staff._id,
        hostStaffEmail: staff.email,
        hostStaffName: staff.name,
      };
    }
  }

  if (payload.additionalRecipients) {
    const emails = payload.additionalRecipients
      .map((item) => String(item).trim().toLowerCase())
      .filter(Boolean);
    assertAdditionalRecipientsWithinLimit(offering, emails);
    appointment.meeting = {
      ...(appointment.meeting ?? {}),
      additionalRecipients: [...new Set(emails)],
    };
  }

  await appointment.save();
  await flushInstituteReadCache(instituteId);
  emitAppointmentUpdated(instituteId, appointment.offeringId.toString());

  return formatAppointmentRecord(appointment);
}

/**
 * Staff-only: generate Google Meet link (does not email anyone).
 */
export async function generateVirtualMeetingLink(instituteId, appointmentId, staffUser = {}) {
  const context = await loadAppointmentContext(appointmentId, instituteId);
  if (!context) throw new AppError('Appointment not found', 404);

  if (context.appointment.visitMode !== VISIT_MODE.VIRTUAL) {
    throw new AppError('This is not a virtual appointment', 400);
  }

  const updated = await setupVirtualMeetingLink(appointmentId, instituteId, {
    provider: MEETING_PROVIDER.GOOGLE_MEET,
    staffUserId: staffUser.userId,
    staffEmail: staffUser.email,
    staffName: staffUser.name,
  });

  if (!updated) {
    throw new AppError('Could not generate Google Meet link', 502);
  }

  return formatAppointmentRecord(updated);
}

/**
 * Staff-only: send meeting link to chosen recipients (student and/or others).
 */
export async function sendVirtualMeetingLink(instituteId, appointmentId, staffUser = {}, payload = {}) {
  const context = await loadAppointmentContext(appointmentId, instituteId);
  if (!context) throw new AppError('Appointment not found', 404);

  const { appointment } = context;
  if (appointment.visitMode !== VISIT_MODE.VIRTUAL) {
    throw new AppError('This is not a virtual appointment', 400);
  }

  if (!appointment.meeting?.link) {
    await setupVirtualMeetingLink(appointmentId, instituteId, {
      provider: MEETING_PROVIDER.GOOGLE_MEET,
      staffUserId: staffUser.userId,
      staffEmail: staffUser.email,
      staffName: staffUser.name,
    });
  }

  if (payload.additionalRecipients?.length) {
    const emails = payload.additionalRecipients
      .map((item) => String(item).trim().toLowerCase())
      .filter(Boolean);
    assertAdditionalRecipientsWithinLimit(context.offering, emails);
    await Appointment.updateOne(
      { _id: appointmentId, instituteId },
      { $set: { 'meeting.additionalRecipients': [...new Set(emails)] } },
    );
  }

  await enqueueAppointmentLifecycle({
    action: 'meeting_send',
    appointmentId,
    instituteId,
    confirmedByUserId: staffUser.userId,
    includeStudent: payload.includeStudent === true,
    additionalRecipients: payload.additionalRecipients ?? [],
  });

  return formatAppointmentRecord(
    (await Appointment.findOne({ _id: appointmentId, instituteId })) ?? appointment,
  );
}

/** @deprecated Use sendVirtualMeetingLink */
export async function confirmVirtualAppointment(instituteId, appointmentId, staffUser = {}) {
  return sendVirtualMeetingLink(instituteId, appointmentId, staffUser, {
    includeStudent: true,
    additionalRecipients: [],
  });
}

/**
 * Staff-only: regenerate Google Meet link.
 */
export async function regenerateVirtualMeetingLink(instituteId, appointmentId, staffUser = {}) {
  const context = await loadAppointmentContext(appointmentId, instituteId);
  if (!context) throw new AppError('Appointment not found', 404);

  if (context.appointment.visitMode !== VISIT_MODE.VIRTUAL) {
    throw new AppError('This is not a virtual appointment', 400);
  }

  const updated = await setupVirtualMeetingLink(appointmentId, instituteId, {
    provider: MEETING_PROVIDER.GOOGLE_MEET,
    staffUserId: staffUser.userId,
    staffEmail: staffUser.email,
    staffName: staffUser.name,
  });

  if (!updated) {
    throw new AppError('Could not generate Google Meet link', 502);
  }

  return formatAppointmentRecord(updated);
}
