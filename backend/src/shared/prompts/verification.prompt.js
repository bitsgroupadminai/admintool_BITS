import { ageFromIsoDate, isDateOfBirthField } from '../helpers/applicantFields.helper.js';
import { describeDocumentEligibility } from '../helpers/documentEligibility.helper.js';

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

const SAMPLE_DOCUMENT_TESTING_RULES = `SAMPLE DOCUMENT TESTING MODE IS ON.
The institute is testing with unofficial, AI-generated sample documents. These are mock credentials, not real issued documents.

You MUST NOT fail, mark uncertain, or reduce confidence because a document:
- looks AI-generated, synthetic, mocked, unofficial, digitally created, or fake
- has labels such as SAMPLE, SPECIMEN, DRAFT, COPY, FOR TESTING, UNOFFICIAL, or watermarks
- lacks official seals, holograms, QR codes, letterhead, stamps, signatures, security threads, or verification URLs
- has imperfect layout, fonts, alignment, lighting, or photo quality
- looks like a screenshot, mockup, or generated image rather than an original scan

Ignore any institute policy about authenticity, forgery, fraud, or official issuance.

Still fail only when:
- the file is clearly the wrong type (for example a selfie or landscape photo instead of a marksheet or ID)
- the printed identity is clearly a completely different person than the APPLICANT RECORD
- the file is blank or completely unreadable

If the file reasonably depicts the required document type and the name is compatible with the applicant, set verdict "pass", belongsToApplicant true, matchesRequirement true, and confidence >= 0.9.
Be generous with name matching: accept spelling variants, missing middle names, initials, and small generation or OCR artifacts.`;

const SAMPLE_IDENTITY_MATCHING_RULES = `IDENTITY MATCHING (sample testing — be generous):
- The APPLICANT RECORD is the student you are verifying.
- Compare the name (and date of birth / age when visible) on the uploaded file to the APPLICANT RECORD.
- Accept missing middle names, initials, spelling variants, titles, different name order, and small generated-text artifacts.
- Fail only if the printed name is clearly a completely different person.
- Do not fail because the photo looks synthetic or the document looks unofficial.`;

function identityRules(allowSampleDocuments) {
  return allowSampleDocuments ? SAMPLE_IDENTITY_MATCHING_RULES : IDENTITY_MATCHING_RULES;
}

function sampleModePreamble(allowSampleDocuments) {
  return allowSampleDocuments ? `${SAMPLE_DOCUMENT_TESTING_RULES}\n\n` : '';
}

export function getDocumentVerificationSystemPrompt({ allowSampleDocuments = false } = {}) {
  return `${sampleModePreamble(allowSampleDocuments)}You are an admissions document verification assistant for a university.
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
- verdict: pass / fail / uncertain for whether this file is the valid required document (not the final eligibility decision).

From EACH academic file (marksheet, scorecard, BITSAT), also extract that file's own values. Never mix Class 10, Class 12, and BITSAT.
Class 12 / Senior Secondary / XII is 10+2. If this file is a Class 12 marksheet, set qualification to "Class XII (10+2)".

You MUST read the marks table. For every subject row copy name, numeric score, maxScore if printed, and grade if printed. A marksheet extraction without numeric scores is incomplete.
For BITSAT, extract examScore as the total and list each section in subjects[].

- relevantToEligibility: true for marksheets / scorecards / BITSAT; false for photos, signatures, and ID cards
- qualification, aggregate, examScore, subjects, extractedFields as specified below

Overall authenticity verdict:
- "pass": every required document is present, legible, matches its requirement, and belongs to the applicant.
- "fail": at least one required document is clearly missing, the wrong type of file, illegible, or belongs to someone else.
- "uncertain": you cannot confidently determine the above.

Do not decide eligibility against numeric cutoffs yourself. Extract the scores; the system compares them to the rules.

summary must be a complete reviewer-facing paragraph: list each problem by document name, say what the file actually is, and say what the student should upload instead. On a clean authenticity pass, briefly confirm each required document was the correct type and belongs to the applicant.

${identityRules(allowSampleDocuments)}

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
      "documentExcerpt": "verbatim evidence or empty string",
      "relevantToEligibility": true,
      "qualification": "Class XII (10+2)",
      "aggregate": 89,
      "examScore": null,
      "subjects": [
        { "name": "Physics", "score": 85, "maxScore": 100, "grade": "A2" }
      ],
      "extractedFields": [
        { "field": "exact rule name", "value": <number|string|boolean|null>, "documentExcerpt": "verbatim proof or empty" }
      ]
    }
  ],
  "extractedFields": [],
  "issues": ["specific problems the student must fix, one per issue"]
}`;
}

