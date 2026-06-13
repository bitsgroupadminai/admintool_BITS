import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, RefreshCw } from 'lucide-react';
import { SetupShell } from '@/components/setup/SetupShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StaffRoleField } from '@/components/setup/StaffRoleField';
import { StaffMemberRow } from '@/components/setup/StaffMemberRow';
import { useConfirm } from '@/components/ui/confirm-context';
import { CUSTOM_ROLE_VALUE } from '@/utils/staffRole';
import { generatePassword } from '@/utils/password';
import { userApi } from '@/api/user.api';

const staffSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
};

export function StaffSetupPage() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [staff, setStaff] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [roleValue, setRoleValue] = useState('general');
  const [customRoleName, setCustomRoleName] = useState('');
  const confirm = useConfirm();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(staffSchema),
    defaultValues: EMPTY_FORM,
  });

  const loadStaff = async () => {
    const { data } = await userApi.listStaff();
    setStaff(data.data.staff);
  };

  const loadRoles = async () => {
    const { data } = await userApi.getStaffRoles();
    setRoles(data.data.roles);
  };

  useEffect(() => {
    async function init() {
      try {
        await Promise.all([loadRoles(), loadStaff()]);
      } catch (err) {
        toast.error(err.message || 'Failed to load staff data');
      }
    }
    init();
  }, []);

  const clearAddForm = () => {
    reset(EMPTY_FORM);
    setRoleValue('general');
    setCustomRoleName('');
    setFormKey((k) => k + 1);
  };

  const resolveRole = () => {
    if (roleValue === CUSTOM_ROLE_VALUE) {
      return customRoleName.trim();
    }
    return roleValue;
  };

  const onAddStaff = async (values) => {
    const staffRole = resolveRole();
    if (!staffRole) {
      toast.error('Please enter a custom role name');
      return;
    }

    setSubmitting(true);
    try {
      await userApi.createStaff({ ...values, staffRole });
      toast.success('Staff member added');
      clearAddForm();
      await Promise.all([loadStaff(), loadRoles()]);
    } catch (err) {
      toast.error(err.message || 'Failed to add staff');
    } finally {
      setSubmitting(false);
    }
  };

  const onRemove = async (member) => {
    const ok = await confirm({
      title: `Remove ${member.name}?`,
      description: 'This staff account will be deactivated and can no longer access the portal.',
      confirmLabel: 'Remove staff',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await userApi.deactivateStaff(member.id);
      toast.success('Staff removed');
      await loadStaff();
    } catch (err) {
      toast.error(err.message || 'Failed to remove staff');
    }
  };

  const handleGeneratePassword = () => {
    setValue('password', generatePassword(), { shouldValidate: true });
  };

  return (
    <SetupShell currentStep="staff">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Add staff users</CardTitle>
            <CardDescription>
              Create staff accounts with predefined or custom roles. You can skip and add them
              later from the dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              key={formKey}
              onSubmit={handleSubmit(onAddStaff)}
              className="grid gap-4 sm:grid-cols-2"
              autoComplete="off"
            >
              <input
                type="text"
                name="prevent_autofill"
                tabIndex={-1}
                autoComplete="off"
                className="pointer-events-none absolute h-0 w-0 opacity-0"
                aria-hidden
              />

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="staff-name">Name</Label>
                <Input
                  id="staff-name"
                  {...register('name')}
                  autoComplete="off"
                  placeholder="Full name"
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="staff-email">Email</Label>
                <Input
                  id="staff-email"
                  type="email"
                  {...register('email')}
                  autoComplete="off"
                  placeholder="name@institute.edu"
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <StaffRoleField
                roles={roles}
                roleValue={roleValue}
                customRoleName={customRoleName}
                onRoleChange={setRoleValue}
                onCustomRoleChange={setCustomRoleName}
                idPrefix="add-staff"
              />

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="staff-password">Temporary password</Label>
                <div className="flex gap-2">
                  <Input
                    id="staff-password"
                    type="text"
                    {...register('password')}
                    autoComplete="new-password"
                    placeholder="Min. 8 characters"
                  />
                  <Button type="button" variant="outline" onClick={handleGeneratePassword}>
                    <RefreshCw className="h-4 w-4" />
                    Generate
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              <Button type="submit" disabled={submitting} className="sm:col-span-2">
                <Plus className="h-4 w-4" />
                {submitting ? 'Adding...' : 'Add staff member'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {staff.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Added staff ({staff.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {staff.map((member) => (
                <StaffMemberRow
                  key={member.id}
                  member={member}
                  roles={roles}
                  onUpdated={async () => {
                    await Promise.all([loadStaff(), loadRoles()]);
                  }}
                  onRemoved={() => onRemove(member)}
                />
              ))}
            </CardContent>
          </Card>
        )}

        <div className="flex justify-between gap-3">
          <Button variant="outline" onClick={() => navigate('/setup/institute')}>
            Back
          </Button>
          <Button onClick={() => navigate('/setup/review')}>
            {staff.length === 0 ? 'Skip for now' : 'Continue'}
          </Button>
        </div>
      </div>
    </SetupShell>
  );
}
