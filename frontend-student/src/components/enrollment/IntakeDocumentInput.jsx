import { useRef } from 'react';
import { FileUp, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { buildAcceptAttribute, validateFileForRequirement } from '@/utils/applicationDocuments';

const inputClassName =
  'h-11 w-full rounded-xl border border-[#C4E8D4] bg-[#F0FAF5] px-4 text-sm text-[#052E1C] outline-none transition focus:border-[#6EE7B7] focus:bg-white';

/**
 * @param {{
 *   intakeDocument: {
 *     label: string;
 *     helpText?: string;
 *     required?: boolean;
 *     allowedTypes?: string[];
 *     maxSizeMb?: number;
 *   };
 *   file: File | null;
 *   onChange: (file: File | null) => void;
 * }} props
 */
export function IntakeDocumentInput({ intakeDocument, file, onChange }) {
  const inputRef = useRef(null);

  if (!intakeDocument?.label) {
    return null;
  }

  const handleChoose = () => {
    inputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const nextFile = event.target.files?.[0] ?? null;
    event.target.value = '';

    if (!nextFile) {
      return;
    }

    const validationError = validateFileForRequirement(nextFile, {
      name: intakeDocument.label,
      allowedTypes: intakeDocument.allowedTypes,
      maxSizeMb: intakeDocument.maxSizeMb,
    });

    if (validationError) {
      toast.error(validationError);
      return;
    }

    onChange(nextFile);
  };

  return (
    <div>
      <label htmlFor="intake-document" className="mb-1.5 block text-sm font-medium text-[#052E1C]">
        {intakeDocument.label}
        {intakeDocument.required !== false ? <span className="text-[#B91C1C]"> *</span> : null}
      </label>

      <div className="rounded-xl border border-[#E2EEE8] bg-[#F9FCFB] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <FileUp className="h-4 w-4 shrink-0 text-[#0A6640]" />
              <p className="text-sm font-semibold text-[#052E1C]">Upload document</p>
            </div>
            <p className="mt-1 text-xs text-[#4B6358]">
              Accepted: {(intakeDocument.allowedTypes ?? ['pdf']).map((type) => type.toUpperCase()).join(', ')}
              {' · '}
              Max {intakeDocument.maxSizeMb ?? 5} MB
            </p>
            {file ? (
              <p className="mt-2 text-xs font-medium text-[#0A6640]">Selected: {file.name}</p>
            ) : (
              <p className="mt-2 text-xs text-[#92400E]">No file selected yet</p>
            )}
          </div>

          <button
            type="button"
            onClick={handleChoose}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#C4E8D4] bg-[#F0FAF5] px-3 text-xs font-semibold text-[#0A6640] hover:bg-[#E3F5EC]"
          >
            <UploadCloud className="h-3.5 w-3.5" />
            {file ? 'Replace file' : 'Choose file'}
          </button>
        </div>
      </div>

      {intakeDocument.helpText ? (
        <p className="mt-1 text-xs text-[#6B7280]">{intakeDocument.helpText}</p>
      ) : null}

      <input
        ref={inputRef}
        id="intake-document"
        type="file"
        className="hidden"
        accept={buildAcceptAttribute(intakeDocument.allowedTypes)}
        onChange={handleFileChange}
        required={intakeDocument.required !== false}
      />
    </div>
  );
}
