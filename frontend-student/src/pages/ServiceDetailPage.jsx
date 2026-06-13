import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { StudentLayout } from '@/components/StudentLayout';
import { WorkflowTimeline } from '@/components/WorkflowTimeline';
import { studentApi } from '@/api/student.api';

export function ServiceDetailPage() {
  const { serviceId } = useParams();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentApi
      .getService(serviceId)
      .then(({ data }) => setService(data.data.service))
      .catch((err) => toast.error(err.message || 'Failed to load service'))
      .finally(() => setLoading(false));
  }, [serviceId]);

  return (
    <StudentLayout>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <Link to="/dashboard" className="text-sm font-medium text-[#1F4D3F]">
          ← Back to dashboard
        </Link>

        {loading ? (
          <p className="mt-6 text-sm text-muted">Loading service...</p>
        ) : (
          <>
            <h1 className="mt-4 text-3xl font-semibold text-foreground">{service?.name}</h1>
            <p className="mt-2 text-sm text-muted">{service?.description}</p>

            <div className="mt-8 space-y-6">
              {(service?.offerings ?? []).map((offering) => (
                <section
                  key={offering.id}
                  className="rounded-2xl border border-border bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold text-foreground">{offering.name}</h2>
                    <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                      Coming soon
                    </span>
                  </div>
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold text-foreground">Workflow preview</h3>
                    <div className="mt-4">
                      <WorkflowTimeline steps={offering.workflowSteps ?? []} />
                    </div>
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    </StudentLayout>
  );
}
