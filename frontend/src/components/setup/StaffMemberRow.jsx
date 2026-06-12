import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil, Trash2, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
      <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
        <div>
          <p className="font-medium">{member.name}</p>
          <p className="text-sm text-muted">
            {member.email} · {getStaffRoleLabel(member.staffRole)}
          </p>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditing(true)}
            aria-label={`Edit ${member.name}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemoved}
            aria-label={`Remove ${member.name}`}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSave)}
      className="space-y-4 rounded-lg border border-sage/40 bg-accent/20 p-4"
      autoComplete="off"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Edit staff member</p>
        <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label>Name</Label>
          <Input {...register('name')} autoComplete="off" />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" {...register('email')} autoComplete="off" />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <StaffRoleField
          roles={roles.filter((r) => r.value !== CUSTOM_ROLE_VALUE)}
          roleValue={roleValue}
          customRoleName={customRoleName}
          onRoleChange={setRoleValue}
          onCustomRoleChange={setCustomRoleName}
          idPrefix={`edit-${member.id}`}
        />

        <div className="space-y-2 sm:col-span-2">
          <Label>New password (optional)</Label>
          <div className="flex gap-2">
            <Input
              type="text"
              {...register('password')}
              placeholder="Leave blank to keep current"
              autoComplete="new-password"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => setValue('password', generatePassword())}
            >
              Generate
            </Button>
          </div>
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => setEditing(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          <Check className="h-4 w-4" />
          {submitting ? 'Saving...' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
