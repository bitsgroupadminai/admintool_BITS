import { Application } from '../applications/application.model.js';
import { Offering } from '../offerings/offering.model.js';
import { AppError } from '../../core/utils/AppError.js';
import { APPLICATION_STATUS } from '../../shared/enums/application.enums.js';
import { QUEUE_MODE, OFFERING_STATUS } from '../../shared/enums/offering.enums.js';
import { getDocumentUploadProgress } from '../../shared/helpers/applicationDocument.helper.js';
import {
  isVisitPlanningUnlocked,
  getVisitPlanningLockReason,
} from '../../shared/helpers/visitPlanning.helper.js';
import {
  buildOfferingDaySlots,
  mapBookingsToSlotCounts,
  normalizeSlotStart,
  findSlotWindowForStart,
} from '../../shared/helpers/appointmentSlots.helper.js';
import {
  getAppointmentHoursIssue,
  validateOperatingHoursWindow,
} from '../../shared/helpers/operatingHours.helper.js';
import { listUpcomingClosures } from '../../shared/helpers/calendarExceptions.helper.js';
import { APPOINTMENT_STATUS, Appointment } from './appointment.model.js';
import { createNotification } from '../notifications/notification.service.js';
import { buildStudentServiceLink } from '../../shared/helpers/applicationLinks.helper.js';
import {
  emitAppointmentSlotsUpdated,
  emitAppointmentUpdated,
} from '../../shared/helpers/realtime.helper.js';

import { cachedRead } from '../../shared/helpers/cachedRead.helper.js';
import { cacheNs } from '../../shared/constants/cacheKeys.js';
import { flushInstituteReadCache } from '../../shared/helpers/cacheInvalidation.helper.js';
import { readOperationsCalendar } from '../institutes/institute.settings.service.js';
import { isGoogleMeetConfigured } from '../../shared/helpers/meetingLink.helper.js';
import { VISIT_MODE, MEETING_STATUS, MEETING_PROVIDER } from '../../shared/enums/operations.enums.js';
import {
  formatAppointmentRecord,
  formatStudentAppointmentRecord,
  enqueueAppointmentLifecycle,
} from './appointment.operations.service.js';

async function getOfferingForAppointments(instituteId, offeringId) {
  const offering = await Offering.findOne({ _id: offeringId, instituteId });
  if (!offering) {
    throw new AppError('Offering not found', 404);
  }

  if (![QUEUE_MODE.APPOINTMENT_ONLY, QUEUE_MODE.HYBRID].includes(offering.queueMode)) {
    throw new AppError('This service option does not use appointments', 400);
  }

  return offering;
}

async function assertApplicationCanBook(application, offering) {
  const progress = getDocumentUploadProgress(offering, application);
  const applicationView = {
    status: application.status,
    documentsComplete: progress.documentsComplete,
  };

  if (!isVisitPlanningUnlocked(applicationView)) {
    throw new AppError(getVisitPlanningLockReason(applicationView), 400);
  }
}

/**
 * @param {string} instituteId
 * @param {string} offeringId
 * @param {number} [daysAhead]
 * @param {{ rescheduleAppointmentId?: string | null }} [options]
 */
