import { useCallback, useEffect, useState } from 'react';

import { CalendarDays, Clock3, Ticket, Timer, MapPin } from 'lucide-react';

import { toast } from 'sonner';

import { appointmentsApi, queueApi } from '@/api/operations.api';

import { useSocket, useSocketEvent } from '@/contexts/SocketContext';

import { WS_EVENTS } from '@/lib/socket';

import {

  formatOperatingHoursRange,

  getAppointmentEmptyMessage,

} from '@/utils/operatingHours';

import { AppointmentSlotPicker } from './AppointmentSlotPicker';
import { PaymentPanel } from './PaymentPanel';



function isVisitPlanningUnlocked(application) {

  if (!application?.id) return false;

  if (!['submitted', 'in_review', 'admitted'].includes(application.status)) return false;

  if (application.status === 'admitted') return true;

  if (application.documentsComplete === false) return false;

  return true;

}



function getLockMessage(application) {

  if (!application) return 'Start and submit your request before booking a visit.';

  if (application.status === 'draft') {

    return 'Submit your request after uploading all required documents.';

  }

  if (application.status === 'needs_correction') {

    return 'Update the requested documents and resubmit before booking a visit.';

  }

  if (application.status === 'rejected') {

    return 'Visit booking is not available for rejected requests.';

  }

  if (application.status === 'admitted') {

    return null;

  }

  if (application.documentsComplete === false) {

    return 'Upload all required documents before booking a visit.';

  }

  return null;

}



function statusLabel(status) {

  return (status ?? '').replace(/_/g, ' ');

}

function getWorkflowNextStep(application, offering) {
  const current = application?.workflow?.currentStep;
  if (current) {
    const isFeeStep =
      offering?.paymentConfig?.enabled &&
      offering?.paymentConfig?.timing === 'workflow_step' &&
      offering?.paymentConfig?.workflowStepId === current.stepId;

    return {
      title: current.name,
      description: isFeeStep
        ? 'Your visit is complete. Pay the fee below to continue your admission.'
        : current.handledBy?.type === 'student'
          ? 'This step needs your action on this page.'
          : 'The institute is working on this step now.',
      isFeeStep,
    };
  }

  const steps = application?.workflow?.steps ?? [];
  const currentStep = steps.find((step) => step.state === 'current');
  if (currentStep) {
    return {
      title: currentStep.name,
      description: 'The institute is working on this step now.',
      isFeeStep: false,
    };
  }

  const upcoming = steps.find((step) => step.state === 'upcoming');
  if (upcoming) {
    return {
      title: upcoming.name,
      description: 'Your visit is done. The institute will move your request to the next step.',
      isFeeStep: false,
    };
  }

  return {
    title: 'Institute review continues',
    description: 'Your visit is complete. Check back here for status updates on your request.',
    isFeeStep: false,
  };
}

function isVisitCompletedState(application, appointment) {
  return (
    application?.visitPlanning?.state === 'completed' ||
    appointment?.status === 'completed'
  );
}



