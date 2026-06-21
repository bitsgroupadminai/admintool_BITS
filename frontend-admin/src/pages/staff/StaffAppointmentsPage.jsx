import { useCallback, useEffect, useState } from 'react';

import { CalendarDays, Clock3, CheckCircle2, UserX, CalendarClock, X } from 'lucide-react';

import { toast } from 'sonner';

import { DashboardLayout } from '@/components/layouts/DashboardLayout';

import { Select } from '@/components/ui/select';

import { AppointmentsScheduleSkeleton } from '@/components/skeletons';

import { AppointmentSlotPicker } from '@/components/appointments/AppointmentSlotPicker';
import { VirtualMeetingPanel } from '@/components/appointments/VirtualMeetingPanel';

import { appointmentsApi } from '@/api/operations.api';

import { appointmentLifecycleApi } from '@/api/appointments.lifecycle.api';

import { useSocketEvent } from '@/contexts/SocketContext';

import { WS_EVENTS } from '@/lib/socket';



function RescheduleModal({ appointment, offeringId, onClose, onRescheduled }) {

  const [slots, setSlots] = useState([]);

  const [closures, setClosures] = useState([]);

  const [loading, setLoading] = useState(true);

  const [submitting, setSubmitting] = useState(false);



  useEffect(() => {

    if (!offeringId) return;

    setLoading(true);

    appointmentsApi

      .listSlots(offeringId, appointment.id)

      .then(({ data }) => {

        setSlots(data.data.slots ?? []);

        setClosures(data.data.closures ?? []);

      })

      .catch(() => {

        setSlots([]);

        toast.error('Could not load available slots');

      })

      .finally(() => setLoading(false));

  }, [offeringId, appointment.id]);



  const handleSelect = async (slotStart) => {

    setSubmitting(true);

    try {

      await appointmentLifecycleApi.reschedule(appointment.id, { slotStart });

      toast.success('Appointment rescheduled');

      await onRescheduled();

      onClose();

    } catch (err) {

      toast.error(err.message || 'Could not reschedule');

    } finally {

      setSubmitting(false);

    }

  };



  return (

    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">

      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#E2EEE8] bg-white p-5 shadow-xl">

        <div className="flex items-start justify-between gap-3">

          <div>

            <p className="text-xs font-bold uppercase tracking-wide text-[#10B981]">Reschedule</p>

            <h3 className="mt-1 text-lg font-bold text-[#052E1C]">{appointment.applicantName}</h3>

            <p className="mt-1 text-sm text-[#4B6358]">

              Current: {new Date(appointment.slotStart).toLocaleString()}

            </p>

          </div>

          <button

            type="button"

            onClick={onClose}

            className="rounded-lg p-1 text-[#4B6358] hover:bg-[#F0FAF5]"

          >

            <X className="h-5 w-5" />

          </button>

        </div>

        <div className="mt-4">

          <AppointmentSlotPicker

            slots={slots}

            closures={closures}

            loading={loading}

            disabled={submitting}

            selectedSlotStart={appointment.slotStart}

            onSelect={handleSelect}

            emptyMessage="No open slots available for rescheduling."

            maxDays={5}

          />

        </div>

      </div>

    </div>

  );

}