export async function listAvailableAppointmentSlots(
  instituteId,
  offeringId,
  daysAhead = 14,
  options = {},
) {
  const { rescheduleAppointmentId = null } = options;
  const offering = await getOfferingForAppointments(instituteId, offeringId);
  const instituteCalendar = await readOperationsCalendar(instituteId);
  const horizon = offering.appointmentConfig?.bookingHorizonDays ?? daysAhead;
  const now = new Date();
  const rangeEnd = new Date(now);
  rangeEnd.setDate(rangeEnd.getDate() + horizon);
  rangeEnd.setHours(23, 59, 59, 999);

  const bookings = await Appointment.find({
    offeringId: offering._id,
    status: APPOINTMENT_STATUS.BOOKED,
    slotStart: { $gte: now, $lte: rangeEnd },
  }).select('_id slotStart');

  const { counts: bookedCounts, slotWindows } = mapBookingsToSlotCounts(
    offering,
    bookings,
    horizon,
    now,
    instituteCalendar,
  );

  let rescheduledBooking = null;
  if (rescheduleAppointmentId) {
    rescheduledBooking =
      bookings.find((booking) => booking._id.toString() === rescheduleAppointmentId) ?? null;
  }

  const slots = [];

  for (let offset = 0; offset < horizon; offset += 1) {
    const day = new Date(now);
    day.setDate(day.getDate() + offset);
    day.setHours(0, 0, 0, 0);

    const daySlots = buildOfferingDaySlots(offering, day, instituteCalendar);
    for (const slot of daySlots) {
      if (slot.slotStart <= now) continue;

      const key = normalizeSlotStart(slot.slotStart).toISOString();
      const bookedCount = bookedCounts.get(key) ?? 0;
      const remaining = slot.capacity - bookedCount;
      const holdsRescheduledAppointment =
        rescheduledBooking &&
        findSlotWindowForStart(rescheduledBooking.slotStart, slotWindows)?.key === key;

      if (remaining > 0 || holdsRescheduledAppointment) {
        slots.push({
          slotStart: slot.slotStart.toISOString(),
          slotEnd: slot.slotEnd.toISOString(),
          capacity: slot.capacity,
          bookedCount,
          remaining: Math.max(remaining, 0),
        });
      }
    }
  }

  const hoursIssue = getAppointmentHoursIssue(offering.appointmentConfig);
  const hours = validateOperatingHoursWindow(
    offering.appointmentConfig?.operatingHoursStart,
    offering.appointmentConfig?.operatingHoursEnd,
  );

  return {
    slots,
    config: {
      slotDurationMinutes: offering.appointmentConfig?.slotDurationMinutes ?? 30,
      slotCapacity: offering.appointmentConfig?.slotCapacity ?? 3,
      operatingHoursStart: hours.start ?? offering.appointmentConfig?.operatingHoursStart ?? '09:00',
      operatingHoursEnd: hours.end ?? offering.appointmentConfig?.operatingHoursEnd ?? '17:00',
      operatingDays: offering.appointmentConfig?.operatingDays ?? instituteCalendar.defaultOperatingDays ?? [1, 2, 3, 4, 5],
      bookingHorizonDays: horizon,
      hoursValid: !hoursIssue,
      hoursIssue,
      virtualAppointment: offering.appointmentConfig?.virtualAppointment ?? { enabled: false },
      googleMeetConfigured: isGoogleMeetConfigured(),
    },
    closures: listUpcomingClosures(instituteCalendar, now, horizon),
  };
}

/**
 * @param {string} instituteId
 * @param {string} applicationId
 * @param {{ email: string, userId?: string }} user
 * @param {string} slotStartIso
 * @param {{ visitMode?: string }} [options]
 */
export async function bookAppointment(instituteId, applicationId, user, slotStartIso, options = {}) {
  const application = await Application.findOne({
    _id: applicationId,
    instituteId,
    applicantEmail: user.email.toLowerCase(),
  });

  if (!application) {
    throw new AppError('Application not found', 404);
  }

  const offering = await Offering.findOne({ _id: application.offeringId, instituteId });
  if (!offering || ![QUEUE_MODE.APPOINTMENT_ONLY, QUEUE_MODE.HYBRID].includes(offering.queueMode)) {
    throw new AppError('This service option does not use appointments', 400);
  }

  await assertApplicationCanBook(application, offering);

  const slotStart = normalizeSlotStart(slotStartIso);
  if (Number.isNaN(slotStart.getTime()) || slotStart <= new Date()) {
    throw new AppError('Choose a valid future appointment slot', 400);
  }

  const { slots } = await listAvailableAppointmentSlots(instituteId, offering._id.toString());
  const selected = slots.find(
    (slot) => normalizeSlotStart(slot.slotStart).getTime() === slotStart.getTime(),
  );

  if (!selected) {
    throw new AppError('This appointment slot is no longer available', 409);
  }

  const existingBooked = await Appointment.findOne({
    applicationId: application._id,
    status: APPOINTMENT_STATUS.BOOKED,
    slotStart: { $gte: new Date() },
  });

  if (existingBooked) {
    throw new AppError('You already have a booked appointment for this request', 400);
  }

  const completedVisit = await Appointment.findOne({
    applicationId: application._id,
    status: APPOINTMENT_STATUS.COMPLETED,
  });

  if (completedVisit) {
    throw new AppError('Your visit for this request is already complete', 400);
  }

  const slotEnd = normalizeSlotStart(selected.slotEnd);
  const virtualConfig = offering.appointmentConfig?.virtualAppointment ?? {};
  const visitMode = options.visitMode === VISIT_MODE.VIRTUAL ? VISIT_MODE.VIRTUAL : VISIT_MODE.IN_PERSON;

  if (visitMode === VISIT_MODE.VIRTUAL && !virtualConfig.enabled) {
    throw new AppError('Virtual appointments are not available for this service', 400);
  }

  const appointment = await Appointment.create({
    instituteId,
    offeringId: offering._id,
    applicationId: application._id,
    applicantEmail: application.applicantEmail,
    slotStart,
    slotEnd,
    status: APPOINTMENT_STATUS.BOOKED,
    visitMode,
    meeting:
      visitMode === VISIT_MODE.VIRTUAL
        ? {
            provider: MEETING_PROVIDER.GOOGLE_MEET,
            status: MEETING_STATUS.PENDING,
            additionalRecipients: [],
            linkSentToStudent: false,
          }
        : undefined,
  });

  if (user.userId) {
    await createNotification({
      instituteId,
      userId: user.userId,
      type: 'appointment',
      title: visitMode === VISIT_MODE.VIRTUAL ? 'Virtual appointment booked' : 'Appointment booked',
      body:
        visitMode === VISIT_MODE.VIRTUAL
          ? `Your online visit is scheduled for ${slotStart.toLocaleString()}. Staff will share the Google Meet link with you.`
          : `Your visit is scheduled for ${slotStart.toLocaleString()}`,
      link: buildStudentServiceLink(application.serviceId),
      metadata: { appointmentId: appointment._id.toString(), visitMode },
    });
  }

  const offeringId = offering._id.toString();
  emitAppointmentSlotsUpdated(instituteId, offeringId);
  emitAppointmentUpdated(instituteId, offeringId);

  await enqueueAppointmentLifecycle({
    action: 'booked',
    appointmentId: appointment._id.toString(),
    instituteId,
  }).catch(() => {});

  await flushInstituteReadCache(instituteId);
  return formatStudentAppointmentRecord(appointment);
}

