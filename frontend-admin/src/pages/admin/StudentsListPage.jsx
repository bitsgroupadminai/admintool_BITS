import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, RefreshCw } from 'lucide-react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { generatePassword } from '@/utils/password';
import { userApi } from '@/api/user.api';

const studentSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  offeringId: z.string().min(1, 'Select a programme'),
});

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  offeringId: '',
};

export function StudentsListPage() {
  const [students, setStudents] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(studentSchema),
    defaultValues: EMPTY_FORM,
  });

  const load = async () => {
    const [studentsRes, programmesRes] = await Promise.all([
      userApi.listStudents(),
      userApi.listProgrammes(),
    ]);
    setStudents(studentsRes.data.data.students);
    setProgrammes(programmesRes.data.data.programmes);
  };

  useEffect(() => {
    load()
      .catch((err) => toast.error(err.message || 'Failed to load students'))
      .finally(() => setLoading(false));
  }, []);

  const onSubmit = async (values) => {
    setSubmitting(true);
    try {
      await userApi.createStudent(values);
      toast.success('Student account created');
      reset(EMPTY_FORM);
      await load();
    } catch (err) {
      toast.error(err.message || 'Failed to create student');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#10B981] mb-2">
            Student Access
          </p>
          <h1 className="text-3xl font-bold text-[#052E1C] tracking-tight">Students</h1>
          <p className="mt-1.5 text-sm text-[#4B6358]">
            Create enrolled student accounts so they can log in to the student portal.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Add enrolled student</CardTitle>
              <CardDescription>
                Student will be prompted to change password on first login (optional).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" {...register('name')} />
                  {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" {...register('email')} />
                  {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
                </div>
                <div>
                  <Label htmlFor="offeringId">Programme</Label>
                  <select
                    id="offeringId"
                    {...register('offeringId')}
                    className="h-10 w-full rounded-md border border-[#C4E8D4] bg-white px-3 text-sm"
                  >
                    <option value="">Select programme</option>
                    {programmes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  {errors.offeringId && (
                    <p className="mt-1 text-xs text-red-500">{errors.offeringId.message}</p>
                  )}
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <Label htmlFor="password">Temporary password</Label>
                    <button
                      type="button"
                      onClick={() => setValue('password', generatePassword())}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#0A6640]"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Generate
                    </button>
                  </div>
                  <Input id="password" type="text" {...register('password')} />
                  {errors.password && (
                    <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
                  )}
                </div>
                <Button type="submit" disabled={submitting}>
                  <Plus className="h-4 w-4" />
                  {submitting ? 'Creating...' : 'Create student'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Enrolled students</CardTitle>
              <CardDescription>Active student accounts for the student portal.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-[#4B6358]">Loading students...</p>
              ) : students.length === 0 ? (
                <p className="text-sm text-[#4B6358]">No students created yet.</p>
              ) : (
                <div className="space-y-3">
                  {students.map((student) => (
                    <div
                      key={student.id}
                      className="rounded-xl border border-[#E2EEE8] bg-[#F9FCFB] px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[#052E1C]">{student.name}</p>
                          <p className="text-sm text-[#4B6358]">{student.email}</p>
                          <p className="mt-1 text-xs text-[#6B7280]">
                            {student.programmeName ?? 'No programme'}
                          </p>
                        </div>
                        {student.mustChangePassword && (
                          <Badge variant="outline">First login pending</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