export function StaffAppointmentsPage() {

  const [offerings, setOfferings] = useState([]);

  const [selectedOfferingId, setSelectedOfferingId] = useState('');

  const [appointments, setAppointments] = useState([]);

  const [loading, setLoading] = useState(false);

  const [rescheduleTarget, setRescheduleTarget] = useState(null);



  useEffect(() => {

    appointmentsApi

      .listOfferings()

      .then(({ data }) => {

        const items = data.data.offerings ?? [];

        setOfferings(items);

        if (items[0]?.id) {

          setSelectedOfferingId(items[0].id);

        }

      })

      .catch(() => setOfferings([]));

  }, []);



  const loadAppointments = useCallback(async (offeringId) => {

    if (!offeringId) {

      setAppointments([]);

      return;

    }



    setLoading(true);

    try {

      const { data } = await appointmentsApi.listOfferingAppointments(offeringId);

      setAppointments(data.data.appointments ?? []);

    } catch (err) {

      setAppointments([]);

      toast.error(err.message || 'Could not load appointments');

    } finally {

      setLoading(false);

    }

  }, []);



  useEffect(() => {

    loadAppointments(selectedOfferingId);

  }, [selectedOfferingId, loadAppointments]);



  useSocketEvent(

    WS_EVENTS.APPOINTMENT_UPDATED,

    ({ offeringId }) => {

      if (!selectedOfferingId) return;

      if (offeringId && offeringId !== selectedOfferingId) return;

      loadAppointments(selectedOfferingId);

    },

    [selectedOfferingId, loadAppointments],

  );



  const [actionLoading, setActionLoading] = useState(null);



  const runAppointmentAction = async (appointmentId, action) => {

    setActionLoading(appointmentId + action);

    try {

      if (action === 'complete') {

        await appointmentLifecycleApi.markComplete(appointmentId);

        toast.success('Marked complete');

      } else if (action === 'no-show') {

        await appointmentLifecycleApi.markNoShow(appointmentId);

        toast.success('Marked no-show');

      }

      await loadAppointments(selectedOfferingId);

    } catch (err) {

      toast.error(err.message || 'Action failed');

    } finally {

      setActionLoading(null);

    }

  };



  const grouped = appointments.reduce((groups, appointment) => {

    const dayKey = new Date(appointment.slotStart).toLocaleDateString();

    if (!groups[dayKey]) groups[dayKey] = [];

    groups[dayKey].push(appointment);

    return groups;

  }, {});

  const selectedOffering = offerings.find((item) => item.id === selectedOfferingId);

  const maxAdditionalRecipients =
    selectedOffering?.virtualAppointment?.maxAdditionalRecipients ?? 50;



  return (

    <DashboardLayout

      title="Appointment schedule"

      subtitle="Manage bookings, reschedule visits, and mark outcomes"

    >

      <div className="rounded-2xl border border-[#E2EEE8] bg-white p-5 shadow-sm sm:p-6">

        <div className="flex flex-wrap items-end justify-between gap-4">

          <div>

            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#10B981]">

              Service option

            </p>

            <Select

              value={selectedOfferingId}

              onChange={setSelectedOfferingId}

              placeholder="Choose an appointment service"

              options={offerings.map((offering) => ({

                value: offering.id,

                label: `${offering.serviceName} · ${offering.name}`,

              }))}

              className="mt-2 min-w-[280px]"

            />

          </div>

          <div className="rounded-xl border border-[#C4E8D4] bg-[#F0FAF5] px-4 py-3">

            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#10B981]">

              Upcoming visits

            </p>

            <p className="mt-1 text-2xl font-bold text-[#052E1C]">{appointments.length}</p>

          </div>

        </div>



        {loading ? (

          <AppointmentsScheduleSkeleton />

        ) : appointments.length === 0 ? (

          <p className="mt-8 rounded-xl border border-dashed border-[#C4E8D4] bg-[#F9FCFB] px-4 py-10 text-center text-sm text-[#4B6358]">

            No upcoming appointments for this service option.

          </p>

        ) : (

          <div className="mt-8 space-y-6">

            {Object.entries(grouped).map(([day, dayAppointments]) => (

              <section key={day}>

                <h3 className="flex items-center gap-2 text-sm font-bold text-[#052E1C]">

                  <CalendarDays className="h-4 w-4 text-[#0A6640]" />

                  {day}

                </h3>

                <div className="mt-3 space-y-3">

                  {dayAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="rounded-xl border border-[#E2EEE8] bg-white p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-bold text-[#052E1C]">
                              {appointment.applicantName || 'Student'}
                            </p>
                            {appointment.visitMode === 'virtual' ? (
                              <span className="rounded-full bg-[#EFF6FF] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#1D4ED8]">
                                Virtual
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs text-[#4B6358]">{appointment.applicantEmail}</p>
                          <div className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[#0A6640]">
                            <Clock3 className="h-4 w-4" />
                            {new Date(appointment.slotStart).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {appointment.visitMode === 'virtual' ? (
                            <VirtualMeetingPanel
                              appointment={appointment}
                              maxAdditionalRecipients={maxAdditionalRecipients}
                              onUpdated={() => loadAppointments(selectedOfferingId)}
                            />
                          ) : null}
                          <button
                            type="button"
                            disabled={actionLoading === appointment.id + 'reschedule'}
                            onClick={() => setRescheduleTarget(appointment)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-[#BFDBFE] bg-white px-3 py-2 text-xs font-semibold text-[#1D4ED8] transition hover:bg-[#EFF6FF] disabled:opacity-60"
                          >
                            <CalendarClock className="h-3.5 w-3.5" />
                            Reschedule
                          </button>
                          <button
                            type="button"
                            disabled={actionLoading === appointment.id + 'complete'}
                            onClick={() => runAppointmentAction(appointment.id, 'complete')}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-[#C4E8D4] bg-[#F0FAF5] px-3 py-2 text-xs font-semibold text-[#0A6640] transition hover:bg-[#E2EEE8] disabled:opacity-60"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Complete
                          </button>
                          <button
                            type="button"
                            disabled={actionLoading === appointment.id + 'no-show'}
                            onClick={() => runAppointmentAction(appointment.id, 'no-show')}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-[#FECACA] bg-white px-3 py-2 text-xs font-semibold text-[#B91C1C] transition hover:bg-[#FEF2F2] disabled:opacity-60"
                          >
                            <UserX className="h-3.5 w-3.5" />
                            No-show
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                </div>

              </section>

            ))}

          </div>

        )}

      </div>



      {rescheduleTarget ? (

        <RescheduleModal

          appointment={rescheduleTarget}

          offeringId={selectedOfferingId}

          onClose={() => setRescheduleTarget(null)}

          onRescheduled={() => loadAppointments(selectedOfferingId)}

        />

      ) : null}

    </DashboardLayout>

  );

}


