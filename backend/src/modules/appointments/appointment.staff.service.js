import { Appointment, APPOINTMENT_STATUS } from './appointment.model.js';
import { Application } from '../applications/application.model.js';
import { Offering } from '../offerings/offering.model.js';
import { AppError } from '../../core/utils/AppError.js';
import { QUEUE_MODE } from '../../shared/enums/offering.enums.js';
import { normalizeSlotStart } from '../../shared/helpers/appointmentSlots.helper.js';
import { createNotification } from '../notifications/notification.service.js';
import { buildStudentServiceLink } from '../../shared/helpers/applicationLinks.helper.js';
import {
  emitAppointmentSlotsUpdated,
  emitAppointmentUpdated,
} from '../../shared/helpers/realtime.helper.js';
import { flushInstituteReadCache } from '../../shared/helpers/cacheInvalidation.helper.js';
import { User } from '../users/user.model.js';
import { ROLES } from '../../shared/constants/roles.js';
import {
  listAvailableAppointmentSlots,
  rescheduleStudentAppointment as rescheduleStudentAppointmentFromService,
} from './appointment.service.js';
import {
  formatAppointmentRecord,
  enqueueAppointmentLifecycle,
  updateVirtualMeetingDetails,
  generateVirtualMeetingLink,
  sendVirtualMeetingLink,
  regenerateVirtualMeetingLink,
} from './appointment.operations.service.js';
import { unlockWorkflowPaymentAfterVisit } from '../payments/payment.service.js';
import { emitApplicationUpdated } from '../../shared/helpers/realtime.helper.js';

async function getStaffAppointment(instituteId, appointmentId) {
  const appointment = await Appointment.findOne({ _id: appointmentId, instituteId });
  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }
  return appointment;
}

async function notifyStudentAppointmentChange(appointment, title, body) {
  const application = await Application.findById(appointment.applicationId).select(
    'serviceId applicantEmail',
  );
  if (!application) return;

  const student = await User.findOne({
    instituteId: appointment.instituteId,
    email: application.applicantEmail,
    role: ROLES.STUDENT,
  }).select('_id');

  if (!student) return;

  await createNotification({
    instituteId: appointment.instituteId.toString(),
    userId: student._id.toString(),
    type: 'appointment',
    title,
    body,
    link: buildStudentServiceLink(application.serviceId.toString()),
    metadata: { appointmentId: appointment._id.toString() },
  });
}

export async function markAppointmentComplete(instituteId, appointmentId) {
  const appointment = await getStaffAppointment(instituteId, appointmentId);

  if (appointment.status !== APPOINTMENT_STATUS.BOOKED) {
    throw new AppError('Only booked appointments can be marked complete', 400);
  }

  appointment.status = APPOINTMENT_STATUS.COMPLETED;
  await appointment.save();

  const [application, offering] = await Promise.all([
    Application.findById(appointment.applicationId),
    Offering.findOne({ _id: appointment.offeringId, instituteId }),
  ]);

  let paymentUnlocked = false;
  if (application && offering) {
    const unlockResult = await unlockWorkflowPaymentAfterVisit(
      application,
      offering,
      instituteId,
    );
    paymentUnlocked = unlockResult.unlocked === true;

    if (paymentUnlocked) {
      const student = await User.findOne({
        instituteId,
        email: application.applicantEmail,
        role: ROLES.STUDENT,
      }).select('_id');

      emitApplicationUpdated({
        instituteId,
        applicationId: application._id.toString(),
        studentUserId: student?._id?.toString() ?? null,
        assigneeUserId: application.assignedTo?.toString() ?? null,
        summary: {
          status: application.status,
          serviceId: application.serviceId.toString(),
          offeringId: application.offeringId.toString(),
          updatedAt: application.updatedAt,
        },
      });
    }
  }

  await flushInstituteReadCache(instituteId);

  const feeLabel = offering?.paymentConfig?.label?.trim() || 'Admission fee';
  await notifyStudentAppointmentChange(
    appointment,
    paymentUnlocked ? 'Visit complete — fee payment due' : 'Visit completed',
    paymentUnlocked
      ? `Your appointment is complete. Please pay ${feeLabel} on your service page to continue.`
      : `Your appointment on ${appointment.slotStart.toLocaleString()} has been marked complete by staff.`,
  );

  const offeringId = appointment.offeringId.toString();
  emitAppointmentUpdated(instituteId, offeringId);
  emitAppointmentSlotsUpdated(instituteId, offeringId);

  return formatAppointmentRecord(appointment);
}

