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

function isNonAcademicDocumentName(name) {
  const text = String(name ?? '').toLowerCase();
  return (
    /photo|photograph|signature|aadhaar|aadhar|id proof|passport-size|identity/.test(text) &&
    !/marksheet|scorecard|bitsat/.test(text)
  );
}

function academicEligibilityDocuments(documents = []) {
  return documents.filter((doc) => {
    if (isNonAcademicDocumentName(doc.requirementName)) return false;
    const results = (doc.eligibilityResult?.results ?? []).filter(
      (result) => result.status !== 'not_applicable',
    );
    return (
      results.length > 0 ||
      (doc.subjects ?? []).length > 0 ||
      doc.aggregate != null ||
      doc.examScore != null ||
      (doc.extractedFields ?? []).length > 0
    );
  });
}

function documentVerdictMeta(doc) {
  const status =
    doc.verdict ||
    (doc.eligibilityResult?.results ?? []).reduce((current, result) => {
      if (result.status === 'not_applicable') return current;
      if (result.status === 'failed' || current === 'failed') return 'failed';
      if (result.status === 'unchecked' || current === 'unchecked') return 'unchecked';
      return 'passed';
    }, '');
  if (status === 'failed') return { ...criterionStatusMeta('failed'), label: 'Not eligible' };
  if (status === 'passed') return { ...criterionStatusMeta('passed'), label: 'Eligible' };
  if (status === 'not_applicable') return { ...criterionStatusMeta('unchecked'), label: 'Not used' };
  return { ...criterionStatusMeta('unchecked'), label: 'Incomplete' };
}

function overallEligibilityMeta(decision) {
  const evaluation = decision.eligibilityResult;
  if (evaluation && evaluation.eligible === false) {
    return { ...criterionStatusMeta('failed'), label: 'Not eligible' };
  }
  if ((evaluation?.results ?? []).some((result) => result.status === 'unchecked')) {
    return { ...criterionStatusMeta('unchecked'), label: 'Needs review' };
  }
  if (evaluation?.eligible) {
    return { ...criterionStatusMeta('passed'), label: 'Eligible' };
  }
  const fallback = criterionStatusMeta(
    decision.verdict === 'fail' ? 'failed' : decision.verdict === 'pass' ? 'passed' : 'unchecked',
  );
  return {
    ...fallback,
    label:
      decision.verdict === 'fail'
        ? 'Not eligible'
        : decision.verdict === 'pass'
          ? 'Eligible'
          : 'Needs review',
  };
}

function uniqueSubjectRows(subjects = [], scoreChecks = []) {
  const checksByName = new Map(
    scoreChecks.map((item) => [String(item.name ?? '').trim().toLowerCase(), item]),
  );
  const seen = new Set();
  const source = subjects.length
    ? subjects
    : scoreChecks.map((item) => ({ name: item.name, score: item.score, grade: item.grade }));
  const rows = [];
  for (const subject of source) {
    const key = String(subject.name ?? '')
      .trim()
      .toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const check = checksByName.get(key);
    rows.push({
      name: subject.name,
      score: subject.score ?? check?.score,
      grade: subject.grade ?? check?.grade,
      required: check?.required,
      status: check?.status,
    });
  }
  return rows;
}

function documentLevelFacts(doc) {
  const results = doc.eligibilityResult?.results ?? [];
  const byField = (name) =>
    results.find((result) => String(result.field ?? '').toLowerCase().includes(name));
  return {
    qualification: doc.qualification || byField('qualification')?.actual || '',
    aggregate: doc.aggregate ?? byField('aggregate')?.actual ?? null,
    examScore: doc.examScore ?? byField('bitsat')?.actual ?? byField('exam')?.actual ?? null,
    qualificationStatus: byField('qualification')?.status,
    aggregateStatus: byField('aggregate')?.status,
  };
}

