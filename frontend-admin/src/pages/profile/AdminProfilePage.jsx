import { AdminLayout } from '@/components/layouts/AdminLayout';
import { BackLink } from '@/components/ui/back-link';
import { ProfileForm } from '@/components/profile/ProfileForm';

export function AdminProfilePage() {
  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
        <BackLink to="/admin/dashboard" label="Back to dashboard" className="mb-6" />
        <ProfileForm />
      </div>
    </AdminLayout>
  );
}
