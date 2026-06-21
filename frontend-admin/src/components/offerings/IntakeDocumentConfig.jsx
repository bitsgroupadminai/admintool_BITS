import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/ui/field-error';

const FILE_TYPES = [
  { value: 'pdf', label: 'PDF' },
  { value: 'jpg', label: 'JPG' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'png', label: 'PNG' },
];

const DEFAULT_CONFIG = {
  enabled: false,
  label: '',
  helpText: '',
  required: true,
  allowedTypes: ['pdf', 'jpg', 'jpeg', 'png'],
  maxSizeMb: 5,
};

/**
 * @param {{
 *   value?: {
 *     enabled?: boolean;
 *     label?: string;
 *     helpText?: string;
 *     required?: boolean;
 *     allowedTypes?: string[];
 *     maxSizeMb?: number;
 *   };
 *   onChange: (value: typeof DEFAULT_CONFIG) => void;
 *   error?: string;
 * }} props
 */
export function IntakeDocumentConfig({ value = DEFAULT_CONFIG, onChange, error }) {
  const config = { ...DEFAULT_CONFIG, ...value };

  const update = (patch) => onChange({ ...config, ...patch });

  const toggleType = (type) => {
    const current = config.allowedTypes ?? [];
    const next = current.includes(type)
      ? current.filter((item) => item !== type)
      : [...current, type];
    update({ allowedTypes: next.length ? next : ['pdf'] });
  };

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm font-medium text-forest">
        <input
          type="checkbox"
          checked={config.enabled}
          onChange={(event) =>
            update({
              enabled: event.target.checked,
              label: event.target.checked && !config.label ? 'Identification document' : config.label,
            })
          }
          className="h-4 w-4 rounded border-border"
        />
        Ask for an identification document when students start their application
      </label>

      {config.enabled ? (
        <div className="space-y-4 rounded-xl border border-border bg-white p-4">
          <p className="text-xs text-muted">
            Configure what each institute needs to verify applicants — for example, a rank card at
            BITS or an admission letter at Amity.
          </p>

          <div className="space-y-2">
            <Label htmlFor="intake-document-label">Document name</Label>
            <Input
              id="intake-document-label"
              value={config.label}
              placeholder="e.g. Rank card, Admission letter, Government ID"
              className={error ? 'border-destructive/60' : undefined}
              onChange={(event) => update({ label: event.target.value })}
            />
            <FieldError message={error} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="intake-document-help">Help text (optional)</Label>
            <Input
              id="intake-document-help"
              value={config.helpText}
              placeholder="Upload a clear scan or photo of your rank card"
              onChange={(event) => update({ helpText: event.target.value })}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={config.required !== false}
              onChange={(event) => update({ required: event.target.checked })}
            />
            Required before submission
          </label>

          <div className="space-y-2">
            <Label>Accepted file types</Label>
            <div className="flex flex-wrap gap-2">
              {FILE_TYPES.map((type) => (
                <label
                  key={type.value}
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium"
                >
                  <input
                    type="checkbox"
                    checked={(config.allowedTypes ?? []).includes(type.value)}
                    onChange={() => toggleType(type.value)}
                  />
                  {type.label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="intake-document-size">Max file size (MB)</Label>
            <Input
              id="intake-document-size"
              type="number"
              min="1"
              max="25"
              value={config.maxSizeMb}
              onChange={(event) => update({ maxSizeMb: Number(event.target.value) || 5 })}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function intakeDocumentFromOffering(offering) {
  if (!offering?.intakeDocument?.label) {
    return { ...DEFAULT_CONFIG };
  }

  return {
    enabled: true,
    label: offering.intakeDocument.label,
    helpText: offering.intakeDocument.helpText ?? '',
    required: offering.intakeDocument.required !== false,
    allowedTypes: offering.intakeDocument.allowedTypes ?? ['pdf', 'jpg', 'jpeg', 'png'],
    maxSizeMb: offering.intakeDocument.maxSizeMb ?? 5,
  };
}

export function intakeDocumentToPayload(config) {
  if (!config.enabled || !config.label?.trim()) {
    return null;
  }

  return {
    label: config.label.trim(),
    helpText: config.helpText?.trim() ?? '',
    required: config.required !== false,
    allowedTypes: config.allowedTypes?.length ? config.allowedTypes : ['pdf'],
    maxSizeMb: config.maxSizeMb ?? 5,
  };
}
