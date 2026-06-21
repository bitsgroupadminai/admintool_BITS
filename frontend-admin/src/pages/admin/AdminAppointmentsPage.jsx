import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Clock3 } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Select } from '@/components/ui/select';
import { AppointmentsScheduleSkeleton } from '@/components/skeletons';
import { adminOperationsApi } from '@/api/operations.api';
import { useSocketEvent } from '@/contexts/SocketContext';
import { WS_EVENTS } from '@/lib/socket';

export function AdminAppointmentsPage() {
  const [offerings, setOfferings] = useState([]);
  const [selectedOfferingId, setSelectedOfferingId] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    adminOperationsApi
      .listAppointmentOfferings()
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
      const { data } = await adminOperationsApi.listOfferingAppointments(offeringId);
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

  const grouped = appointments.reduce((groups, appointment) => {
    const dayKey = new Date(appointment.slotStart).toLocaleDateString();
    if (!groups[dayKey]) groups[dayKey] = [];
    groups[dayKey].push(appointment);
    return groups;
  }, {});

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#10B981]">
            Operations monitoring
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#052E1C]">
            Appointment schedule
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-[#4B6358]">
            See upcoming student visits across appointment-enabled service options in real time.
          </p>
        </div>

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
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E2EEE8] bg-[#F9FCFB] px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-[#052E1C]">
                            {appointment.applicantName || 'Student'}
                          </p>
                          <p className="mt-1 text-xs text-[#4B6358]">
                            {appointment.applicantEmail}
                          </p>
                        </div>
                        <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#0A6640]">
                          <Clock3 className="h-4 w-4" />
                          {new Date(appointment.slotStart).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
