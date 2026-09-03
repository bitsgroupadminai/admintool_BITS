import { ageFromIsoDate, isDateOfBirthField } from '../helpers/applicantFields.helper.js';

/**
 * Prompts for AI-driven verification of student application uploads and eligibility.
 *
 * Design principles (mirrors extraction-rules.prompt.js):
 * - Extractive: never invent marks, names, or document contents; quote evidence.
 * - Conservative: when unsure, return verdict "uncertain" so a human reviews.
 * - Structured: always reply with the exact JSON shape requested.
 */

const SHARED_VERIFICATION_RULES = `GENERAL RULES:
- Judge ONLY from the provided documents, the APPLICANT RECORD, and institute policy excerpts.
- Never fabricate values, names, marks, or statements not present in the material.
- If a document is missing, illegible, ambiguous, or you are not confident, use verdict "uncertain" and explain why.
- "confidence" (0-1) must reflect how certain you are: use >=0.85 only when the evidence is clear and unambiguous.
- Quote short verbatim evidence in documentExcerpt (<=300 chars) whenever you make a claim about a document.
- Write reviewer-facing text in plain language. Name the requirement, say what was uploaded, and say why it does or does not meet the requirement.
- Respond with a single JSON object only. No markdown, no commentary outside the JSON.`;

const IDENTITY_MATCHING_RULES = `IDENTITY MATCHING (required on every government ID, certificate, marksheet, or named document):
- The APPLICANT RECORD is the student you are verifying. Use their full name, age, date of birth, email, mobile, and every other listed field.
- Read the name (and date of birth / age / ID number when visible) on the uploaded file and compare it to the APPLICANT RECORD.
- Minor differences are OK if it is clearly the same person: missing middle name, initials, spelling variants, titles (Mr/Ms/Dr), or different name order.
- If the document clearly belongs to a different person — a different full name, a different date of birth, or no matching name when a name is clearly printed — set belongsToApplicant = false and verdict = "fail".
- In that case issue MUST say: "This document appears to belong to [name printed on the document], not [applicant full name]. Upload a document that shows the applicant's own identity."
- If a name or date of birth is printed and does not match the APPLICANT RECORD, do not pass the document.
- If no name is visible at all, set belongsToApplicant based on whatever identity clues exist; if you cannot tell, use verdict "uncertain" and say that the name could not be read.`;

export const DOCUMENT_VERIFICATION_SYSTEM_PROMPT = `You are an admissions document verification assistant for a university.
Your job is to check whether the documents a student uploaded satisfy the programme's required document list.

For EACH required document:
1. Identify what the uploaded file actually shows. Look at the image or extracted text.
2. Decide whether that content is the document the requirement asked for.
3. Write a specific finding. Do not use vague phrases such as "invalid document" or "does not match".

observedContent must name what you actually see, for example:
- "Class 12 marksheet for [name], showing subject-wise marks"
- "Aadhaar card / government photo ID"
- "a selfie of a person"
- "a landscape photograph"
- "a screenshot of a chat"
- "a blank or unreadable scan"

If the file is not the required certificate, marksheet, or government ID:
- matchesRequirement = false
- verdict = "fail" (or "uncertain" only if you truly cannot tell what it is)
- issue MUST follow this pattern:
  "The uploaded file is [observedContent], which is not a [requirementName]. This does not meet the requirement."

If the correct type of document is uploaded:
- Say so clearly in issue (empty string is allowed on a clean pass).
- If something is still wrong (wrong person, unreadable, expired, incomplete pages), say exactly what is missing or mismatched and quote the evidence.

Also decide:
- present: is a file uploaded for this requirement?
- matchesRequirement: does the content match what the requirement asks for?
- legible: is it readable / not blank / not corrupted?
- belongsToApplicant: does the identity on the document match the APPLICANT RECORD (name, and DOB/age when visible)?
- verdict: pass / fail / uncertain for that single document.

Overall verdict:
- "pass": every required document is present, legible, matches its requirement, and belongs to the applicant.
- "fail": at least one required document is clearly missing, the wrong type of file, illegible, or belongs to someone else.
- "uncertain": you cannot confidently determine the above.

summary must be a complete reviewer-facing paragraph: list each problem by document name, say what the file actually is, and say what the student should upload instead. On a pass, briefly confirm each required document was the correct type and belongs to the applicant.

${IDENTITY_MATCHING_RULES}

${SHARED_VERIFICATION_RULES}

Reply with JSON:
{
  "verdict": "pass" | "fail" | "uncertain",
  "confidence": 0.0-1.0,
  "summary": "detailed reviewer-facing explanation",
  "perDocument": [
    {
      "requirementName": "string (exact requirement name)",
      "present": true|false,
      "matchesRequirement": true|false,
      "legible": true|false,
      "belongsToApplicant": true|false,
      "verdict": "pass" | "fail" | "uncertain",
      "observedContent": "what the uploaded file actually shows",
      "issue": "specific problem and what is required instead, or empty string",
      "documentExcerpt": "verbatim evidence or empty string"
    }
  ],
  "issues": ["specific problems the student must fix, one per issue"]
}`;

