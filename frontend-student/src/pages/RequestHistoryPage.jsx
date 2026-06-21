import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ClipboardList, FileWarning } from 'lucide-react';
import { StudentLayout } from '@/components/StudentLayout';
import { PageHeader, PageShell } from '@/components/ui/PortalCard';
import { studentApi } from '@/api/student.api';
import { getApplicationStatusLabel } from '@/utils/studentJourney';

const STATUS_TONES = {
  draft: 'border-[#E2EEE8] bg-white text-[#4B6358]',
  submitted: 'border-[#C4E8D4] bg-[#F0FAF5] text-[#0A6640]',
  in_review: 'border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]',
  needs_correction: 'border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]',
  admitted: 'border-[#BBF7D0] bg-[#ECFDF5] text-[#0A6640]',
  rejected: 'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]',
  withdrawn: 'border-[#E2EEE8] bg-[#F9FCFB] text-[#6B7280]',
  cancelled: 'border-[#E2EEE8] bg-[#F9FCFB] text-[#6B7280]',
};

export function RequestHistoryPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentApi
      .listApplications()
      .then(({ data }) => setApplications(data.data.applications ?? []))
      .catch(() => setApplications([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <StudentLayout>
      <PageShell>
        <Link
          to="/dashboard"
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#0A6640] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <PageHeader
          eyebrow="History"
          title="Request history"
          description="All your service requests, including completed and closed ones."
        />

        {loading ? (
          <p className="text-sm text-[#4B6358]">Loading history...</p>
        ) : applications.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-[#C4E8D4] bg-[#F9FCFB] px-6 py-12 text-center">
            <FileWarning className="mx-auto h-8 w-8 text-[#0A6640]" />
            <p className="mt-3 text-sm font-semibold text-[#052E1C]">No requests yet</p>
            <p className="mt-2 text-sm text-[#4B6358]">
              Your service requests will appear here once you start one.
            </p>
            <Link
              to="/services"
              className="mt-5 inline-flex h-11 items-center rounded-xl bg-[#0A6640] px-5 text-sm font-semibold text-white hover:bg-[#084F31]"
            >
              Browse services
            </Link>
          </div>
        ) : (
          <section className="mt-6 rounded-2xl border border-[#E2EEE8] bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <ClipboardList className="h-5 w-5 text-[#0A6640]" />
              <p className="text-sm text-[#4B6358]">
                {applications.length} request{applications.length !== 1 ? 's' : ''} total
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {applications.map((app) => {
                const tone = STATUS_TONES[app.status] ?? STATUS_TONES.draft;
                return (
                  <Link
                    key={app.id}
                    to={`/services/${app.serviceId}`}
                    className="block rounded-2xl border border-[#E2EEE8] bg-white p-5 shadow-sm transition hover:border-[#C4E8D4] hover:shadow-md"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#10B981]">
                          {app.serviceName}
                        </p>
                        <h3 className="mt-1 text-lg font-bold text-[#052E1C]">{app.offeringName}</h3>
                        <p className="mt-2 text-sm text-[#4B6358]">
                          Updated {new Date(app.updatedAt).toLocaleString()}
                        </p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs font-bold ${tone}`}>
                        {getApplicationStatusLabel(app.status)}
                      </span>
                    </div>
                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#0A6640]">
                      Open request
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </PageShell>
    </StudentLayout>
  );
}
