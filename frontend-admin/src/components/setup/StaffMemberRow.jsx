import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil, Trash2, X, Check, UserCog } from 'lucide-react';
import { StaffRoleField } from '@/components/setup/StaffRoleField';
import { getStaffRoleLabel, CUSTOM_ROLE_VALUE } from '@/utils/staffRole';
import { generatePassword } from '@/utils/password';
import { userApi } from '@/api/user.api';
import { toast } from 'sonner';

const editSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8).optional().or(z.literal('')),
});

const inputClass =
  'w-full rounded-xl border border-[#C4E8D4] bg-[#F0FAF5] px-4 py-2.5 text-sm text-[#052E1C] placeholder-[#A8BDB5] outline-none transition-all duration-200 hover:border-[#6EE7B7] hover:bg-[#EDFAF3] focus:border-[#6EE7B7] focus:bg-white focus:ring-2 focus:ring-[#6EE7B7]/20';

/**
 * @param {Object} props
 * @param {Object} props.member
 * @param {Array} props.roles
 * @param {() => Promise<void>} props.onUpdated
 * @param {() => Promise<void>} props.onRemoved
 */
export function StaffMemberRow({ member, roles, onUpdated, onRemoved }) {
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [roleValue, setRoleValue] = useState(
    roles.some((r) => r.value === member.staffRole) ? member.staffRole : CUSTOM_ROLE_VALUE,
  );
  const [customRoleName, setCustomRoleName] = useState(
    roles.some((r) => r.value === member.staffRole) ? '' : member.staffRole,
  );

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: member.name,
      email: member.email,
      password: '',
    },
  });

  const resolveRole = () => {
    if (roleValue === CUSTOM_ROLE_VALUE) {
      return customRoleName.trim();
    }
    return roleValue;
  };

  const onSave = async (values) => {
    const staffRole = resolveRole();
    if (!staffRole) {
      toast.error('Please enter a custom role name');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: values.name,
        email: values.email,
        staffRole,
      };
      if (values.password) {
        payload.password = values.password;
      }
      await userApi.updateStaff(member.id, payload);
      toast.success('Staff member updated');
      setEditing(false);
      await onUpdated();
    } catch (err) {
      toast.error(err.message || 'Failed to update staff');
    } finally {
      setSubmitting(false);
    }
  };

  if (!editing) {
    return (
      <div className="group flex items-center gap-1 rounded-2xl border border-[#C4E8D4] bg-white/85 shadow-[0_2px_12px_rgba(10,102,64,0.05)] transition-all duration-300 hover:border-[#6EE7B7] hover:shadow-[0_4px_20px_rgba(10,102,64,0.10)]">
        <div className="flex min-w-0 flex-1 items-center gap-4 px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#D1FAE5] to-[#A7F3D0] border border-[#C4E8D4]">
            <UserCog className="h-4.5 w-4.5 text-[#0A6640]" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-[#052E1C]">{member.name}</p>
            <p className="mt-0.5 truncate text-sm text-[#4B6358]">
              {member.email} · {getStaffRoleLabel(member.staffRole)}
            </p>
          </div>
        </div>
        <div className="mr-4 flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#C4E8D4] bg-white text-[#0A6640] transition hover:bg-[#F0FAF5]"
            aria-label={`Edit ${member.name}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onRemoved}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-[#9CA3AF] transition hover:border-[#FCA5A5] hover:bg-red-50 hover:text-[#EF4444]"
            aria-label={`Remove ${member.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSave)}
      className="space-y-4 rounded-2xl border border-[#C4E8D4] bg-[#F9FCFB] p-5 shadow-sm"
      autoComplete="off"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-[#052E1C]">Edit staff member</p>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#4B6358] hover:bg-[#F0FAF5]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
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
          idPrefix={`edit-${member.id}`}
        />

        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-[#4B6358]">
            New password (optional)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              className={inputClass}
              {...register('password')}
              placeholder="Leave blank to keep current"
              autoComplete="new-password"
            />
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
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-xl border border-[#C4E8D4] bg-white px-4 py-2 text-sm font-semibold text-[#0A6640] hover:bg-[#F0FAF5]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0A6640] to-[#084F31] px-5 py-2 text-sm font-semibold text-white shadow-[0_2px_10px_rgba(10,102,64,0.28)] disabled:opacity-60"
        >
          <Check className="h-4 w-4" />
          {submitting ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
