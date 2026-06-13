import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { StudentLayout } from '@/components/StudentLayout';
import { useAuthStore } from '@/store/auth.store';
import { studentApi } from '@/api/student.api';

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
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
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#3D6B5C]">
            Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-foreground">Welcome, {user?.name}</h1>
          <p className="mt-2 text-sm text-muted">
            Enrolled in{' '}
            <span className="font-medium text-foreground">
              {user?.enrolledProgramme?.name ?? 'your programme'}
            </span>
            . Browse services you can avail at {user?.institute?.name}.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-muted">Loading services...</p>
        ) : services.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-white p-8 text-sm text-muted">
            No additional services are available yet. Your institute admin can configure more
            services from the admin portal.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {services.map((service) => (
              <Link
                key={service.id}
                to={`/services/${service.id}`}
                className="group rounded-2xl border border-border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F0ED] text-[#1F4D3F]">
                  <Layers className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-foreground">{service.name}</h2>
                <p className="mt-2 line-clamp-3 text-sm text-muted">
                  {service.description || 'View offerings and workflow for this service.'}
                </p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#1F4D3F]">
                  View service
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
