import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { SetupShell } from '@/components/setup/SetupShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GlobalLoader } from '@/components/ui/GlobalLoader';
import { instituteApi } from '@/api/institute.api';
import { useAuthStore } from '@/store/auth.store';

const schema = z.object({
  name: z.string().min(2, 'Institute name is required'),
});

export function InstituteSetupPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    async function load() {
      if (!user?.instituteId) return;
      try {
        const { data } = await instituteApi.get(user.instituteId);
        reset({ name: data.data.institute.name });
      } catch (err) {
        toast.error(err.message || 'Failed to load institute');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user?.instituteId, reset]);

  const onSubmit = async (values) => {
    setSubmitting(true);
    try {
      const { data } = await instituteApi.update(user.instituteId, values);
      setUser({
        ...user,
        institute: data.data.institute,
      });
      navigate('/setup/staff');
    } catch (err) {
      toast.error(err.message || 'Failed to update institute');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SetupShell currentStep="institute">
      <Card>
        <CardHeader>
          <CardTitle>Institute details</CardTitle>
          <CardDescription>
            Your institute was created during signup. Confirm or update the name.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <GlobalLoader label="Loading institute details..." variant="inline" size="sm" />
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Institute name</Label>
                <Input id="name" {...register('name')} />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                )}
              </div>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Continue'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </SetupShell>
  );
}