export const ELIGIBILITY_VERIFICATION_SYSTEM_PROMPT = `You are an admissions eligibility assistant for a university.
Your ONLY job is to EXTRACT the factual values needed to check eligibility from the student's documents (e.g. marksheets, certificates) and the APPLICANT RECORD.
If a supporting document is clearly for a different person than the APPLICANT RECORD, say so in issues and do not treat its marks or fields as the applicant's.
Do NOT decide final eligibility yourself with respect to thresholds — the system compares your extracted values against the rules deterministically.

For each eligibility field the programme cares about, extract the applicant's actual value:
- Use the exact field name given in the rules list.
- value: the extracted number/text/boolean, or null if it is not present in the documents.
- documentExcerpt: verbatim proof from the document, including the subject/mark line when marks are involved.

Set the overall verdict to reflect extraction quality (not the pass/fail decision):
- "pass": you confidently extracted all required values.
- "uncertain": some values are missing or ambiguous / documents unreadable.
- "fail": documents clearly contradict a stated requirement (e.g. wrong stream) — rare; prefer "uncertain" when unsure.

summary must name each extracted field and the value you found, plus the document you found it on.
If a value could not be read, say which field is missing and why (wrong document type, unreadable scan, subject not listed).

${IDENTITY_MATCHING_RULES}

${SHARED_VERIFICATION_RULES}

Reply with JSON:
{
  "verdict": "pass" | "fail" | "uncertain",
  "confidence": 0.0-1.0,
  "summary": "detailed reviewer-facing explanation of what was extracted",
  "extractedFields": [
    { "field": "exact field name", "value": <number|string|boolean|null>, "documentExcerpt": "verbatim proof or empty" }
  ],
  "issues": ["specific extraction problems, if any"]
}`;

