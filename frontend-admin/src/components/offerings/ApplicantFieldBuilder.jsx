import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FieldError } from '@/components/ui/field-error';

const APPLICANT_FIELD_TYPES = [
  { value: 'text', label: 'Short text' },
  { value: 'textarea', label: 'Long text / address' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'date', label: 'Date (e.g. DOB)' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Dropdown' },
];

const FIELD_PRESETS = [
  { label: 'Date of birth', fieldType: 'date', placeholder: '', required: true },
  {
    label: 'Address',
    fieldType: 'textarea',
    placeholder: 'Street, city, state, pin code',
    required: true,
  },
  { label: 'Phone number', fieldType: 'phone', placeholder: 'Mobile number', required: true },
  { label: 'City', fieldType: 'text', placeholder: 'City name', required: false },
];

export function slugifyFieldKey(label) {
  const slug = String(label ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || `field_${Date.now()}`;
}

function defaultField(overrides = {}) {
  return {
    fieldKey: '',
    label: '',
    fieldType: 'text',
    required: true,
    placeholder: '',
    helpText: '',
    options: [],
    ...overrides,
  };
}

/**
 * @param {{
 *   fields: Array<any>;
 *   onChange: (fields: Array<any>) => void;
 *   fieldErrors?: Record<number, { label?: string; options?: string }>;
 * }} props
 */
export function ApplicantFieldBuilder({ fields, onChange, fieldErrors = {} }) {
  const updateField = (index, patch) => {
    const next = fields.map((field, fieldIndex) =>
      fieldIndex === index ? { ...field, ...patch } : field,
    );
    onChange(next);
  };

  const addField = (preset = {}) => {
    const label = preset.label ?? '';
    onChange([
      ...fields,
      defaultField({
        ...preset,
        fieldKey: slugifyFieldKey(label),
      }),
    ]);
  };

  const removeField = (index) => {
    onChange(fields.filter((_, fieldIndex) => fieldIndex !== index));
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-[#FAFBFA] p-4">
        <p className="text-sm font-semibold text-forest">Always collected</p>
        <p className="mt-1 text-xs text-muted">
          Full name, email, and mobile number (searchable country code) are built in. Add extra personal details below.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted">
            Full name
          </span>
          <span className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted">
            Email
          </span>
          <span className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted">
            Mobile number
          </span>
        </div>
      </div>

      {fields.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-[#FAFBFA] px-4 py-8 text-center">
          <p className="text-sm text-muted">No custom fields yet.</p>
          <p className="mt-1 text-xs text-muted">
            Use quick-add buttons for DOB, address, or phone — or add your own field. Phone fields use a searchable country selector.
          </p>
        </div>
      ) : null}

      {fields.length > 0 ? (
        <div className="hidden rounded-lg border border-border bg-[#FAFBFA] px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted xl:grid xl:grid-cols-[minmax(0,1.35fr)_150px_110px_minmax(0,1fr)_44px] xl:gap-3">
          <span>Label</span>
          <span>Type</span>
          <span>Required</span>
          <span>Placeholder / options</span>
          <span />
        </div>
      ) : null}

      {fields.map((field, index) => {
        const rowErrors = fieldErrors[index] ?? {};

        return (
        <div
          key={`${field.fieldKey || 'field'}-${index}`}
          className={cn(
            'grid gap-3 rounded-xl border bg-white p-4',
            rowErrors.label || rowErrors.options
              ? 'border-destructive/40 ring-1 ring-destructive/10'
              : 'border-border',
            'xl:grid-cols-[minmax(0,1.35fr)_150px_110px_minmax(0,1fr)_44px] xl:items-start',
          )}
        >
          <div className="space-y-2">
            <Input
              placeholder="Field label (e.g. Date of birth)"
              value={field.label}
              className={rowErrors.label ? 'border-destructive/60' : undefined}
              onChange={(event) =>
                updateField(index, {
                  label: event.target.value,
                  fieldKey: slugifyFieldKey(event.target.value),
                })
              }
            />
            <FieldError message={rowErrors.label} />
            <Input
              placeholder="Help text (optional)"
              value={field.helpText ?? ''}
              onChange={(event) => updateField(index, { helpText: event.target.value })}
              className="text-xs"
            />
          </div>

          <Select
            value={field.fieldType}
            onChange={(value) => updateField(index, { fieldType: value })}
            options={APPLICANT_FIELD_TYPES}
          />

          <label className="flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm">
            <input
              type="checkbox"
              checked={field.required !== false}
              onChange={(event) => updateField(index, { required: event.target.checked })}
            />
            Required
          </label>

          <div className="space-y-2">
            {field.fieldType === 'select' ? (
              <>
                <Input
                  placeholder="Options separated by commas"
                  value={(field.options ?? []).join(', ')}
                  className={rowErrors.options ? 'border-destructive/60' : undefined}
                  onChange={(event) =>
                    updateField(index, {
                      options: event.target.value
                        .split(',')
                        .map((item) => item.trim())
                        .filter(Boolean),
                    })
                  }
                />
                <FieldError message={rowErrors.options} />
              </>
            ) : (
              <Input
                placeholder="Placeholder shown to students"
                value={field.placeholder ?? ''}
                onChange={(event) => updateField(index, { placeholder: event.target.value })}
              />
            )}
          </div>

          <Button variant="ghost" size="sm" onClick={() => removeField(index)} className="xl:mt-0">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      );
      })}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => addField()}>
          <Plus className="h-4 w-4" />
          Add field
        </Button>
        {FIELD_PRESETS.map((preset) => (
          <Button
            key={preset.label}
            variant="outline"
            size="sm"
            onClick={() => addField(preset)}
          >
            + {preset.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