function SubjectScoreTable({ subjects = [], scoreChecks = [] }) {
  const rows = uniqueSubjectRows(subjects, scoreChecks);
  if (!rows.length) {
    return (
      <p className="text-xs text-[#92400E]">No subject scores were extracted from this document.</p>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border border-[#E2EEE8] bg-white">
      <table className="w-full text-left text-xs">
        <thead className="bg-[#F1F5F4] text-[11px] uppercase tracking-wide text-[#4B6358]">
          <tr>
            <th className="px-3 py-2 font-semibold">Subject</th>
            <th className="px-3 py-2 font-semibold">Required</th>
            <th className="px-3 py-2 font-semibold">Score</th>
            <th className="px-3 py-2 font-semibold">Grade</th>
            <th className="px-3 py-2 font-semibold">Result</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const status = row.status ? criterionStatusMeta(row.status) : criterionStatusMeta('unchecked');
            const resultLabel =
              row.score == null && !row.status
                ? 'Could not confirm'
                : status.label;
            return (
              <tr key={row.name} className="border-t border-[#E2EEE8]">
                <td className="px-3 py-2 font-medium text-[#052E1C]">{row.name}</td>
                <td className="px-3 py-2 text-[#334155]">
                  {row.required != null ? `at least ${row.required}` : '—'}
                </td>
                <td className="px-3 py-2 text-[#334155]">{formatValue(row.score)}</td>
                <td className="px-3 py-2 text-[#334155]">{formatValue(row.grade)}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${status.className}`}>
                    {resultLabel}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EligibilityScreeningView({ decision }) {
  const documents = academicEligibilityDocuments(decision.perDocument);
  const overall = overallEligibilityMeta(decision);

  return (
    <div className="mt-4 space-y-4">
      <div className={`rounded-xl border px-4 py-3 ${overall.className}`}>
        <p className="text-[11px] font-semibold uppercase tracking-wide">Overall eligibility</p>
        <p className="mt-1 text-sm font-semibold">{overall.label}</p>
        {documents.length ? (
          <ul className="mt-3 space-y-1.5">
            {documents.map((doc, index) => {
              const verdict = documentVerdictMeta(doc);
              const facts = documentLevelFacts(doc);
              return (
                <li
                  key={`${doc.requirementName}-${index}`}
                  className="flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <span className="font-medium">{doc.requirementName || `Document ${index + 1}`}</span>
                  <span className="flex flex-wrap items-center gap-2">
                    {facts.qualification ? <span className="opacity-80">{facts.qualification}</span> : null}
                    {facts.aggregate != null ? <span className="opacity-80">Aggregate {facts.aggregate}</span> : null}
                    {facts.examScore != null ? <span className="opacity-80">Score {facts.examScore}</span> : null}
                    <span className={`rounded-full border px-2 py-0.5 font-semibold ${verdict.className}`}>
                      {verdict.label}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      {documents.map((doc, index) => {
        const verdict = documentVerdictMeta(doc);
        const facts = documentLevelFacts(doc);
        const checks = (doc.eligibilityResult?.results ?? []).flatMap(
          (result) => result.scoreChecks ?? [],
        );
        return (
          <div
            key={`${doc.requirementName}-detail-${index}`}
            className="rounded-xl border border-[#E2EEE8] bg-[#F9FCFB] p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-[#052E1C]">
                  {doc.requirementName || `Document ${index + 1}`}
                </p>
                <p className="mt-1 text-xs text-[#4B6358]">
                  {[
                    facts.qualification || null,
                    facts.aggregate != null ? `Aggregate ${facts.aggregate}` : null,
                    facts.examScore != null ? `Exam score ${facts.examScore}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'Subject-wise breakdown'}
                </p>
              </div>
              <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${verdict.className}`}>
                {verdict.label}
              </span>
            </div>
            <div className="mt-3">
              <SubjectScoreTable subjects={doc.subjects ?? []} scoreChecks={checks} />
            </div>
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
          const isEligibility = decision.handler === 'eligibility_screening';
          const verdict = VERDICT_META[decision.verdict] ?? VERDICT_META.uncertain;
          const VerdictIcon = verdict.Icon;
          const overall = isEligibility ? overallEligibilityMeta(decision) : null;
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
                  {overall ? (
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${overall.className}`}>
                      {overall.label}
                    </span>
                  ) : (
                    <Badge variant={verdict.variant}>
                      <VerdictIcon className="mr-1 h-3.5 w-3.5" />
                      {verdict.label}
                    </Badge>
                  )}
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

              {decision.handler === 'eligibility_screening' ? (
                <EligibilityScreeningView decision={decision} />
              ) : (
                <>
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
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