export async function markAppointmentNoShow(instituteId, appointmentId) {
  const appointment = await getStaffAppointment(instituteId, appointmentId);

  if (appointment.status !== APPOINTMENT_STATUS.BOOKED) {
    throw new AppError('Only booked appointments can be marked no-show', 400);
  }

  appointment.status = APPOINTMENT_STATUS.NO_SHOW;
  await appointment.save();
  await flushInstituteReadCache(instituteId);

  await notifyStudentAppointmentChange(
    appointment,
    'Appointment marked no-show',
    'Your scheduled visit was marked as a no-show. You may book a new slot.',
  );

  const offeringId = appointment.offeringId.toString();
  emitAppointmentUpdated(instituteId, offeringId);
  emitAppointmentSlotsUpdated(instituteId, offeringId);

  return formatAppointmentRecord(appointment);
}

export async function rescheduleAppointment(instituteId, appointmentId, slotStartIso) {
  const appointment = await getStaffAppointment(instituteId, appointmentId);

  if (appointment.status !== APPOINTMENT_STATUS.BOOKED) {
    throw new AppError('Only booked appointments can be rescheduled', 400);
  }

  const offering = await Offering.findOne({ _id: appointment.offeringId, instituteId });
  if (!offering) {
    throw new AppError('Offering not found', 404);
  }

  if (![QUEUE_MODE.APPOINTMENT_ONLY, QUEUE_MODE.HYBRID].includes(offering.queueMode)) {
    throw new AppError('This offering does not use appointments', 400);
  }

  const slotStart = normalizeSlotStart(new Date(slotStartIso));
  const { slots } = await listAvailableAppointmentSlots(instituteId, offering._id.toString(), 14, {
    rescheduleAppointmentId: appointment._id.toString(),
  });
  const selected = slots.find(
    (slot) => normalizeSlotStart(slot.slotStart).getTime() === slotStart.getTime(),
  );

  if (!selected) {
    throw new AppError('This appointment slot is no longer available', 409);
  }

  appointment.slotStart = slotStart;
  appointment.slotEnd = normalizeSlotStart(selected.slotEnd);
  await appointment.save();
  await flushInstituteReadCache(instituteId);

  await notifyStudentAppointmentChange(
    appointment,
    'Appointment rescheduled',
    `Your visit has been moved to ${slotStart.toLocaleString()}.`,
  );

  await enqueueAppointmentLifecycle({
    action: 'rescheduled',
    appointmentId: appointment._id.toString(),
    instituteId,
  }).catch(() => {});

  const offeringId = offering._id.toString();
  emitAppointmentUpdated(instituteId, offeringId);
  emitAppointmentSlotsUpdated(instituteId, offeringId);

  return formatAppointmentRecord(appointment);
}

export async function rescheduleStudentAppointment(instituteId, applicationId, user, slotStartIso) {
  return rescheduleStudentAppointmentFromService(instituteId, applicationId, user, slotStartIso);
}

export async function listStaffRescheduleSlots(instituteId, offeringId, rescheduleAppointmentId = null) {
  return listAvailableAppointmentSlots(instituteId, offeringId, 14, {
    rescheduleAppointmentId,
  });
}

export async function updateMeetingDetails(instituteId, appointmentId, payload, staffUser) {
  return updateVirtualMeetingDetails(instituteId, appointmentId, payload, staffUser);
}

export async function generateMeetingLinkForStaff(instituteId, appointmentId, staffUser) {
  return generateVirtualMeetingLink(instituteId, appointmentId, staffUser);
}

export async function sendMeetingLinkForStaff(instituteId, appointmentId, staffUser, payload) {
  return sendVirtualMeetingLink(instituteId, appointmentId, staffUser, payload);
}

export async function regenerateMeetingLink(instituteId, appointmentId, staffUser) {
  return regenerateVirtualMeetingLink(instituteId, appointmentId, staffUser);
}