/**
 * @param {import('../applications/application.model.js').Application} application
 * @param {import('../offerings/offering.model.js').Offering} offering
 */
export async function getVisitPlanningForStudent(application, offering) {
  const usesAppointment = [QUEUE_MODE.APPOINTMENT_ONLY, QUEUE_MODE.HYBRID].includes(
    offering?.queueMode,
  );

  if (!usesAppointment) {
    return { usesAppointment: false, state: 'not_applicable', appointment: null };
  }

  const appointment = await Appointment.findOne({
    applicationId: application._id,
    status: {
      $in: [
        APPOINTMENT_STATUS.BOOKED,
        APPOINTMENT_STATUS.COMPLETED,
        APPOINTMENT_STATUS.NO_SHOW,
      ],
    },
  }).sort({ slotStart: -1 });

  let state = 'pending_booking';
  if (appointment?.status === APPOINTMENT_STATUS.COMPLETED) state = 'completed';
  else if (appointment?.status === APPOINTMENT_STATUS.NO_SHOW) state = 'no_show';
  else if (appointment?.status === APPOINTMENT_STATUS.BOOKED) state = 'booked';

  return {
    usesAppointment: true,
    state,
    appointment: appointment ? formatStudentAppointmentRecord(appointment) : null,
  };
}

/**
 * @param {string} instituteId
 * @param {string} applicationId
 * @param {string} userEmail
 */
export async function getStudentAppointment(instituteId, applicationId, userEmail) {
  const application = await Application.findOne({
    _id: applicationId,
    instituteId,
    applicantEmail: userEmail.toLowerCase(),
  });

  if (!application) {
    throw new AppError('Application not found', 404);
  }

  const offering = await Offering.findOne({ _id: application.offeringId, instituteId }).select(
    'queueMode appointmentConfig',
  );
  if (!offering) {
    throw new AppError('Offering not found', 404);
  }

  const planning = await getVisitPlanningForStudent(application, offering);
  return planning.appointment;
}

/**
 * @param {string} instituteId
 * @param {string} offeringId
 */
export async function listOfferingAppointments(instituteId, offeringId) {
  return cachedRead(cacheNs.APPOINTMENT_OFFERING_LIST, [instituteId, offeringId], async () => {
  await getOfferingForAppointments(instituteId, offeringId);

  const appointments = await Appointment.find({
    instituteId,
    offeringId,
    status: APPOINTMENT_STATUS.BOOKED,
    slotStart: { $gte: new Date() },
  }).sort({ slotStart: 1 });

  const applicationIds = appointments.map((item) => item.applicationId);
  const applications = applicationIds.length
    ? await Application.find({ _id: { $in: applicationIds } }).select('applicantName applicantEmail')
    : [];
  const applicationMap = new Map(
    applications.map((item) => [item._id.toString(), item]),
  );

  return appointments.map((appointment) => {
    const application = applicationMap.get(appointment.applicationId.toString());
    return {
      ...formatAppointmentRecord(appointment),
      applicantName: application?.applicantName ?? '',
      applicantEmail: application?.applicantEmail ?? appointment.applicantEmail,
    };
  });
  });
}

