import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { PublicLayout } from '@/components/StudentLayout';
import { studentApi } from '@/api/student.api';

export function EnrollPage() {
  const [institute, setInstitute] = useState(null);
  const [offerings, setOfferings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([studentApi.getInstitute(), studentApi.listEnrollmentOfferings()])
      .then(([instituteRes, offeringsRes]) => {
        setInstitute(instituteRes.data.data.institute);
        setOfferings(offeringsRes.data.data.offerings);
      })
      .catch((err) => toast.error(err.message || 'Failed to load programmes'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PublicLayout instituteName={institute?.name}>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Link to="/" className="text-sm font-medium text-[#1F4D3F]">
          ← Back to home
        </Link>
        <h1 className="mt-4 text-3xl font-semibold text-foreground">Choose a programme</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Select the programme you want to enroll in at {institute?.name ?? 'this institute'}.
        </p>

        {loading ? (
          <p className="mt-8 text-sm text-muted">Loading programmes...</p>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {offerings.map((offering) => (
              <Link
                key={offering.id}
                to={`/enroll/${offering.id}`}
                className="group rounded-2xl border border-border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <h2 className="text-lg font-semibold text-foreground">{offering.name}</h2>
                <p className="mt-2 line-clamp-4 text-sm text-muted">
                  {offering.description || 'View eligibility, documents, and enrollment workflow.'}
                </p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#1F4D3F]">
                  View programme
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
