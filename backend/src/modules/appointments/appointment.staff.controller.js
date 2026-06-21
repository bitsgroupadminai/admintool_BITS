import { z } from 'zod';
import * as staffAppointmentService from './appointment.staff.service.js';
import { sendSuccess } from '../../core/utils/apiResponse.js';

const rescheduleSchema = z.object({
  slotStart: z.string().min(1),
});

const meetingSchema = z.object({
  additionalRecipients: z.array(z.string().email()).max(500).optional(),
  hostStaffId: z.string().optional(),
});

const sendMeetingSchema = z.object({
  includeStudent: z.boolean().optional(),
  additionalRecipients: z.array(z.string().email()).max(500).optional(),
});

export async function markComplete(req, res, next) {
  try {
    const appointment = await staffAppointmentService.markAppointmentComplete(
      req.user.instituteId,
      req.params.appointmentId,
    );
    sendSuccess(res, 200, 'Appointment marked complete', { appointment });
  } catch (err) {
    next(err);
  }
}

export async function markNoShow(req, res, next) {
  try {
    const appointment = await staffAppointmentService.markAppointmentNoShow(
      req.user.instituteId,
      req.params.appointmentId,
    );
    sendSuccess(res, 200, 'Appointment marked no-show', { appointment });
  } catch (err) {
    next(err);
  }
}

export async function reschedule(req, res, next) {
  try {
    const payload = rescheduleSchema.parse(req.body);
    const appointment = await staffAppointmentService.rescheduleAppointment(
      req.user.instituteId,
      req.params.appointmentId,
      payload.slotStart,
    );
    sendSuccess(res, 200, 'Appointment rescheduled', { appointment });
  } catch (err) {
    next(err);
  }
}

export async function studentReschedule(req, res, next) {
  try {
    const payload = rescheduleSchema.parse(req.body);
    const appointment = await staffAppointmentService.rescheduleStudentAppointment(
      req.user.instituteId,
      req.params.applicationId,
      req.user,
      payload.slotStart,
    );
    sendSuccess(res, 200, 'Appointment rescheduled', { appointment });
  } catch (err) {
    next(err);
  }
}

export async function listSlots(req, res, next) {
  try {
    const result = await staffAppointmentService.listStaffRescheduleSlots(
      req.user.instituteId,
      req.params.offeringId,
      req.query.appointmentId ?? null,
    );
    sendSuccess(res, 200, 'Available slots', result);
  } catch (err) {
    next(err);
  }
}

export async function updateMeeting(req, res, next) {
  try {
    const payload = meetingSchema.parse(req.body);
    const appointment = await staffAppointmentService.updateMeetingDetails(
      req.user.instituteId,
      req.params.appointmentId,
      payload,
      req.user,
    );
    sendSuccess(res, 200, 'Meeting recipients saved', { appointment });
  } catch (err) {
    next(err);
  }
}

export async function generateMeeting(req, res, next) {
  try {
    const appointment = await staffAppointmentService.generateMeetingLinkForStaff(
      req.user.instituteId,
      req.params.appointmentId,
      req.user,
    );
    sendSuccess(res, 200, 'Google Meet link generated', { appointment });
  } catch (err) {
    next(err);
  }
}

export async function sendMeetingLink(req, res, next) {
  try {
    const payload = sendMeetingSchema.parse(req.body ?? {});
    const appointment = await staffAppointmentService.sendMeetingLinkForStaff(
      req.user.instituteId,
      req.params.appointmentId,
      req.user,
      payload,
    );
    sendSuccess(res, 200, 'Meeting link emails queued', { appointment });
  } catch (err) {
    next(err);
  }
}

/** @deprecated Use sendMeetingLink */
export async function confirmVirtual(req, res, next) {
  try {
    const appointment = await staffAppointmentService.sendMeetingLinkForStaff(
      req.user.instituteId,
      req.params.appointmentId,
      req.user,
      { includeStudent: true, additionalRecipients: [] },
    );
    sendSuccess(res, 200, 'Meeting link emails queued', { appointment });
  } catch (err) {
    next(err);
  }
}

/** @deprecated Use generateMeeting */
export async function regenerateMeeting(req, res, next) {
  try {
    const appointment = await staffAppointmentService.regenerateMeetingLink(
      req.user.instituteId,
      req.params.appointmentId,
      req.user,
    );
    sendSuccess(res, 200, 'Google Meet link regenerated', { appointment });
  } catch (err) {
    next(err);
  }
}
