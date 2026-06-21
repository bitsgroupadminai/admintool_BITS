import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { SetupShell } from '@/components/setup/SetupShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SetupSummarySkeleton } from '@/components/skeletons';
import { instituteApi } from '@/api/institute.api';
import { useAuthStore } from '@/store/auth.store';

export function ReviewSetupPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [summary, setSummary] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      if (!user?.instituteId) return;
      try {
        const { data } = await instituteApi.getSetupSummary(user.instituteId);
        setSummary(data.data);
      } catch (err) {
        toast.error(err.message || 'Failed to load summary');
      }
    }
    load();
  }, [user?.instituteId]);

  const completeSetup = async () => {
    setSubmitting(true);
    try {
      const { data } = await instituteApi.completeSetup(user.instituteId);
      setUser({
        ...user,
        institute: data.data.institute,
      });
      toast.success('Setup complete. Welcome to your dashboard.');
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Failed to complete setup');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SetupShell currentStep="review">
      <Card>
        <CardHeader>
          <CardTitle>Review & confirm</CardTitle>
          <CardDescription>
            Confirm your institute configuration. You can add more staff later from settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!summary ? (
            <SetupSummarySkeleton />
          ) : (
            <dl className="space-y-4 rounded-xl border border-border bg-background p-4">
              <div className="flex justify-between gap-4">
                <dt className="text-sm text-muted">Institute</dt>
                <dd className="text-sm font-medium">{summary.institute.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-sm text-muted">Staff members</dt>
                <dd className="text-sm font-medium">{summary.staffCount}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-sm text-muted">Admin</dt>
                <dd className="text-sm font-medium">{user?.email}</dd>
              </div>
            </dl>
          )}

          <div className="flex justify-between gap-3">
            <Button variant="outline" onClick={() => navigate('/setup/staff')}>
              Back
            </Button>
            <Button onClick={completeSetup} disabled={submitting || !summary}>
              {submitting ? 'Finishing...' : 'Complete setup'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </SetupShell>
  );
}
