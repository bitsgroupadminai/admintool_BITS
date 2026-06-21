import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { BackLink } from '@/components/ui/back-link';
import { ProfileForm } from '@/components/profile/ProfileForm';

export function StaffProfilePage() {
  return (
    <DashboardLayout title="Profile" subtitle="Manage your account settings and password">
      <BackLink to="/staff/dashboard" label="Back to dashboard" className="mb-6" />
      <ProfileForm />
    </DashboardLayout>
  );
}
