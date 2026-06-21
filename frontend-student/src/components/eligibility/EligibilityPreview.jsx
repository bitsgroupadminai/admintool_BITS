import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';
import { studentApi } from '@/api/student.api';

const STATUS_ICON = {
  passed: CheckCircle2,
  failed: AlertCircle,
  unchecked: HelpCircle,
};

const STATUS_TONE = {
  passed: 'text-[#0A6640] bg-[#F0FAF5] border-[#C4E8D4]',
  failed: 'text-[#B91C1C] bg-[#FEF2F2] border-[#FECACA]',
  unchecked: 'text-[#92400E] bg-[#FFFBEB] border-[#FDE68A]',
};

/**
 * @param {Object} props
 * @param {string} props.offeringId
 */
export function EligibilityPreview({ offeringId }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!offeringId) return;
    studentApi
      .previewEligibility(offeringId)
      .then(({ data }) => setPreview(data.data))
      .catch(() => setPreview(null))
      .finally(() => setLoading(false));
  }, [offeringId]);

  if (loading) {
    return <p className="text-sm text-[#4B6358]">Checking eligibility...</p>;
  }

  if (!preview) return null;

  return (
    <div className="rounded-2xl border border-[#E2EEE8] bg-white p-5 shadow-sm">
      <h3 className="text-sm font-bold text-[#052E1C]">Eligibility check</h3>
      <p
        className={`mt-2 rounded-lg border px-3 py-2 text-sm font-semibold ${
          preview.eligible
            ? preview.needsReview
              ? 'border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]'
              : 'border-[#C4E8D4] bg-[#F0FAF5] text-[#0A6640]'
            : 'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]'
        }`}
      >
        {preview.message}
      </p>
      {preview.needsReview && (
        <p className="mt-2 text-xs text-[#92400E]">
          Some requirements need institute review — you may still apply, but staff will verify.
        </p>
      )}
      {preview.results?.length > 0 && (
        <ul className="mt-4 space-y-2">
          {preview.results.map((result) => {
            const Icon = STATUS_ICON[result.status] ?? HelpCircle;
            return (
              <li
                key={result.field}
                className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${STATUS_TONE[result.status] ?? STATUS_TONE.unchecked}`}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-semibold">{result.field}</p>
                  <p className="text-xs opacity-90">{result.message}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
