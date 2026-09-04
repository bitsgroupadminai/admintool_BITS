import { rulesFromDocumentEligibility } from '@/utils/documentEligibility';

const OPERATOR_LABELS = {
  eq: 'must be',
  neq: 'must not be',
  gte: 'at least',
  lte: 'at most',
  gt: 'more than',
  lt: 'less than',
};

function formatRuleValue(value, fieldType) {
  if (fieldType === 'boolean') return value ? 'Yes' : 'No';
  if (fieldType === 'numeric' && typeof value === 'number') return String(value);
  return String(value ?? '');
}

export function formatEligibilityRule(rule) {
  const field = rule.field?.trim() ?? 'Requirement';
  const operator = OPERATOR_LABELS[rule.operator] ?? rule.operator;
  const value = formatRuleValue(rule.value, rule.fieldType);
  if (rule.operator === 'eq' && rule.fieldType === 'text') return `${field}: ${value}`;
  if (rule.fieldType === 'numeric') return `${field}: ${operator} ${value}`;
  return `${field} ${operator} ${value}`;
}

export function isAcademicDocumentName(name) {
  const text = String(name ?? '').toLowerCase();
  if (/photo|photograph|signature|aadhaar|aadhar|id proof|passport-size|identity/.test(text)) {
    return !/marksheet|scorecard|bitsat/.test(text) ? false : true;
  }
  return /marksheet|scorecard|bitsat|class\s*10|class\s*12|10th|12th|10\s*\+\s*2|certificate|senior secondary/.test(
    text,
  );
}

export function displayEligibilityVerdict(finding) {
  const verdict = finding?.eligibilityVerdict || finding?.verdict;
  if (verdict === 'eligible' || verdict === 'pass') return 'eligible';
  if (verdict === 'ineligible' || verdict === 'fail' || verdict === 'uncertain') return 'ineligible';
  return null;
}

const VERDICT_META = {
  eligible: { label: 'Eligible', className: 'border-[#BBF7D0] bg-[#ECFDF5] text-[#0A6640]' },
  ineligible: { label: 'Ineligible', className: 'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]' },
};

function criterionStatusMeta(status) {
  if (status === 'failed') {
    return { label: 'Not met', className: 'border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]' };
  }
  if (status === 'passed') {
    return { label: 'Met', className: 'border-[#BBF7D0] bg-[#ECFDF5] text-[#065F46]' };
  }
  if (status === 'not_applicable') {
    return { label: 'Not used', className: 'border-[#E2EEE8] bg-[#F9FCFB] text-[#4B6358]' };
  }
  return { label: 'Could not confirm', className: 'border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]' };
}

function formatValue(value) {
  if (value == null || value === '') return '—';
  return String(value);
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
            const status = criterionStatusMeta(row.status);
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
                    {row.score == null && !row.status ? 'Could not confirm' : status.label}
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

export function DocumentEligibilityDetails({ requirement, finding, eligibilityRules = [] }) {
  const documentRules = rulesFromDocumentEligibility(requirement?.eligibility);
  const configuredRules = documentRules.length ? documentRules : eligibilityRules;
  const usesEligibility =
    requirement?.eligibility?.enabled === true ||
    (requirement?.eligibility?.enabled !== false &&
      (documentRules.length > 0 || isAcademicDocumentName(requirement.name)));
  const results = finding?.eligibilityResult?.results ?? [];
  const applicableResults = results.filter((result) => result.status !== 'not_applicable');
  const scoreChecks = results.flatMap((result) => result.scoreChecks ?? []);
  const facts = [
    finding?.qualification || null,
    finding?.aggregate != null ? `Aggregate ${finding.aggregate}` : null,
    finding?.examScore != null ? `Exam score ${finding.examScore}` : null,
  ].filter(Boolean);

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-[#052E1C]">
          Eligibility requirement
        </p>
        {!usesEligibility ? (
          <p className="mt-1 text-xs leading-relaxed text-[#4B6358]">
            This file is not used for academic eligibility. The verdict is based on whether the
            upload is the required document and belongs to the applicant.
          </p>
        ) : applicableResults.length ? (
          <ul className="mt-2 space-y-1.5">
            {applicableResults.map((result, index) => {
              const status = criterionStatusMeta(result.status);
              return (
                <li
                  key={`${result.field}-${index}`}
                  className="flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <span className="text-[#334155]">
                    {result.field}: {result.requirement ?? result.expected ?? '—'}
                    {result.actual != null && result.actual !== '' ? ` · found ${result.actual}` : ''}
                  </span>
                  <span className={`rounded-full border px-2 py-0.5 font-semibold ${status.className}`}>
                    {status.label}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : configuredRules.length ? (
          <ul className="mt-2 space-y-1">
            {configuredRules.map((rule, index) => (
              <li key={`${rule.field}-${index}`} className="text-xs text-[#4B6358]">
                {formatEligibilityRule(rule)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-xs text-[#4B6358]">No eligibility rules are configured.</p>
        )}
      </div>

      {facts.length ? <p className="text-xs text-[#4B6358]">{facts.join(' · ')}</p> : null}

      {usesEligibility ? (
        <SubjectScoreTable subjects={finding?.subjects ?? []} scoreChecks={scoreChecks} />
      ) : null}
    </div>
  );
}

export function eligibilityBadgeMeta(verdict) {
  return VERDICT_META[verdict] ?? null;
}
