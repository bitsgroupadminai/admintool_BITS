import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { PublicLayout } from '@/components/StudentLayout';
import { PageHeader, PageShell, PortalCard } from '@/components/ui/PortalCard';
import { InstituteHomeSkeleton } from '@/components/skeletons';
import { studentApi } from '@/api/student.api';

const highlights = [
  {
    tag: 'Admissions',
    index: 1,
    title: 'Apply to a programme',
    description:
      'See what you need, which documents to prepare, and how the admission process works — before you apply.',
  },
  {
    tag: 'Services',
    index: 2,
    title: 'Use institute services',
    description:
      'After login, browse services your institute has opened for students like certificates, requests, and more.',
  },
  {
    tag: 'Guidance',
    index: 3,
    title: 'Know what happens next',
    description:
      'Simple step-by-step views show who reviews your request and how long each part usually takes.',
  },
];

export function InstituteHomePage() {
  const { instituteId } = useParams();
  const navigate = useNavigate();
  const [institute, setInstitute] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentApi
      .getInstitute(instituteId)
      .then(({ data }) => setInstitute(data.data.institute))
      .catch((err) => {
        toast.error(err.message || 'Institute not found');
        navigate('/', { replace: true });
      })
      .finally(() => setLoading(false));
  }, [instituteId, navigate]);

  if (loading) {
    return (
      <PublicLayout instituteName={institute?.name} instituteId={instituteId}>
        <InstituteHomeSkeleton />
      </PublicLayout>
    );
  }

  return (
    <PublicLayout instituteName={institute?.name} instituteId={instituteId}>
      <section className="border-b border-[#E2EEE8] bg-gradient-to-b from-white/80 to-[#F4FAF7]">
        <PageShell className="py-14 sm:py-16">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#C4E8D4] bg-white px-3 py-1.5 text-xs font-semibold text-[#0A6640]">
              <ShieldCheck className="h-3.5 w-3.5" />
              {institute?.name ?? 'Student portal'}
            </div>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-[#052E1C] sm:text-5xl">
              {institute?.name ?? 'Student Portal'}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#4B6358]">
              One place to apply for programmes, upload documents, and follow your requests — in
              plain language, without confusion.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to={`/${instituteId}/enroll`}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#0A6640] px-5 text-sm font-semibold text-white shadow-[0_2px_18px_rgba(10,102,64,0.25)] hover:bg-[#084F31]"
              >
                View programmes
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#C4E8D4] bg-white px-5 text-sm font-semibold text-[#0A6640] hover:bg-[#F0FAF5]"
              >
                Student login
              </Link>
            </div>
          </div>
        </PageShell>
      </section>

      <PageShell>
        <PageHeader
          eyebrow="Overview"
          title="What you can do here"
          description="Everything below applies only to this institute."
        />
        <div className="grid gap-5 md:grid-cols-3">
          {highlights.map((item) => (
            <PortalCard key={item.tag} {...item} />
          ))}
        </div>
      </PageShell>
    </PublicLayout>
  );
}
