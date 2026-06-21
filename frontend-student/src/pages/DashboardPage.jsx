import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Clock3,
  FileWarning,
  Sparkles,
} from 'lucide-react';
import { StudentLayout } from '@/components/StudentLayout';
import { useAuthStore } from '@/store/auth.store';
import { studentApi } from '@/api/student.api';
import { DashboardSkeleton } from '@/components/skeletons';
import { DashboardInsights } from '@/components/dashboard/DashboardInsights';
import { PageHeader, PageShell } from '@/components/ui/PortalCard';
import { getApplicationStatusLabel } from '@/utils/studentJourney';
import { useSocketEvent } from '@/contexts/SocketContext';
import { WS_EVENTS } from '@/lib/socket';

const STATUS_TONES = {
  draft: 'border-[#E2EEE8] bg-white text-[#4B6358]',
  submitted: 'border-[#C4E8D4] bg-[#F0FAF5] text-[#0A6640]',
  in_review: 'border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]',
  needs_correction: 'border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]',
  admitted: 'border-[#BBF7D0] bg-[#ECFDF5] text-[#0A6640]',
  rejected: 'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]',
};

function RequestCard({ application }) {
  const tone = STATUS_TONES[application.status] ?? STATUS_TONES.draft;
  const statusLabel = getApplicationStatusLabel(application.status);

  return (
    <Link
      to={`/services/${application.serviceId}`}
      className="block rounded-2xl border border-[#E2EEE8] bg-white p-5 shadow-sm transition hover:border-[#C4E8D4] hover:shadow-md"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#10B981]">
            {application.serviceName}
          </p>
          <h3 className="mt-1 text-lg font-bold text-[#052E1C]">{application.offeringName}</h3>
          <p className="mt-2 text-sm text-[#4B6358]">
            Last updated {new Date(application.updatedAt).toLocaleString()}
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${tone}`}>
          {statusLabel}
        </span>
      </div>

      {application.status === 'needs_correction' && application.correctionNote ? (
        <p className="mt-4 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-sm text-[#92400E]">
          {application.correctionNote}
        </p>
      ) : null}

      {application.status === 'draft' && application.requiredDocumentCount > 0 ? (
        <p className="mt-4 text-sm text-[#4B6358]">
          Documents uploaded: {application.uploadedRequiredCount} of{' '}
          {application.requiredDocumentCount}
        </p>
      ) : null}

      <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#0A6640]">
        Open request
        <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  );
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadApplications = useCallback(({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    studentApi
      .listApplications()
      .then(({ data }) => setApplications(data.data.applications ?? []))
      .catch(() => setApplications([]))
      .finally(() => {
        if (!silent) setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  useSocketEvent(WS_EVENTS.APPLICATION_UPDATED, () => {
    loadApplications({ silent: true });
  }, [loadApplications]);

  const activeApplications = applications.filter((item) => item.status !== 'admitted');
  const completedApplications = applications.filter((item) => item.status === 'admitted');

  return (
    <StudentLayout>
      <PageShell>
        <PageHeader
          eyebrow="Dashboard"
          title={`Welcome, ${user?.name}`}
          description={`Track your service requests, documents, and visits in one place.`}
        />

        {loading ? (
          <DashboardSkeleton />
        ) : (
          <>
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[#C4E8D4] bg-[#F0FAF5] p-5">
            <div className="flex items-center gap-3">
              <ClipboardList className="h-5 w-5 text-[#0A6640]" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#10B981]">
                  Active requests
                </p>
                <p className="mt-1 text-2xl font-bold text-[#052E1C]">{activeApplications.length}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-[#E2EEE8] bg-white p-5">
            <div className="flex items-center gap-3">
              <Clock3 className="h-5 w-5 text-[#0A6640]" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#10B981]">
                  Needs your action
                </p>
                <p className="mt-1 text-2xl font-bold text-[#052E1C]">
                  {applications.filter((item) => ['draft', 'needs_correction'].includes(item.status)).length}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-[#E2EEE8] bg-white p-5">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-[#0A6640]" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#10B981]">
                  Completed
                </p>
                <p className="mt-1 text-2xl font-bold text-[#052E1C]">{completedApplications.length}</p>
              </div>
            </div>
          </div>
        </div>

        <DashboardInsights applications={applications} />

        <section className="rounded-2xl border border-[#E2EEE8] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[#052E1C]">Your requests</h2>
              <p className="mt-1 text-sm text-[#4B6358]">
                Tap any request to upload documents, fix issues, or book a visit.
              </p>
            </div>
            <Link
              to="/services"
              className="inline-flex h-10 items-center rounded-xl border border-[#C4E8D4] bg-[#F0FAF5] px-4 text-sm font-semibold text-[#0A6640]"
            >
              Browse services
            </Link>
          </div>

          {applications.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-[#C4E8D4] bg-[#F9FCFB] px-6 py-10 text-center">
              <FileWarning className="mx-auto h-8 w-8 text-[#0A6640]" />
              <p className="mt-3 text-sm font-semibold text-[#052E1C]">No requests yet</p>
              <p className="mt-2 text-sm text-[#4B6358]">
                Browse institute services and start your first request when you are ready.
              </p>
              <Link
                to="/services"
                className="mt-5 inline-flex h-11 items-center rounded-xl bg-[#0A6640] px-5 text-sm font-semibold text-white hover:bg-[#084F31]"
              >
                Find a service
              </Link>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {applications.map((application) => (
                <RequestCard key={application.id} application={application} />
              ))}
            </div>
          )}
        </section>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <Link
            to="/services"
            className="rounded-2xl border border-[#E2EEE8] bg-[#F9FCFB] p-5 transition hover:border-[#C4E8D4]"
          >
            <div className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-[#0A6640]" />
              <div>
                <p className="text-sm font-bold text-[#052E1C]">Need to book a visit?</p>
                <p className="mt-1 text-sm text-[#4B6358]">
                  Open your service request and use the visit planning section after submission.
                </p>
              </div>
            </div>
          </Link>
          <Link
            to="/guidance"
            className="rounded-2xl border border-[#E2EEE8] bg-[#F9FCFB] p-5 transition hover:border-[#C4E8D4]"
          >
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-[#0A6640]" />
              <div>
                <p className="text-sm font-bold text-[#052E1C]">Need help understanding steps?</p>
                <p className="mt-1 text-sm text-[#4B6358]">
                  Read simple guidance or use the help chat button at the bottom-right corner.
                </p>
              </div>
            </div>
          </Link>
        </div>
          </>
        )}
      </PageShell>
    </StudentLayout>
  );
}
