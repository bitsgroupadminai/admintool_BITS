import { CUSTOM_ROLE_VALUE } from '@/utils/staffRole';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

/**
 * Role dropdown with predefined + institute custom roles + add custom option.
 */
export function StaffRoleField({
  roles,
  roleValue,
  customRoleName,
  onRoleChange,
  onCustomRoleChange,
  error,
  idPrefix = 'staffRole',
}) {
  const isCustom = roleValue === CUSTOM_ROLE_VALUE;

  return (
    <div className="space-y-2">
      <Label htmlFor={`${idPrefix}-select`}>Role</Label>
      <Select
        id={`${idPrefix}-select`}
        value={roleValue}
        onChange={onRoleChange}
        options={[
          ...roles.map((role) => ({
            value: role.value,
            label: `${role.label}${role.isCustom ? ' (custom)' : ''}`,
          })),
          { value: CUSTOM_ROLE_VALUE, label: '+ Add custom role...' },
        ]}
      />

      {isCustom && (
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-custom`}>Custom role name</Label>
          <Input
            id={`${idPrefix}-custom`}
            value={customRoleName}
            onChange={(e) => onCustomRoleChange(e.target.value)}
            placeholder="e.g. Admissions Officer"
            autoComplete="off"
          />
        </div>
      )}

      {error && <p className="text-xs text-[#B91C1C]">{error}</p>}
    </div>
  );
}