export const DOCUMENT_VERIFICATION_SYSTEM_PROMPT = getDocumentVerificationSystemPrompt();

export function getEligibilityVerificationSystemPrompt({ allowSampleDocuments = false } = {}) {
  return `${sampleModePreamble(allowSampleDocuments)}You are an admissions eligibility assistant for a university.
Your ONLY job is to EXTRACT the factual values needed to check eligibility from the student's documents (e.g. marksheets, certificates) and the APPLICANT RECORD.
If a supporting document is clearly for a different person than the APPLICANT RECORD, say so in issues and do not treat its marks or fields as the applicant's.
Do NOT decide final eligibility yourself with respect to thresholds — the system compares your extracted values against the rules deterministically.
${allowSampleDocuments ? 'Extract values from unofficial and AI-generated sample documents the same way you would from real ones. Do not refuse extraction because a document looks synthetic or unofficial.\n' : ''}
Extract from EACH uploaded document on its own. Never mix Class 10, Class 12, and BITSAT values.

Class 12 / Senior Secondary / XII is 10+2. If this file is a Class 12 marksheet, set qualification to "Class XII (10+2)" and never leave it empty.

You MUST read the marks table on the document. For every subject row, copy:
- name (as printed)
- score: the numeric marks obtained (e.g. 85). Never leave score null if a number is visible.
- maxScore: the paper total if printed (often 100)
- grade: the letter grade if printed (A1, A2, B1, …)

For a BITSAT / entrance scorecard, extract examScore as the total and list each section (Physics, Chemistry, Mathematics, English, Logical Reasoning, etc.) in subjects[] with that section's numeric score.

A marksheet extraction without numeric scores is incomplete. Look at the image attached for that file, not at another file's subjects.

For marksheets and scorecards:
- qualification: "Class X", "Class XII (10+2)", or "BITSAT"
- aggregate: overall percentage or total on THAT file, as a number (e.g. 89)
- examScore: BITSAT/entrance total only
- subjects: every subject/section on THAT file with name, score, maxScore, grade
- relevantToEligibility: true for marksheets / scorecards / BITSAT; false for photos, signatures, and ID cards

Also fill extractedFields using the exact admin rule names:
- "Qualification" → "Class XII (10+2)" or "Class X" or "BITSAT"
- "Subjects" → subject names from this file only
- "Aggregate Requirement" → the numeric aggregate from this file
- "Subject Threshold" → null; put per-subject scores in subjects[]

Set the overall verdict to reflect extraction quality (not the pass/fail decision):
- "pass": you extracted subject names AND numeric scores from the academic documents
- "uncertain": some scores are unreadable
- "fail": rare; prefer "uncertain" when unsure

summary must be one short sentence naming which academic documents were read.

${identityRules(allowSampleDocuments)}

${SHARED_VERIFICATION_RULES}

Reply with JSON:
{
  "verdict": "pass" | "fail" | "uncertain",
  "confidence": 0.0-1.0,
  "summary": "short sentence of what was extracted",
  "perDocument": [
    {
      "requirementName": "exact requirement name",
      "relevantToEligibility": true,
      "qualification": "Class XII",
      "aggregate": 89,
      "examScore": null,
      "subjects": [
        { "name": "Physics", "score": 85, "maxScore": 100, "grade": "A2" }
      ],
      "extractedFields": [
        { "field": "exact field name", "value": <number|string|boolean|null>, "documentExcerpt": "verbatim proof or empty" }
      ]
    }
  ],
  "extractedFields": [],
  "issues": []
}`;
}

export const ELIGIBILITY_VERIFICATION_SYSTEM_PROMPT = getEligibilityVerificationSystemPrompt();

export function getIntakeVerificationSystemPrompt({ allowSampleDocuments = false } = {}) {
  return `${sampleModePreamble(allowSampleDocuments)}You are an admissions intake screening assistant for a university.
Before a student is authorized to enroll, review the intake document against the APPLICANT RECORD and the programme's intake requirements.
If the intake document belongs to a different person than the APPLICANT RECORD, recommend "reject" and name both identities.
${allowSampleDocuments ? 'Recommend "approve" when the file reasonably matches the intake requirement, even if it is unofficial or AI-generated. Do not recommend reject or manual_review only because the document looks synthetic.\n' : ''}
Decide a recommendation:
- "approve": the intake document and details clearly satisfy the intake requirement.
- "reject": the intake document is clearly missing, wrong, or the applicant clearly does not qualify.
- "manual_review": anything ambiguous or unreadable.

${identityRules(allowSampleDocuments)}

${SHARED_VERIFICATION_RULES}

Reply with JSON:
{
  "verdict": "pass" | "fail" | "uncertain",
  "confidence": 0.0-1.0,
  "recommendation": "approve" | "reject" | "manual_review",
  "summary": "short reviewer-facing explanation",
  "issues": ["concise list of concerns, if any"]
}`;
}