export function QueueAppointmentPanel({ serviceId, offering, application, onRefresh }) {

  const { subscribeOffering } = useSocket();

  const [queueTicket, setQueueTicket] = useState(null);

  const [appointment, setAppointment] = useState(
    () => application?.visitPlanning?.appointment ?? null,
  );

  const [slots, setSlots] = useState([]);

  const [closures, setClosures] = useState([]);

  const [slotConfig, setSlotConfig] = useState(null);

  const [loading, setLoading] = useState(false);

  const [loadingSlots, setLoadingSlots] = useState(false);

  const [appointmentMode, setAppointmentMode] = useState('view');
  const [visitMode, setVisitMode] = useState('in_person');

  const usesQueue = ['queue_only', 'hybrid'].includes(offering?.queueMode);
  const usesAppointment = ['appointment_only', 'hybrid'].includes(offering?.queueMode);
  const virtualEnabled = slotConfig?.virtualAppointment?.enabled === true;

  const unlocked = isVisitPlanningUnlocked(application);
  const visitCompleted = isVisitCompletedState(application, appointment);
  const workflowNext = getWorkflowNextStep(application, offering);
  const showPaymentAfterVisit =
    visitCompleted &&
    (application?.payment?.required ||
      workflowNext.isFeeStep ||
      (offering?.paymentConfig?.enabled && offering?.paymentConfig?.timing === 'workflow_step'));



  useEffect(() => {
    if (application?.visitPlanning?.state === 'completed') {
      if (application.visitPlanning?.appointment) {
        setAppointment(application.visitPlanning.appointment);
      } else {
        setAppointment((current) => current?.status === 'completed' ? current : { status: 'completed' });
      }
      return;
    }

    if (application?.visitPlanning?.appointment) {
      setAppointment(application.visitPlanning.appointment);
    }
  }, [
    application?.visitPlanning?.appointment,
    application?.visitPlanning?.state,
  ]);



  const visitPlanningState = application?.visitPlanning?.state;

  const refreshSlots = useCallback(async () => {

    if (!application?.id || !offering?.id || !usesAppointment) return;

    if (visitPlanningState === 'completed') {
      setSlots([]);
      setClosures([]);
      return;
    }

    try {

      const [currentRes, slotsRes] = await Promise.all([

        appointmentsApi.current(application.id),

        appointmentsApi.listSlots(offering.id, application.id),

      ]);

      setAppointment(currentRes.data.data.appointment);

      if (slotsRes.data.data.visitState === 'completed') {
        setSlots([]);
        setClosures([]);
      } else {
        setSlots(slotsRes.data.data.slots ?? []);
        setClosures(slotsRes.data.data.closures ?? []);
      }

      setSlotConfig(slotsRes.data.data.config ?? null);

    } catch {

      // Keep current state on transient errors.

    }

  }, [application?.id, offering?.id, usesAppointment, visitPlanningState]);



  useEffect(() => {

    if (!offering?.id) return undefined;

    return subscribeOffering(offering.id);

  }, [offering?.id, subscribeOffering]);



  useSocketEvent(

    WS_EVENTS.QUEUE_TICKET,

    ({ offeringId, ticket }) => {

      if (offeringId !== offering?.id) return;

      setQueueTicket(ticket);

    },

    [offering?.id],

  );



  useSocketEvent(

    WS_EVENTS.APPOINTMENT_SLOTS_UPDATED,

    ({ offeringId }) => {

      if (offeringId === offering?.id) refreshSlots();

    },

    [offering?.id, refreshSlots],

  );



  useSocketEvent(

    WS_EVENTS.APPOINTMENT_UPDATED,

    ({ offeringId }) => {

      if (offeringId !== offering?.id) return;
      if (visitPlanningState === 'completed') return;
      refreshSlots();

    },

    [offering?.id, refreshSlots, visitPlanningState],

  );



  useEffect(() => {

    if (!application?.id || !unlocked) {

      setQueueTicket(null);

      setAppointment(null);

      setSlots([]);

      return;

    }

    if (visitPlanningState === 'completed') {
      setSlots([]);
      setClosures([]);
      setLoadingSlots(false);
      return;
    }



    if (usesQueue) {

      queueApi

        .status(application.id)

        .then(({ data }) => setQueueTicket(data.data.ticket))

        .catch(() => setQueueTicket(null));

    }



    if (usesAppointment) {

      setLoadingSlots(true);

      Promise.all([

        appointmentsApi.current(application.id),

        appointmentsApi.listSlots(offering.id, application.id),

      ])

        .then(([currentRes, slotsRes]) => {

          setAppointment(currentRes.data.data.appointment);

          if (slotsRes.data.data.visitState === 'completed') {
            setSlots([]);
            setClosures([]);
          } else {
            setSlots(slotsRes.data.data.slots ?? []);
            setClosures(slotsRes.data.data.closures ?? []);
          }

          setSlotConfig(slotsRes.data.data.config ?? null);

        })

        .catch((err) => {

          setSlots([]);

          toast.error(err.message || 'Could not load appointment slots');

        })

        .finally(() => setLoadingSlots(false));

    }

  }, [
    application?.id,
    application?.status,
    application?.documentsComplete,
    visitPlanningState,
    offering?.id,
    unlocked,
    usesQueue,
    usesAppointment,
  ]);



  if (!usesQueue && !usesAppointment) return null;



  const lockMessage = getLockMessage(application);



  const handleJoinQueue = async () => {

    setLoading(true);

    try {

      const { data } = await queueApi.join(application.id);

      setQueueTicket(data.data.ticket);

      toast.success('You joined the queue');

      await onRefresh?.();

    } catch (err) {

      toast.error(err.message || 'Could not join queue');

    } finally {

      setLoading(false);

    }

  };



  const handleLeaveQueue = async () => {

    setLoading(true);

    try {

      await queueApi.cancel(application.id);

      setQueueTicket(null);

      toast.success('You left the queue');

      await onRefresh?.();

    } catch (err) {

      toast.error(err.message || 'Could not leave queue');

    } finally {

      setLoading(false);

    }

  };



  const handleBook = async (slotStart) => {
    setLoading(true);
    try {
      const { data } = await appointmentsApi.book(application.id, slotStart, {
        visitMode: virtualEnabled ? visitMode : 'in_person',
      });
      setAppointment(data.data.appointment);
      setAppointmentMode('view');
      toast.success(
        visitMode === 'virtual' ? 'Virtual appointment booked' : 'Appointment booked',
      );
      await refreshSlots();
      await onRefresh?.();
    } catch (err) {
      const message = err.message || 'Could not book appointment';
      if (message.toLowerCase().includes('already complete')) {
        await refreshSlots();
        await onRefresh?.();
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };



  const handleReschedule = async (slotStart) => {

    setLoading(true);

    try {

      const { data } = await appointmentsApi.reschedule(application.id, slotStart);

      setAppointment(data.data.appointment);

      setAppointmentMode('view');

      toast.success('Appointment rescheduled');

      await refreshSlots();

      await onRefresh?.();

    } catch (err) {

      toast.error(err.message || 'Could not reschedule appointment');

    } finally {

      setLoading(false);

    }

  };



  return (

    <div className="rounded-2xl border border-[#E2EEE8] bg-white p-5 shadow-sm">

      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#10B981]">

        Visit planning

      </p>

      <h3 className="mt-1 text-lg font-bold text-[#052E1C]">Queue or appointment</h3>

      <p className="mt-1 text-sm text-[#4B6358]">

        After your documents are submitted, join the walk-in queue or book a scheduled visit.

        Live wait estimates update as the queue moves.

      </p>



      {offering?.visitLocation ? (

        <p className="mt-3 rounded-xl border border-[#E2EEE8] bg-[#F9FCFB] px-4 py-3 text-sm text-[#052E1C]">

          <span className="inline-flex items-center gap-1.5 font-semibold text-[#0A6640]">

            <MapPin className="h-3.5 w-3.5" />

            Visit location

          </span>

          <span className="mt-1 block">{offering.visitLocation}</span>

          {offering.visitInstructions ? (

            <span className="mt-1 block text-[#4B6358]">{offering.visitInstructions}</span>

          ) : null}

        </p>

      ) : null}



      {!unlocked ? (

        <p className="mt-4 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-sm text-[#92400E]">

          {lockMessage}

        </p>

      ) : null}



      {unlocked && usesQueue && !visitCompleted ? (

        <div className="mt-4 rounded-xl border border-[#C4E8D4] bg-[#F0FAF5] p-4">

          <div className="flex items-center gap-2">

            <Ticket className="h-4 w-4 text-[#0A6640]" />

            <p className="text-sm font-semibold text-[#052E1C]">Walk-in queue</p>

          </div>

          {queueTicket && ['waiting', 'called', 'serving'].includes(queueTicket.status) ? (

            <div className="mt-3 space-y-2">

              <p className="text-sm font-medium text-[#052E1C]">

                Ticket #{queueTicket.ticketNumber}

                {' · '}

                <span className="capitalize">{statusLabel(queueTicket.status)}</span>
              </p>
              {queueTicket.priority && queueTicket.priority !== 'normal' ? (
                <span className="inline-flex rounded-full bg-[#FEF3C7] px-2.5 py-0.5 text-xs font-bold text-[#92400E]">
                  {queueTicket.priorityLabel ?? queueTicket.priority} priority
                </span>
              ) : null}
              {queueTicket.priorityReason && queueTicket.priority !== 'normal' ? (
                <p className="text-xs text-[#4B6358]">{queueTicket.priorityReason}</p>
              ) : null}
              {queueTicket.position ? (

                <p className="inline-flex items-center gap-1.5 text-sm text-[#4B6358]">

                  Position {queueTicket.position} in line

                </p>

              ) : null}

              {queueTicket.estimatedWaitLabel && queueTicket.status === 'waiting' ? (

                <p className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-[#0A6640]">

                  <Timer className="h-4 w-4" />

                  {queueTicket.estimatedWaitLabel}

                </p>

              ) : null}

              {queueTicket.counterLabel ? (

                <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0A6640]">

                  <MapPin className="h-4 w-4" />

                  Go to {queueTicket.counterLabel}

                </p>

              ) : null}

              {queueTicket.status === 'waiting' ? (

                <button

                  type="button"

                  disabled={loading}

                  onClick={handleLeaveQueue}

                  className="mt-2 rounded-xl border border-[#FECACA] bg-white px-4 py-2 text-sm font-semibold text-[#B91C1C] hover:bg-[#FEF2F2] disabled:opacity-60"

                >

                  Leave queue

                </button>

              ) : null}

            </div>

          ) : (

            <button

              type="button"

              disabled={loading}

              onClick={handleJoinQueue}

              className="mt-3 rounded-xl bg-[#0A6640] px-4 py-2 text-sm font-semibold text-white hover:bg-[#084F31] disabled:opacity-60"

            >

              Join queue

            </button>

          )}

        </div>

      ) : null}



      {unlocked && usesAppointment ? (

        <div className="mt-4 rounded-xl border border-[#E2EEE8] bg-[#F9FCFB] p-4">

          <div className="flex items-center gap-2">

            <CalendarDays className="h-4 w-4 text-[#0A6640]" />

            <p className="text-sm font-semibold text-[#052E1C]">Appointment</p>

          </div>



          {slotConfig && !visitCompleted ? (

            <p className="mt-2 text-xs text-[#4B6358]">

              Office hours {formatOperatingHoursRange(

                slotConfig.operatingHoursStart,

                slotConfig.operatingHoursEnd,

              )}

              {' · '}

              {slotConfig.slotDurationMinutes} min slots

              {' · '}

              up to {slotConfig.slotCapacity} students per slot

            </p>

          ) : null}



          {visitCompleted ? (
            <div className="mt-3 space-y-3">
              <div className="space-y-2 rounded-xl border border-[#C4E8D4] bg-[#F0FAF5] p-4">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#0A6640]">
                  <Clock3 className="h-4 w-4" />
                  Visit completed
                </p>
                {appointment?.slotStart ? (
                  <p className="text-sm text-[#4B6358]">
                    Your appointment on{' '}
                    {new Date(appointment.slotStart).toLocaleString()} was completed by institute
                    staff.
                  </p>
                ) : (
                  <p className="text-sm text-[#4B6358]">
                    Your institute visit for this request is complete.
                  </p>
                )}
              </div>
              <div className="rounded-xl border border-[#E2EEE8] bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-[#10B981]">
                  What happens next
                </p>
                <p className="mt-2 text-sm font-semibold text-[#052E1C]">{workflowNext.title}</p>
                <p className="mt-1 text-sm text-[#4B6358]">{workflowNext.description}</p>
              </div>
              {showPaymentAfterVisit && serviceId ? (
                <PaymentPanel
                  serviceId={serviceId}
                  offeringId={offering.id}
                  offering={offering}
                  application={application}
                  onPaid={onRefresh}
                  forceShow
                />
              ) : offering?.paymentConfig?.enabled &&
                offering?.paymentConfig?.timing === 'workflow_step' &&
                application?.payment?.status !== 'paid' ? (
                <p className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3 text-sm text-[#1E40AF]">
                  {offering.paymentConfig.label || 'Admission fee'} (
                  {offering.paymentConfig.amount
                    ? `₹${Number(offering.paymentConfig.amount).toLocaleString('en-IN')}`
                    : 'fee'}
                  ) will appear here once the institute moves your request to the fee step.
                </p>
              ) : null}
            </div>
          ) : appointment?.status === 'no_show' ? (
            <div className="mt-3 space-y-3">
              <p className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-sm text-[#92400E]">
                Your previous appointment was marked as a no-show. Please choose a new time below.
              </p>
              <AppointmentSlotPicker
                slots={slots}
                closures={closures}
                loading={loadingSlots}
                disabled={loading}
                onSelect={handleBook}
                emptyMessage={getAppointmentEmptyMessage(slotConfig)}
                maxDays={5}
              />
            </div>
          ) : appointment && appointmentMode === 'view' ? (

            <div className="mt-3 space-y-3">

              <p className="inline-flex items-center gap-2 text-sm font-medium text-[#0A6640]">

                <Clock3 className="h-4 w-4" />

                Booked for {new Date(appointment.slotStart).toLocaleString()}
                {appointment.visitMode === 'virtual' ? ' · Virtual' : ''}
              </p>
              {appointment.visitMode === 'virtual' && appointment.meeting?.link ? (
                <div className="space-y-1">
                  <a
                    href={appointment.meeting.link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex text-sm font-semibold text-[#1D4ED8] hover:underline"
                  >
                    Join Google Meet
                  </a>
                  {appointment.meeting.meetingId ? (
                    <p className="text-xs text-[#4B6358]">
                      Meeting ID:{' '}
                      <span className="font-mono font-semibold text-[#052E1C]">
                        {appointment.meeting.meetingId}
                      </span>
                    </p>
                  ) : null}
                </div>
              ) : appointment.visitMode === 'virtual' ? (
                <p className="text-xs text-[#4B6358]">
                  Staff will share the Google Meet link with you by email. You cannot invite others.
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">

                <button

                  type="button"

                  disabled={loading}

                  onClick={() => setAppointmentMode('reschedule')}

                  className="rounded-xl border border-[#C4E8D4] bg-white px-4 py-2 text-sm font-semibold text-[#0A6640] hover:bg-[#F0FAF5] disabled:opacity-60"

                >

                  Change time

                </button>

                <button

                  type="button"

                  disabled={loading}

                  onClick={async () => {

                    setLoading(true);

                    try {

                      await appointmentsApi.cancel(application.id);

                      setAppointment(null);

                      setAppointmentMode('view');

                      await refreshSlots();

                      toast.success('Appointment cancelled');

                      await onRefresh?.();

                    } catch (err) {

                      toast.error(err.message || 'Could not cancel appointment');

                    } finally {

                      setLoading(false);

                    }

                  }}

                  className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-2 text-sm font-semibold text-[#B91C1C] hover:bg-[#FEE2E2] disabled:opacity-60"

                >

                  Cancel

                </button>

              </div>

            </div>

          ) : appointmentMode === 'reschedule' ? (

            <div className="mt-3 space-y-3">

              <p className="text-sm font-semibold text-[#052E1C]">Pick a new time</p>

              <AppointmentSlotPicker

                slots={slots}

                closures={closures}

                loading={loadingSlots}

                disabled={loading}

                selectedSlotStart={appointment.slotStart}

                onSelect={handleReschedule}

                emptyMessage={getAppointmentEmptyMessage(slotConfig)}

                maxDays={5}

              />

              <button

                type="button"

                onClick={() => setAppointmentMode('view')}

                className="text-sm font-semibold text-[#4B6358] hover:text-[#052E1C]"

              >

                Keep current time

              </button>

            </div>

          ) : (

            <div className="mt-3 space-y-3">
              {virtualEnabled ? (
                <div className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#1D4ED8]">Visit type</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" onClick={() => setVisitMode('in_person')} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${visitMode === 'in_person' ? 'bg-white text-[#0A6640] ring-2 ring-[#0A6640]/20' : 'bg-white/70 text-[#4B6358]'}`}>In person</button>
                    <button type="button" onClick={() => setVisitMode('virtual')} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${visitMode === 'virtual' ? 'bg-white text-[#1D4ED8] ring-2 ring-[#1D4ED8]/20' : 'bg-white/70 text-[#4B6358]'}`}>Virtual (online)</button>
                  </div>
                  {visitMode === 'virtual' ? (
                    <p className="mt-3 text-xs text-[#4B6358]">
                      Book an online slot. Staff will create and send the Google Meet link — you cannot
                      invite others for security reasons.
                    </p>
                  ) : null}
                </div>
              ) : null}
              <AppointmentSlotPicker

                slots={slots}

                closures={closures}

                loading={loadingSlots}

                disabled={loading}

                onSelect={handleBook}

                emptyMessage={getAppointmentEmptyMessage(slotConfig)}

                maxDays={5}

              />

            </div>

          )}

        </div>

      ) : null}

    </div>

  );

}


