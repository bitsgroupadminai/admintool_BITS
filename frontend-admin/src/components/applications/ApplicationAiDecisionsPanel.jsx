import { Sparkles, AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const VERDICT_META = {
  pass: { label: 'Pass', variant: 'active', Icon: CheckCircle2 },
  fail: { label: 'Fail', variant: 'disabled', Icon: AlertCircle },
  uncertain: { label: 'Uncertain', variant: 'incomplete', Icon: HelpCircle },
};

const ACTION_LABELS = {
  approved: 'Auto-approved',
  returned_for_correction: 'Returned for correction',
  escalated: 'Escalated to staff',
  recommendation: 'Recommendation',
  failed: 'AI could not complete',
};

const HANDLER_LABELS = {
  document_verification: 'Document verification',
  eligibility_screening: 'Eligibility screening',
  intake_authorization: 'Intake authorization',
};

function formatConfidence(confidence) {
  if (confidence == null) return null;
  return `${Math.round(confidence * 100)}% confidence`;
}

function formatValue(value) {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function formatRequirement(result) {
  if (result?.requirement) return result.requirement;
  const expected = formatValue(result?.expected);
  const operator = result?.operator;
  if (operator === 'gte') return `at least ${expected}`;
  if (operator === 'lte') return `at most ${expected}`;
  if (operator === 'gt') return `more than ${expected}`;
  if (operator === 'lt') return `less than ${expected}`;
  if (operator === 'neq') return `other than ${expected}`;
  return expected;
}

function criterionStatusMeta(status) {
  if (status === 'failed') {
    return {
      label: 'Not met',
      className: 'border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]',
    };
  }
  if (status === 'passed') {
    return {
      label: 'Met',
      className: 'border-[#BBF7D0] bg-[#ECFDF5] text-[#065F46]',
    };
  }
  return {
    label: 'Could not confirm',
    className: 'border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]',
  };
}

function isEligibilityDocumentBreakdown(perDocument = []) {
  return perDocument.some(
    (doc) => (doc.extractedFields ?? []).length > 0 || doc.eligibilityResult,
  );
}

function EligibilityDocumentBreakdown({ documents = [] }) {
  return (
    <div className="mt-4 space-y-3">
      {documents.map((doc, index) => {
        const results = doc.eligibilityResult?.results ?? [];
        const fieldsByName = new Map(
          (doc.extractedFields ?? []).map((field) => [
            String(field.field ?? '')
              .trim()
              .toLowerCase(),
            field,
          ]),
        );
        return (
          <div
            key={`${doc.requirementName}-${index}`}
            className="rounded-xl border border-[#E2EEE8] bg-[#F9FCFB] p-4"
          >
            <p className="text-sm font-semibold text-[#052E1C]">
              {doc.requirementName || `Document ${index + 1}`}
            </p>
            {results.length ? (
              <ul className="mt-3 space-y-2">
                {results.map((result, resultIndex) => {
                  const status = criterionStatusMeta(result.status);
                  const extracted =
                    fieldsByName.get(String(result.field ?? '').trim().toLowerCase()) ??
                    { value: result.actual, documentExcerpt: '' };
                  return (
                    <li
                      key={`${result.field}-${resultIndex}`}
                      className={`rounded-lg border px-3 py-2 text-xs leading-relaxed ${status.className}`}
                    >
                      <p className="font-semibold text-[11px] uppercase tracking-wide">
                        {result.field}
                      </p>
                      <dl className="mt-1.5 space-y-1 text-[12px]">
                        <div>
                          <dt className="inline font-semibold">Extracted value: </dt>
                          <dd className="inline">{formatValue(extracted.value ?? result.actual)}</dd>
                        </div>
                        <div>
                          <dt className="inline font-semibold">Minimum criterion: </dt>
                          <dd className="inline">{formatRequirement(result)}</dd>
                        </div>
                        <div>
                          <dt className="inline font-semibold">Result: </dt>
                          <dd className="inline">{status.label}</dd>
                        </div>
                      </dl>
                      {extracted.documentExcerpt ? (
                        <p className="mt-1.5 italic opacity-80">“{extracted.documentExcerpt}”</p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : (doc.extractedFields ?? []).length > 0 ? (
              <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                {doc.extractedFields.map((field, fieldIndex) => (
                  <div key={fieldIndex} className="rounded-lg border border-[#E2EEE8] bg-white px-3 py-2 text-xs">
                    <dt className="font-semibold uppercase tracking-wide text-[#6B7280]">{field.field}</dt>
                    <dd className="mt-0.5 font-medium text-[#052E1C]">{formatValue(field.value)}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-2 text-xs text-[#4B6358]">No values were extracted from this document.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ApplicationAiDecisionsPanel({ decisions = [] }) {
  if (!decisions.length) return null;

  return (
    <section className="mt-8 rounded-2xl border border-[#D4E5D0] bg-[#F6FAF5] p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-[#10B981]" />
        <h2 className="text-lg font-bold text-[#052E1C]">AI verification</h2>
      </div>
      <p className="mt-1 text-sm text-[#4B6358]">
        Automated checks the AI performed on this request. Staff decisions always override these.
      </p>

      <div className="mt-5 space-y-4">
        {decisions.map((decision) => {
          const verdict = VERDICT_META[decision.verdict] ?? VERDICT_META.uncertain;
          const VerdictIcon = verdict.Icon;
          return (
            <div
              key={decision.id}
              className="rounded-xl border border-[#D4E5D0] bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#052E1C]">
                    {decision.stepName || HANDLER_LABELS[decision.handler] || 'AI check'}
                  </p>
                  <p className="mt-0.5 text-xs text-[#4B6358]">
                    {HANDLER_LABELS[decision.handler] ?? decision.handler}
                    {decision.createdAt
                      ? ` · ${new Date(decision.createdAt).toLocaleString()}`
                      : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={verdict.variant}>
                    <VerdictIcon className="mr-1 h-3.5 w-3.5" />
                    {verdict.label}
                  </Badge>
                  <span className="rounded-full bg-[#F0FAF5] px-3 py-1 text-xs font-semibold text-[#0A6640]">
                    {ACTION_LABELS[decision.action] ?? decision.action}
                  </span>
                  {formatConfidence(decision.confidence) ? (
                    <span className="text-xs font-medium text-[#4B6358]">
                      {formatConfidence(decision.confidence)}
                    </span>
                  ) : null}
                </div>
              </div>

              {decision.summary ? (
                <p className="mt-3 text-sm text-[#334155]">{decision.summary}</p>
              ) : null}

              {(decision.issues ?? []).length > 0 ? (
                <div className="mt-3 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] p-3">
                  <p className="text-xs font-bold text-[#92400E]">Issues flagged</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-[#92400E]">
                    {decision.issues.map((issue, index) => (
                      <li key={index}>{issue}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {isEligibilityDocumentBreakdown(decision.perDocument) ? (
                <EligibilityDocumentBreakdown documents={decision.perDocument} />
              ) : (
                <>
                  {(decision.perDocument ?? []).length > 0 ? (
                    <div className="mt-3">
                      <p className="text-xs font-bold text-[#052E1C]">Per-document findings</p>
                      <ul className="mt-2 space-y-1.5">
                        {decision.perDocument.map((doc, index) => {
                          const docVerdict = VERDICT_META[doc.verdict] ?? VERDICT_META.uncertain;
                          return (
                            <li
                              key={index}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#F9FCFB] px-3 py-2 text-xs text-[#4B6358]"
                            >
                              <span className="font-medium text-[#052E1C]">
                                {doc.requirementName ?? `Document ${index + 1}`}
                              </span>
                              <span className="flex max-w-[70%] flex-col items-end gap-1 text-right">
                                {doc.observedContent ? (
                                  <span className="text-[#334155]">Shows: {doc.observedContent}</span>
                                ) : null}
                                {doc.issue ? <span className="text-[#92400E]">{doc.issue}</span> : null}
                                <Badge variant={docVerdict.variant}>{docVerdict.label}</Badge>
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : null}

                  {(decision.eligibilityResult?.results ?? []).length > 0 ? (
                    <div className="mt-3">
                      <p className="text-xs font-bold text-[#052E1C]">Eligibility criteria</p>
                      <ul className="mt-2 space-y-1.5">
                        {decision.eligibilityResult.results.map((result, index) => {
                          const status = criterionStatusMeta(result.status);
                          return (
                            <li
                              key={`${result.field}-${index}`}
                              className={`rounded-lg border px-3 py-2 text-xs leading-relaxed ${status.className}`}
                            >
                              <p className="font-semibold">{result.field}</p>
                              <p className="mt-1">
                                Extracted value: {formatValue(result.actual)} · Minimum criterion:{' '}
                                {formatRequirement(result)} · {status.label}
                              </p>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : null}

                  {(decision.extractedFields ?? []).length > 0 ? (
                    <div className="mt-3">
                      <p className="text-xs font-bold text-[#052E1C]">Extracted values</p>
                      <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                        {decision.extractedFields.map((field, index) => (
                          <div
                            key={index}
                            className="rounded-lg border border-[#E2EEE8] bg-white px-3 py-2 text-xs"
                          >
                            <dt className="font-semibold uppercase tracking-wide text-[#6B7280]">
                              {field.field}
                            </dt>
                            <dd className="mt-0.5 font-medium text-[#052E1C]">
                              {formatValue(field.value)}
                            </dd>
                            {field.documentExcerpt ? (
                              <dd className="mt-1 italic text-[#4B6358]">“{field.documentExcerpt}”</dd>
                            ) : null}
                          </div>
                        ))}
                      </dl>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