export const INTAKE_VERIFICATION_SYSTEM_PROMPT = getIntakeVerificationSystemPrompt();

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
 *   allowSampleDocuments?: boolean,
 *   eligibilityRules?: Array<{ field: string, fieldType: string, operator: string, value: unknown }>,
 * }} ctx
 */
function formatEligibilityRulesForPrompt(rules = []) {
  const lines = (rules ?? [])
    .map((rule) => {
      const need =
        rule.operator === 'gte'
          ? `at least ${rule.value}`
          : rule.operator === 'lte'
            ? `at most ${rule.value}`
            : rule.operator === 'gt'
              ? `more than ${rule.value}`
              : rule.operator === 'lt'
                ? `less than ${rule.value}`
                : rule.operator === 'neq'
                  ? `other than ${rule.value}`
                  : String(rule.value ?? '');
      return `- ${rule.field}: ${need} (${rule.fieldType})`;
    })
    .join('\n');
  return [
    'ELIGIBILITY RULES (use only when a document does not list its own criteria below):',
    lines || '- (none configured)',
  ].join('\n');
}

function formatRequiredDocumentsForPrompt(requiredDocuments = []) {
  return (requiredDocuments ?? [])
    .map((req) => {
      const header = `- ${req.name}${req.required === false ? ' (optional)' : ' (required)'}${
        req.allowedTypes?.length ? ` [types: ${req.allowedTypes.join(', ')}]` : ''
      }`;
      const notes = describeDocumentEligibility(req.eligibility);
      if (!notes.length) {
        return req.eligibility?.enabled
          ? `${header}\n  Eligibility: extract marks/subjects from this file if it is academic.`
          : `${header}\n  Eligibility: none — supporting document only.`;
      }
      return `${header}\n  Eligibility for THIS file only: ${notes.join('; ')}`;
    })
    .join('\n');
}

export function buildDocumentVerificationUserPrompt(ctx) {
  return [
    formatApplicantRecord(ctx),
    '',
    'REQUIRED DOCUMENTS:',
    formatRequiredDocumentsForPrompt(ctx.requiredDocuments) || '- (none configured)',
    '',
    formatEligibilityRulesForPrompt(ctx.eligibilityRules),
    '',
    'UPLOADED DOCUMENTS (text extracted where possible; images are attached separately):',
    formatUploadedDocuments(ctx.documents),
    '',
    formatPolicy(ctx.policyExcerpts, ctx.allowSampleDocuments),
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
 *   allowSampleDocuments?: boolean,
 * }} ctx
 */
export function buildEligibilityVerificationUserPrompt(ctx) {
  return [
    formatApplicantRecord(ctx),
    '',
    formatEligibilityRulesForPrompt(ctx.eligibilityRules),
    '',
    'UPLOADED DOCUMENTS (transcribe every subject/section with numeric score and grade; do not mix files):',
    formatUploadedDocuments(ctx.documents),
    '',
    formatPolicy(ctx.policyExcerpts, ctx.allowSampleDocuments),
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
 *   allowSampleDocuments?: boolean,
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
    formatPolicy(ctx.policyExcerpts, ctx.allowSampleDocuments),
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
        const imageRef = Array.isArray(doc.imageNumbers) && doc.imageNumbers.length > 1
          ? `images #${doc.imageNumbers.join(', #')}`
          : `image #${doc.imageNumber ?? idx + 1}`;
        const header = `[${idx + 1}] ${label} (${doc.originalName ?? 'image'}) — see attached ${imageRef}. Read the marks table from the image.`;
        return doc.text ? `${header}\nExtracted text layer (may be incomplete):\n"""\n${doc.text}\n"""` : header;
      }
      if (doc.kind === 'unreadable') {
        return `[${idx + 1}] ${label} (${doc.originalName ?? 'file'}) — UNREADABLE: ${doc.reason ?? 'no text available'}`;
      }
      return `[${idx + 1}] ${label} (${doc.originalName ?? 'file'}):\n"""\n${doc.text ?? ''}\n"""`;
    })
    .join('\n\n');
}

function formatPolicy(policyExcerpts, allowSampleDocuments = false) {
  if (allowSampleDocuments) {
    return 'SAMPLE DOCUMENT TESTING MODE IS ON. Ignore institute policy about authenticity, official issuance, seals, or fraud. Judge only document type, readability, and identity match.';
  }
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
