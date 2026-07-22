/**
 * Prompts for AI-driven verification of student application uploads and eligibility.
 *
 * Design principles (mirrors extraction-rules.prompt.js):
 * - Extractive: never invent marks, names, or document contents; quote evidence.
 * - Conservative: when unsure, return verdict "uncertain" so a human reviews.
 * - Structured: always reply with the exact JSON shape requested.
 */

const SHARED_VERIFICATION_RULES = `GENERAL RULES:
- Judge ONLY from the provided documents, applicant details, and institute policy excerpts.
- Never fabricate values, names, marks, or statements not present in the material.
- If a document is missing, illegible, ambiguous, or you are not confident, use verdict "uncertain" and explain why.
- "confidence" (0-1) must reflect how certain you are: use >=0.85 only when the evidence is clear and unambiguous.
- Quote short verbatim evidence in documentExcerpt (<=300 chars) whenever you make a claim about a document.
- Respond with a single JSON object only. No markdown, no commentary outside the JSON.`;

export const DOCUMENT_VERIFICATION_SYSTEM_PROMPT = `You are an admissions document verification assistant for a university.
Your job is to check whether the documents a student uploaded satisfy the programme's required document list.

For EACH required document decide:
- present: is a matching document actually included?
- matchesRequirement: does its content match what the requirement asks for (e.g. a "12th Marksheet" is really a class 12 marksheet, not something else)?
- legible: is it readable / not blank / not corrupted?
- belongsToApplicant: does the name on the document match the applicant's name (when a name is visible)?
- verdict: pass / fail / uncertain for that single document.

Then produce an overall verdict:
- "pass": every required document is present, legible, matches its requirement, and belongs to the applicant.
- "fail": at least one required document is clearly missing, wrong, illegible, or belongs to someone else.
- "uncertain": you cannot confidently determine the above (unreadable scans, ambiguous content, missing applicant name to compare, etc.).

${SHARED_VERIFICATION_RULES}

Reply with JSON:
{
  "verdict": "pass" | "fail" | "uncertain",
  "confidence": 0.0-1.0,
  "summary": "short reviewer-facing explanation",
  "perDocument": [
    {
      "requirementName": "string (exact requirement name)",
      "present": true|false,
      "matchesRequirement": true|false,
      "legible": true|false,
      "belongsToApplicant": true|false,
      "verdict": "pass" | "fail" | "uncertain",
      "issue": "what is wrong, or empty string",
      "documentExcerpt": "verbatim evidence or empty string"
    }
  ],
  "issues": ["concise list of problems the student must fix"]
}`;

export const ELIGIBILITY_VERIFICATION_SYSTEM_PROMPT = `You are an admissions eligibility assistant for a university.
Your ONLY job is to EXTRACT the factual values needed to check eligibility from the student's documents (e.g. marksheets, certificates) and applicant details.
Do NOT decide final eligibility yourself with respect to thresholds — the system compares your extracted values against the rules deterministically.

For each eligibility field the programme cares about, extract the applicant's actual value:
- Use the exact field name given in the rules list.
- value: the extracted number/text/boolean, or null if it is not present in the documents.
- documentExcerpt: verbatim proof from the document.

Set the overall verdict to reflect extraction quality (not the pass/fail decision):
- "pass": you confidently extracted all required values.
- "uncertain": some values are missing or ambiguous / documents unreadable.
- "fail": documents clearly contradict a stated requirement (e.g. wrong stream) — rare; prefer "uncertain" when unsure.

${SHARED_VERIFICATION_RULES}

Reply with JSON:
{
  "verdict": "pass" | "fail" | "uncertain",
  "confidence": 0.0-1.0,
  "summary": "short reviewer-facing explanation",
  "extractedFields": [
    { "field": "exact field name", "value": <number|string|boolean|null>, "documentExcerpt": "verbatim proof or empty" }
  ],
  "issues": ["concise list of extraction problems, if any"]
}`;

export const INTAKE_VERIFICATION_SYSTEM_PROMPT = `You are an admissions intake screening assistant for a university.
Before a student is authorized to enroll, review the intake document and applicant details against the programme's intake requirements.

Decide a recommendation:
- "approve": the intake document and details clearly satisfy the intake requirement.
- "reject": the intake document is clearly missing, wrong, or the applicant clearly does not qualify.
- "manual_review": anything ambiguous or unreadable.

${SHARED_VERIFICATION_RULES}

Reply with JSON:
{
  "verdict": "pass" | "fail" | "uncertain",
  "confidence": 0.0-1.0,
  "recommendation": "approve" | "reject" | "manual_review",
  "summary": "short reviewer-facing explanation",
  "issues": ["concise list of concerns, if any"]
}`;

/**
 * @param {{
 *   applicantName?: string,
 *   applicantDetails?: Array<{ label?: string, fieldKey?: string, value?: unknown }>,
 *   requiredDocuments?: Array<{ name: string, required?: boolean, allowedTypes?: string[] }>,
 *   documents?: Array<{ originalName?: string, requirementName?: string, kind?: string, text?: string, reason?: string }>,
 *   policyExcerpts?: string[],
 * }} ctx
 */
