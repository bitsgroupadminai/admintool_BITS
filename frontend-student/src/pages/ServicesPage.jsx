import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { StudentLayout } from '@/components/StudentLayout';
import { EmptyState, PageHeader, PageShell, PortalCard } from '@/components/ui/PortalCard';
import { PortalCardGridSkeleton } from '@/components/skeletons';
import { studentApi } from '@/api/student.api';

export function ServicesPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentApi
      .listServices()
      .then(({ data }) => setServices(data.data.services))
      .catch((err) => toast.error(err.message || 'Failed to load services'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <StudentLayout>
      <PageShell>
        <PageHeader
          eyebrow="Services"
          title="Institute services"
          description="Pick a service to see what is available, what documents you need, and how the process works."
        />

        {loading ? (
          <PortalCardGridSkeleton count={6} />
        ) : services.length === 0 ? (
          <EmptyState>
            No services are available yet. Your institute will add them here when they are ready.
          </EmptyState>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {services.map((service, index) => (
              <PortalCard
                key={service.id}
                href={`/services/${service.id}`}
                tag={service.isEnrollmentService ? 'Admission' : 'Service'}
                index={index + 1}
                title={service.name}
                description={
                  service.description || 'See what this service offers and how to apply.'
                }
                actionLabel="View details"
              >
                <p className="mt-4 rounded-xl bg-[#F9FCFB] px-3 py-2 text-xs font-semibold text-[#4B6358]">
                  {service.offeringCount ?? service.offerings?.length ?? 0} option
                  {(service.offeringCount ?? service.offerings?.length ?? 0) === 1 ? '' : 's'}{' '}
                  available
                </p>
              </PortalCard>
            ))}
          </div>
        )}
      </PageShell>
    </StudentLayout>
  );
}
