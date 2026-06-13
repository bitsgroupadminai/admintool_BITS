import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function StaffDashboardPage() {
  return (
    <DashboardLayout
      title="Staff dashboard"
      subtitle="Review assigned requests and take workflow actions"
    >
      <Card>
        <CardHeader>
          <CardTitle>Assigned requests</CardTitle>
          <CardDescription>
            You can view and act only on requests assigned to you.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted">
          Request handling will be available when workflow sections are implemented.
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
