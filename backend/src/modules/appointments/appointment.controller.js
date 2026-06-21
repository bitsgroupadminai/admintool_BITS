import * as appointmentService from './appointment.service.js';
import { sendSuccess } from '../../core/utils/apiResponse.js';
import { z } from 'zod';
import { Appointment, APPOINTMENT_STATUS } from './appointment.model.js';
import { Application } from '../applications/application.model.js';
import { Offering } from '../offerings/offering.model.js';

const bookSchema = z.object({
  slotStart: z.string().min(1),
  visitMode: z.enum(['in_person', 'virtual']).optional(),
});

export async function listSlots(req, res, next) {
  try {
    let rescheduleAppointmentId = req.query.appointmentId ?? null;
    const applicationId = req.query.applicationId ?? null;

    if (applicationId) {
      const application = await Application.findOne({
        _id: applicationId,
        instituteId: req.user.instituteId,
        applicantEmail: req.user.email.toLowerCase(),
      });

      if (application) {
        const offering = await Offering.findOne({
          _id: application.offeringId,
          instituteId: req.user.instituteId,
        }).select('queueMode appointmentConfig');

        if (offering) {
          const planning = await appointmentService.getVisitPlanningForStudent(
            application,
            offering,
          );

          if (planning.state === 'completed') {
            return sendSuccess(res, 200, 'Visit already completed', {
              slots: [],
              closures: [],
              visitState: 'completed',
              config: {
                slotDurationMinutes: offering.appointmentConfig?.slotDurationMinutes ?? 30,
                slotCapacity: offering.appointmentConfig?.slotCapacity ?? 3,
                operatingHoursStart:
                  offering.appointmentConfig?.operatingHoursStart ?? '09:00',
                operatingHoursEnd: offering.appointmentConfig?.operatingHoursEnd ?? '17:00',
                virtualAppointment: offering.appointmentConfig?.virtualAppointment ?? {
                  enabled: false,
                },
                hoursValid: true,
                hoursIssue: null,
              },
            });
          }
        }
      }
    }

    if (!rescheduleAppointmentId && applicationId) {
      const appointment = await Appointment.findOne({
        applicationId,
        instituteId: req.user.instituteId,
        status: APPOINTMENT_STATUS.BOOKED,
        slotStart: { $gte: new Date() },
      }).select('_id');
      rescheduleAppointmentId = appointment?._id?.toString() ?? null;
    }

    const result = await appointmentService.listAvailableAppointmentSlots(
      req.user.instituteId,
      req.params.offeringId,
      14,
      { rescheduleAppointmentId },
    );
    sendSuccess(res, 200, 'Available appointment slots', result);
  } catch (err) {
    next(err);
  }
}

export async function book(req, res, next) {
  try {
    const payload = bookSchema.parse(req.body);
    const appointment = await appointmentService.bookAppointment(
      req.user.instituteId,
      req.params.applicationId,
      req.user,
      payload.slotStart,
      {
        visitMode: payload.visitMode,
      },
    );
    sendSuccess(res, 200, 'Appointment booked', { appointment });
  } catch (err) {
    next(err);
  }
}

export async function getCurrent(req, res, next) {
  try {
    const appointment = await appointmentService.getStudentAppointment(
      req.user.instituteId,
      req.params.applicationId,
      req.user.email,
    );
    sendSuccess(res, 200, 'Current appointment', { appointment });
  } catch (err) {
    next(err);
  }
}

export async function listOfferingAppointments(req, res, next) {
  try {
    const appointments = await appointmentService.listOfferingAppointments(
      req.user.instituteId,
      req.params.offeringId,
    );
    sendSuccess(res, 200, 'Upcoming appointments', { appointments });
  } catch (err) {
    next(err);
  }
}

export async function listOfferings(req, res, next) {
  try {
    const offerings = await appointmentService.listAppointmentOfferings(req.user.instituteId);
    sendSuccess(res, 200, 'Appointment services', { offerings });
  } catch (err) {
    next(err);
  }
}

export async function cancel(req, res, next) {
  try {
    const appointment = await appointmentService.cancelStudentAppointment(
      req.user.instituteId,
      req.params.applicationId,
      req.user,
    );
    sendSuccess(res, 200, 'Appointment cancelled', { appointment });
  } catch (err) {
    next(err);
  }
}
