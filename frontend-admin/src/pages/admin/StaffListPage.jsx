import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, RefreshCw, UserCog } from 'lucide-react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Drawer } from '@/components/ui/drawer';
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

const EMPTY_FORM = { name: '', email: '', password: '' };

const inputClass =
  'w-full rounded-xl border border-[#C4E8D4] bg-[#F0FAF5] px-4 py-2.5 text-sm text-[#052E1C] placeholder-[#A8BDB5] outline-none transition-all duration-200 hover:border-[#6EE7B7] hover:bg-[#EDFAF3] focus:border-[#6EE7B7] focus:bg-white focus:ring-2 focus:ring-[#6EE7B7]/20';

export function StaffListPage() {
  const [roles, setRoles] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCreateDrawer, setShowCreateDrawer] = useState(false);
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
        toast.error(err.message || 'Failed to load staff');
      } finally {
        setLoading(false);
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
    if (roleValue === CUSTOM_ROLE_VALUE) return customRoleName.trim();
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
      setShowCreateDrawer(false);
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

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8 flex flex-col items-stretch gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#10B981]">
              Configuration
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-[#052E1C] sm:text-3xl">
              Staff management
            </h1>
            <p className="mt-1.5 text-sm text-[#4B6358]">
              Add, edit, and deactivate staff accounts and roles
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              clearAddForm();
              setShowCreateDrawer(true);
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0A6640] to-[#084F31] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_10px_rgba(10,102,64,0.28)] transition hover:opacity-95 sm:w-auto"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Add staff
          </button>
        </div>

        <Drawer
          open={showCreateDrawer}
          title="Add staff member"
          description="Create a new staff account with portal access."
          onClose={() => setShowCreateDrawer(false)}
        >
          <form key={formKey} onSubmit={handleSubmit(onAddStaff)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#4B6358]">Name</label>
              <input className={inputClass} {...register('name')} autoComplete="off" />
              {errors.name && <p className="text-xs text-[#B91C1C]">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#4B6358]">Email</label>
              <input type="email" className={inputClass} {...register('email')} autoComplete="off" />
              {errors.email && <p className="text-xs text-[#B91C1C]">{errors.email.message}</p>}
            </div>
            <StaffRoleField
              roles={roles.filter((r) => r.value !== CUSTOM_ROLE_VALUE)}
              roleValue={roleValue}
              customRoleName={customRoleName}
              onRoleChange={setRoleValue}
              onCustomRoleChange={setCustomRoleName}
              idPrefix="admin-staff"
            />
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#4B6358]">Password</label>
              <div className="flex gap-2">
                <input type="text" className={inputClass} {...register('password')} autoComplete="new-password" />
                <button
                  type="button"
                  onClick={() => setValue('password', generatePassword())}
                  className="shrink-0 rounded-xl border border-[#C4E8D4] bg-white px-4 py-2 text-sm font-semibold text-[#0A6640] hover:bg-[#F0FAF5]"
                >
                  Generate
                </button>
              </div>
              {errors.password && <p className="text-xs text-[#B91C1C]">{errors.password.message}</p>}
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0A6640] to-[#084F31] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_10px_rgba(10,102,64,0.28)] disabled:opacity-60"
              >
                {submitting ? 'Adding...' : 'Add staff member'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateDrawer(false)}
                className="rounded-xl border border-[#C4E8D4] bg-white px-5 py-2.5 text-sm font-semibold text-[#0A6640] hover:bg-[#F0FAF5]"
              >
                Cancel
              </button>
            </div>
          </form>
        </Drawer>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-[#4B6358]">
            <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
            Loading staff...
          </div>
        ) : staff.length === 0 ? (
          <div className="rounded-2xl border border-[#C4E8D4] bg-white/85 px-7 py-16 text-center shadow-[0_4px_24px_rgba(10,102,64,0.07)]">
            <UserCog className="mx-auto h-10 w-10 text-[#0A6640]" />
            <p className="mt-4 text-sm font-semibold text-[#052E1C]">No staff members yet</p>
            <p className="mt-1 text-sm text-[#4B6358]">Add your first staff member to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {staff.map((member) => (
              <StaffMemberRow
                key={member.id}
                member={member}
                roles={roles}
                onUpdated={loadStaff}
                onRemoved={() => onRemove(member)}
              />
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