export async function listAppointmentOfferings(instituteId) {
  return cachedRead(cacheNs.APPOINTMENT_OFFERINGS, [instituteId], async () => {
  const offerings = await Offering.find({
    instituteId,
    queueMode: { $in: [QUEUE_MODE.APPOINTMENT_ONLY, QUEUE_MODE.HYBRID] },
    status: { $nin: [OFFERING_STATUS.DISABLED, OFFERING_STATUS.ARCHIVED, OFFERING_STATUS.EXPIRED] },
  })
    .populate('serviceId', 'name')
    .sort({ name: 1 });

  return offerings.map((offering) => ({
    id: offering._id.toString(),
    name: offering.name,
    serviceId: offering.serviceId._id.toString(),
    serviceName: offering.serviceId.name,
    queueMode: offering.queueMode,
    virtualAppointment: offering.appointmentConfig?.virtualAppointment ?? { enabled: false },
  }));
  });
}

export async function cancelStudentAppointment(instituteId, applicationId, user) {
  const application = await Application.findOne({
    _id: applicationId,
    instituteId,
    applicantEmail: user.email.toLowerCase(),
  });

  if (!application) {
    throw new AppError('Application not found', 404);
  }

  const appointment = await Appointment.findOne({
    applicationId: application._id,
    status: APPOINTMENT_STATUS.BOOKED,
    slotStart: { $gte: new Date() },
  }).sort({ slotStart: 1 });

  if (!appointment) {
    throw new AppError('No upcoming appointment found to cancel', 404);
  }

  appointment.status = APPOINTMENT_STATUS.CANCELLED;
  await appointment.save();

  if (user.userId) {
    await createNotification({
      instituteId,
      userId: user.userId,
      type: 'appointment',
      title: 'Appointment cancelled',
      body: 'Your visit appointment was cancelled. You can book a new slot when ready.',
      link: buildStudentServiceLink(application.serviceId),
      metadata: { appointmentId: appointment._id.toString() },
    });
  }

  const offeringId = application.offeringId.toString();
  emitAppointmentSlotsUpdated(instituteId, offeringId);
  emitAppointmentUpdated(instituteId, offeringId);

  await enqueueAppointmentLifecycle({
    action: 'cancelled',
    appointmentId: appointment._id.toString(),
    instituteId,
  }).catch(() => {});

  await flushInstituteReadCache(instituteId);
  return formatStudentAppointmentRecord(appointment);
}

export async function rescheduleStudentAppointment(instituteId, applicationId, user, slotStartIso) {
  const application = await Application.findOne({
    _id: applicationId,
    instituteId,
    applicantEmail: user.email.toLowerCase(),
  });

  if (!application) {
    throw new AppError('Application not found', 404);
  }

  const appointment = await Appointment.findOne({
    applicationId: application._id,
    status: APPOINTMENT_STATUS.BOOKED,
    slotStart: { $gte: new Date() },
  }).sort({ slotStart: 1 });

  if (!appointment) {
    throw new AppError('No upcoming appointment found to reschedule', 404);
  }

  const offering = await Offering.findOne({ _id: application.offeringId, instituteId });
  if (!offering) {
    throw new AppError('Offering not found', 404);
  }

  const slotStart = normalizeSlotStart(slotStartIso);
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

  if (user.userId) {
    await createNotification({
      instituteId,
      userId: user.userId,
      type: 'appointment',
      title: 'Appointment rescheduled',
      body: `Your visit is now scheduled for ${slotStart.toLocaleString()}.`,
      link: buildStudentServiceLink(application.serviceId),
      metadata: { appointmentId: appointment._id.toString() },
    });
  }

  const offeringId = offering._id.toString();
  emitAppointmentSlotsUpdated(instituteId, offeringId);
  emitAppointmentUpdated(instituteId, offeringId);

  await enqueueAppointmentLifecycle({
    action: 'rescheduled',
    appointmentId: appointment._id.toString(),
    instituteId,
  }).catch(() => {});

  await flushInstituteReadCache(instituteId);
  return formatStudentAppointmentRecord(appointment);
}
