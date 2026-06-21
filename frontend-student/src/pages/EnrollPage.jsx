import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { PublicLayout } from '@/components/StudentLayout';
import { EmptyState, PageHeader, PageShell, PortalCard } from '@/components/ui/PortalCard';
import { PortalCardGridSkeleton } from '@/components/skeletons';
import { studentApi } from '@/api/student.api';
import { formatOfferingWindow, formatQueueMode, getOfferingStats } from '@/utils/offering';

export function EnrollPage() {
  const { instituteId } = useParams();
  const navigate = useNavigate();
  const [institute, setInstitute] = useState(null);
  const [offerings, setOfferings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      studentApi.getInstitute(instituteId),
      studentApi.listEnrollmentOfferings(instituteId),
    ])
      .then(([instituteRes, offeringsRes]) => {
        setInstitute(instituteRes.data.data.institute);
        setOfferings(offeringsRes.data.data.offerings);
      })
      .catch((err) => {
        toast.error(err.message || 'Failed to load programmes');
        navigate('/', { replace: true });
      })
      .finally(() => setLoading(false));
  }, [instituteId, navigate]);

  return (
    <PublicLayout instituteName={institute?.name} instituteId={instituteId}>
      <PageShell>
        <Link
          to={`/${instituteId}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#0A6640]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to institute home
        </Link>

        <PageHeader
          className="mt-4"
          eyebrow="Programmes"
          title="Choose a programme"
          description={`Pick a programme at ${institute?.name ?? 'your institute'} to see requirements and start authorization.`}
        />

        {loading ? (
          <PortalCardGridSkeleton count={6} />
        ) : offerings.length === 0 ? (
          <EmptyState>
            No programmes are open right now. Please check back later or contact your institute
            office for help.
          </EmptyState>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {offerings.map((offering, index) => {
              const stats = getOfferingStats(offering);
              return (
                <PortalCard
                  key={offering.id}
                  href={`/${instituteId}/enroll/${offering.id}`}
                  tag={formatQueueMode(offering.queueMode)}
                  index={index + 1}
                  title={offering.name}
                  description={
                    offering.description ||
                    'See eligibility, documents, and the full admission process.'
                  }
                  actionLabel="View details"
                >
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {stats.map((stat) => (
                      <div key={stat.label} className="rounded-xl bg-[#F9FCFB] px-2.5 py-2">
                        <p className="text-sm font-bold text-[#052E1C]">{stat.value}</p>
                        <p className="mt-0.5 text-[10px] leading-tight text-[#4B6358]">
                          {stat.label}
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-xs font-medium text-[#4B6358]">
                    {formatOfferingWindow(offering)}
                  </p>
                </PortalCard>
              );
            })}
          </div>
        )}
      </PageShell>
    </PublicLayout>
  );
}
