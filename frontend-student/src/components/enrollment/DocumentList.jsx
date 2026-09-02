import { FileText } from 'lucide-react';
import { documentEligibilityKey, groupEligibilityNotesByDocument } from '@/utils/eligibility';

/**
 * @param {{ name: string, required?: boolean, allowedTypes?: string[], eligibilityNotes?: string[] }} doc
 */
function DocumentItem({ doc }) {
  const types = doc.allowedTypes?.length
    ? doc.allowedTypes.map((t) => t.toUpperCase()).join(', ')
    : null;
  const notes = doc.eligibilityNotes ?? [];

  return (
    <li className="flex gap-3">
      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[#0A6640]" />
      <div>
        <p className="text-sm font-medium text-[#052E1C]">{doc.name}</p>
        {notes.length > 0 ? (
          <ul className="mt-1 space-y-0.5">
            {notes.map((note) => (
              <li key={note} className="text-[11px] leading-snug text-[#4B6358]">
                {note}
              </li>
            ))}
          </ul>
        ) : null}
        {types && <p className="mt-0.5 text-xs text-[#4B6358]">Accepted: {types}</p>}
      </div>
    </li>
  );
}

export function DocumentList({ documents, eligibilityRules }) {
  if (!documents?.length) {
    return <p className="text-sm text-[#4B6358]">Document requirements will be shared soon.</p>;
  }

  const notesByKey = groupEligibilityNotesByDocument(documents, eligibilityRules);
  const required = documents.filter((d) => d.required !== false);
  const optional = documents.filter((d) => d.required === false);
  const withNotes = (doc) => ({
    ...doc,
    eligibilityNotes: notesByKey.get(documentEligibilityKey(doc)) ?? [],
  });

  return (
    <div className="space-y-5">
      {required.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#4B6358]">Required</p>
          <ul className="space-y-3">
            {required.map((doc) => (
              <DocumentItem key={doc.name} doc={withNotes(doc)} />
            ))}
          </ul>
        </div>
      )}
      {optional.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#4B6358]">Optional</p>
          <ul className="space-y-3">
            {optional.map((doc) => (
              <DocumentItem key={doc.name} doc={withNotes(doc)} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
