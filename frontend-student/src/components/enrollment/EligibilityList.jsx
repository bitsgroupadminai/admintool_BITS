import { CheckCircle2 } from 'lucide-react';
import { formatEligibilityRule, groupEligibilityNotesByDocument, documentEligibilityKey } from '@/utils/eligibility';

export function EligibilityList({ rules, documents }) {
  const grouped = groupEligibilityNotesByDocument(documents ?? [], rules ?? []);
  const groups = (documents ?? [])
    .map((document) => ({
      key: documentEligibilityKey(document),
      name: document.name,
      notes: grouped.get(documentEligibilityKey(document)) ?? [],
    }))
    .filter((group) => group.notes.length);

  if (groups.length) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-[#4B6358]">Each document is checked against the criteria listed with it.</p>
        {groups.map((group) => (
          <div key={group.key}>
            <p className="text-sm font-semibold text-[#052E1C]">{group.name}</p>
            <ul className="mt-2 space-y-2">
              {group.notes.map((note) => (
                <li key={note} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0A6640]" />
                  <span className="text-sm leading-relaxed text-[#052E1C]">{note}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  }

  if (!rules?.length) {
    return <p className="text-sm text-[#4B6358]">Eligibility details will be shared soon.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-[#4B6358]">All of the following must be met to apply.</p>
      <ul className="space-y-3">
        {rules.map((rule) => (
          <li key={`${rule.field}-${rule.operator}-${rule.value}`} className="flex gap-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0A6640]" />
            <span className="text-sm leading-relaxed text-[#052E1C]">
              {formatEligibilityRule(rule)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
