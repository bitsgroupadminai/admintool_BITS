import { CUSTOM_ROLE_VALUE } from '@/utils/staffRole';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
      <select
        id={`${idPrefix}-select`}
        className="flex h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm"
        value={roleValue}
        onChange={(e) => onRoleChange(e.target.value)}
      >
        {roles.map((role) => (
          <option key={role.value} value={role.value}>
            {role.label}
            {role.isCustom ? ' (custom)' : ''}
          </option>
        ))}
        <option value={CUSTOM_ROLE_VALUE}>+ Add custom role...</option>
      </select>

      {isCustom && (
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-custom`} className="text-xs text-muted">
            Custom role name
          </Label>
          <Input
            id={`${idPrefix}-custom`}
            value={customRoleName}
            onChange={(e) => onCustomRoleChange(e.target.value)}
            placeholder="e.g. Admissions Officer"
            autoComplete="off"
          />
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