export const INTAKE_VERIFICATION_SYSTEM_PROMPT = `You are an admissions intake screening assistant for a university.
Before a student is authorized to enroll, review the intake document against the APPLICANT RECORD and the programme's intake requirements.
If the intake document belongs to a different person than the APPLICANT RECORD, recommend "reject" and name both identities.

Decide a recommendation:
- "approve": the intake document and details clearly satisfy the intake requirement.
- "reject": the intake document is clearly missing, wrong, or the applicant clearly does not qualify.
- "manual_review": anything ambiguous or unreadable.

${IDENTITY_MATCHING_RULES}

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
 *   applicantEmail?: string,
 *   applicantMobile?: string,
 *   applicantDetails?: Array<{ label?: string, fieldKey?: string, value?: unknown }>,
 *   applicantFields?: Array<{ fieldKey?: string, label?: string, fieldType?: string }>,
 *   requiredDocuments?: Array<{ name: string, required?: boolean, allowedTypes?: string[] }>,
 *   documents?: Array<{ originalName?: string, requirementName?: string, kind?: string, text?: string, reason?: string }>,
 *   policyExcerpts?: string[],
 * }} ctx
 */
export function buildDocumentVerificationUserPrompt(ctx) {
  return [
    formatApplicantRecord(ctx),
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
 *   applicantEmail?: string,
 *   applicantMobile?: string,
 *   applicantDetails?: Array<{ label?: string, fieldKey?: string, value?: unknown }>,
 *   applicantFields?: Array<{ fieldKey?: string, label?: string, fieldType?: string }>,
 *   eligibilityRules?: Array<{ field: string, fieldType: string, operator: string, value: unknown }>,
 *   documents?: Array<{ originalName?: string, requirementName?: string, kind?: string, text?: string, reason?: string }>,
 *   policyExcerpts?: string[],
 * }} ctx
 */
export function buildEligibilityVerificationUserPrompt(ctx) {
  return [
    formatApplicantRecord(ctx),
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
 *   applicantEmail?: string,
 *   applicantMobile?: string,
 *   applicantDetails?: Array<{ label?: string, fieldKey?: string, value?: unknown }>,
 *   applicantFields?: Array<{ fieldKey?: string, label?: string, fieldType?: string }>,
 *   offeringName?: string,
 *   intakeRequirement?: { label?: string, helpText?: string } | null,
 *   documents?: Array<{ originalName?: string, requirementName?: string, kind?: string, text?: string, reason?: string }>,
 *   policyExcerpts?: string[],
 * }} ctx
 */
export function buildIntakeVerificationUserPrompt(ctx) {
  return [
    `PROGRAMME: ${ctx.offeringName ?? 'Unknown'}`,
    formatApplicantRecord(ctx),
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

function looksLikeDateOfBirth(item, fieldDef) {
  if (fieldDef && isDateOfBirthField(fieldDef)) return true;
  const haystack = `${item.fieldKey ?? ''} ${item.label ?? ''}`.toLowerCase();
  return (
    haystack.includes('date of birth') ||
    haystack.includes('date_of_birth') ||
    haystack.includes('birth date') ||
    haystack.includes('birthdate') ||
    haystack.includes('birth_date') ||
    /\bdob\b/.test(haystack)
  );
}

function looksLikeAgeField(item) {
  const haystack = `${item.fieldKey ?? ''} ${item.label ?? ''}`.toLowerCase();
  return /(^|[^a-z])age([^a-z]|$)/.test(haystack);
}

/**
 * Full identity block sent to every verification prompt.
 */
export function formatApplicantRecord(ctx = {}) {
  const lines = [
    `- Full name: ${ctx.applicantName?.trim() || '(not provided)'}`,
    `- Email: ${ctx.applicantEmail?.trim() || '(not provided)'}`,
    `- Mobile: ${ctx.applicantMobile?.trim() || '(not provided)'}`,
  ];

  const fieldByKey = new Map(
    (ctx.applicantFields ?? []).map((field) => [field.fieldKey, field]),
  );
  let derivedAge = null;
  let listedAge = false;

  for (const item of ctx.applicantDetails ?? []) {
    const label = item.label ?? item.fieldKey;
    lines.push(`- ${label}: ${formatValue(item.value)}`);

    if (looksLikeAgeField(item) && item.value != null && item.value !== '') {
      listedAge = true;
      const numericAge = Number(item.value);
      if (!Number.isNaN(numericAge)) derivedAge = numericAge;
    }

    const fieldDef = fieldByKey.get(item.fieldKey);
    if (looksLikeDateOfBirth(item, fieldDef)) {
      const age = ageFromIsoDate(String(item.value ?? ''));
      if (age != null) derivedAge = age;
    }
  }

  if (derivedAge != null && !listedAge) {
    lines.push(`- Age (from date of birth): ${derivedAge}`);
  }

  return `APPLICANT RECORD (compare every document against this identity):\n${lines.join('\n')}`;
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