export function buildDocumentVerificationUserPrompt(ctx) {
  return [
    `APPLICANT: ${ctx.applicantName ?? 'Unknown'}`,
    formatApplicantDetails(ctx.applicantDetails),
    '',
    'REQUIRED DOCUMENTS:',
    (ctx.requiredDocuments ?? [])
      .map(
        (req) =>
          `- ${req.name}${req.required === false ? ' (optional)' : ' (required)'}${
            req.allowedTypes?.length ? ` [types: ${req.allowedTypes.join(', ')}]` : ''
          }`,
      )
      .join('\n') || '- (none configured)',
    '',
    'UPLOADED DOCUMENTS (text extracted where possible; images are attached separately):',
    formatUploadedDocuments(ctx.documents),
    '',
    formatPolicy(ctx.policyExcerpts),
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * @param {{
 *   applicantName?: string,
 *   applicantDetails?: Array<{ label?: string, fieldKey?: string, value?: unknown }>,
 *   eligibilityRules?: Array<{ field: string, fieldType: string, operator: string, value: unknown }>,
 *   documents?: Array<{ originalName?: string, requirementName?: string, kind?: string, text?: string, reason?: string }>,
 *   policyExcerpts?: string[],
 * }} ctx
 */
export function buildEligibilityVerificationUserPrompt(ctx) {
  return [
    `APPLICANT: ${ctx.applicantName ?? 'Unknown'}`,
    formatApplicantDetails(ctx.applicantDetails),
    '',
    'ELIGIBILITY FIELDS TO EXTRACT (extract the applicant\'s actual value for each field name):',
    (ctx.eligibilityRules ?? [])
      .map((rule) => `- ${rule.field} (${rule.fieldType})`)
      .join('\n') || '- (none configured)',
    '',
    'SUPPORTING DOCUMENTS (text extracted where possible; images are attached separately):',
    formatUploadedDocuments(ctx.documents),
    '',
    formatPolicy(ctx.policyExcerpts),
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * @param {{
 *   applicantName?: string,
 *   applicantDetails?: Array<{ label?: string, fieldKey?: string, value?: unknown }>,
 *   offeringName?: string,
 *   intakeRequirement?: { label?: string, helpText?: string } | null,
 *   documents?: Array<{ originalName?: string, requirementName?: string, kind?: string, text?: string, reason?: string }>,
 *   policyExcerpts?: string[],
 * }} ctx
 */
export function buildIntakeVerificationUserPrompt(ctx) {
  return [
    `PROGRAMME: ${ctx.offeringName ?? 'Unknown'}`,
    `APPLICANT: ${ctx.applicantName ?? 'Unknown'}`,
    formatApplicantDetails(ctx.applicantDetails),
    '',
    'INTAKE DOCUMENT REQUIREMENT:',
    ctx.intakeRequirement?.label
      ? `- ${ctx.intakeRequirement.label}${ctx.intakeRequirement.helpText ? ` — ${ctx.intakeRequirement.helpText}` : ''}`
      : '- (no specific intake document configured)',
    '',
    'UPLOADED INTAKE DOCUMENTS (text extracted where possible; images are attached separately):',
    formatUploadedDocuments(ctx.documents),
    '',
    formatPolicy(ctx.policyExcerpts),
  ]
    .filter(Boolean)
    .join('\n');
}

function formatApplicantDetails(details) {
  if (!details?.length) return 'APPLICANT DETAILS: (none provided)';
  const lines = details
    .map((item) => `- ${item.label ?? item.fieldKey}: ${formatValue(item.value)}`)
    .join('\n');
  return `APPLICANT DETAILS:\n${lines}`;
}

function formatUploadedDocuments(documents) {
  if (!documents?.length) return '- (no documents uploaded)';
  return documents
    .map((doc, idx) => {
      const label = doc.requirementName || doc.originalName || `Document ${idx + 1}`;
      if (doc.kind === 'image') {
        return `[${idx + 1}] ${label} (${doc.originalName ?? 'image'}) — see attached image #${doc.imageNumber ?? idx + 1}`;
      }
      if (doc.kind === 'unreadable') {
        return `[${idx + 1}] ${label} (${doc.originalName ?? 'file'}) — UNREADABLE: ${doc.reason ?? 'no text available'}`;
      }
      return `[${idx + 1}] ${label} (${doc.originalName ?? 'file'}):\n"""\n${doc.text ?? ''}\n"""`;
    })
    .join('\n\n');
}

function formatPolicy(policyExcerpts) {
  if (!policyExcerpts?.length) return '';
  return `INSTITUTE POLICY EXCERPTS (for reference):\n${policyExcerpts
    .map((chunk, idx) => `(${idx + 1}) ${chunk}`)
    .join('\n')}`;
}

function formatValue(value) {
  if (value == null) return '(empty)';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
