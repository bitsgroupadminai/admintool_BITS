import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, GraduationCap, LogIn } from 'lucide-react';
import { PublicLayout } from '@/components/StudentLayout';
import { studentApi } from '@/api/student.api';

export function HomePage() {
  const [institute, setInstitute] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentApi
      .getInstitute()
      .then(({ data }) => setInstitute(data.data.institute))
      .catch(() => setInstitute({ name: 'BITS Institute' }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted">
        Loading portal...
      </div>
    );
  }

  return (
    <PublicLayout instituteName={institute?.name}>
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#3D6B5C]">
            Welcome
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            {institute?.name ?? 'Student Portal'}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted">
            Apply to enroll in a programme or log in if you are already enrolled to access
            institute services.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <Link
            to="/enroll"
            className="group rounded-3xl border border-border bg-white p-8 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8F0ED] text-[#1F4D3F]">
              <GraduationCap className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-xl font-semibold text-foreground">Apply to enroll</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              New students can choose a programme and start the enrollment application process.
            </p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#1F4D3F]">
              Browse programmes
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </span>
          </Link>

          <Link
            to="/login"
            className="group rounded-3xl border border-border bg-[#1F4D3F] p-8 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
              <LogIn className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-xl font-semibold">Log in</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/80">
              Already enrolled? Sign in to view services available for your programme.
            </p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white">
              Student login
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </span>
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}
