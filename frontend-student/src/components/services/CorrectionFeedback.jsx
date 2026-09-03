import { getCorrectionFeedbackItems } from '@/utils/correctionFeedback';

const TONES = {
  danger: {
    box: 'border-[#FECACA] bg-[#FEF2F2]',
    title: 'text-[#991B1B]',
    item: 'border-[#FECACA] bg-white',
    itemTitle: 'text-[#7F1D1D]',
    itemDetail: 'text-[#7F1D1D]',
    footer: 'text-[#7F1D1D]',
  },
  muted: {
    box: 'border-[#D4E5D0] bg-[#F6FAF5]',
    title: 'text-[#052E1C]',
    item: 'border-[#E2EEE8] bg-white',
    itemTitle: 'text-[#052E1C]',
    itemDetail: 'text-[#334155]',
    footer: 'text-[#4B6358]',
  },
};

export function CorrectionFeedback({
  title = 'Correction requested',
  application,
  note,
  documents,
  tone = 'danger',
  compact = false,
}) {
  const items = getCorrectionFeedbackItems({
    correctionNote: note ?? application?.correctionNote,
    correctionRequiredDocuments: documents ?? application?.correctionRequiredDocuments,
    aiDecisions: application?.aiDecisions,
  });

  const summary = application?.aiDecisions?.[0]?.summary ?? '';

  if (!items.length && !summary) return null;

  const colors = TONES[tone] ?? TONES.danger;
  const namedItems = items.filter((item) => item.title);
  const showDocumentFooter =
    !namedItems.length && (documents ?? application?.correctionRequiredDocuments ?? []).length > 0;

  return (
    <div className={`rounded-xl border p-4 ${colors.box}`}>
      <p className={`text-sm font-semibold ${colors.title}`}>{title}</p>
      {!items.length && summary ? (
        <p className={`mt-2 text-sm leading-relaxed ${colors.itemDetail}`}>{summary}</p>
      ) : null}
      {items.length ? (
        <ul className={compact ? 'mt-2 space-y-1.5' : 'mt-3 space-y-2'}>
          {items.map((item, index) => (
            <li
              key={`${item.title}-${index}`}
              className={`rounded-lg border px-3 py-2 ${colors.item}`}
            >
              {item.title ? (
                <p className={`text-sm font-semibold ${colors.itemTitle}`}>{item.title}</p>
              ) : null}
              {item.detail ? (
                <p
                  className={`${item.title ? 'mt-1' : ''} text-sm leading-relaxed ${colors.itemDetail}`}
                >
                  {item.detail}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {showDocumentFooter ? (
        <p className={`mt-3 text-xs ${colors.footer}`}>
          Update: {(documents ?? application.correctionRequiredDocuments).join(', ')}
        </p>
      ) : null}
    </div>
  );
}
