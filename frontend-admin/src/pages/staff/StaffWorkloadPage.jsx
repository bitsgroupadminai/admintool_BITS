import { useEffect, useState } from 'react';
import { CalendarDays, ClipboardList, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { DashboardMetricCard } from '@/components/dashboard/DashboardShell';
import { analyticsApi } from '@/api/analytics.api';

export function StaffWorkloadPage() {
  const [workload, setWorkload] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsApi
      .staffDashboard()
      .then(({ data }) => setWorkload(data.data.analytics ?? data.data))
      .catch(() => setWorkload(null))
      .finally(() => setLoading(false));
  }, []);

  const summary = workload?.summary ?? {};
  const days = workload?.appointmentsByDay ?? [];

  return (
    <DashboardLayout
      title="Workload calendar"
      subtitle="Your open requests and upcoming visits"
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <DashboardMetricCard
          index={1}
          label="Open requests"
          value={loading ? '—' : summary.openAssigned ?? 0}
          icon={ClipboardList}
          variant="emerald"
        />
        <DashboardMetricCard
          index={2}
          label="SLA at risk"
          value={loading ? '—' : summary.slaAtRisk ?? 0}
          icon={AlertTriangle}
          variant="amber"
        />
        <DashboardMetricCard
          index={3}
          label="Completed this week"
          value={loading ? '—' : summary.resolvedThisWeek ?? summary.completedThisWeek ?? 0}
          icon={CheckCircle2}
          variant="teal"
        />
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-[#E2EEE8] bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-[#E2EEE8] px-6 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F0FAF5] text-[#0A6640]">
            <CalendarDays className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#052E1C]">Upcoming visits</h2>
            <p className="text-xs text-[#4B6358]">Scheduled appointments on your calendar</p>
          </div>
        </div>

        <div className="px-6 py-5">
          {loading ? (
            <p className="text-sm text-[#4B6358]">Loading calendar...</p>
          ) : days.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#C4E8D4] bg-[#F9FCFB] px-4 py-10 text-center text-sm text-[#4B6358]">
              No upcoming appointments scheduled.
            </p>
          ) : (
            <div className="space-y-5">
              {days.map((day) => (
                <div key={day.date}>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#10B981]">
                    {day.date}
                  </p>
                  <ul className="mt-3 space-y-2">
                    {(day.appointments ?? []).map((appt) => (
                      <li
                        key={appt.id}
                        className="flex items-center justify-between rounded-xl border border-[#E2EEE8] bg-[#F9FCFB] px-4 py-3 text-sm"
                      >
                        <span className="font-semibold text-[#052E1C]">
                          {appt.applicantName || 'Student'}
                        </span>
                        <span className="text-[#0A6640]">
                          {new Date(appt.slotStart).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
