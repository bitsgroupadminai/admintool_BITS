/**
 * Rules split between interpretive summaries vs extractive structured data.
 * Edit these to change how the model treats each output type.
 */

export const SUMMARY_INTERPRETATION_RULES = `INTERPRETIVE OUTPUT (you may write clear prose):
- understandingSummary, chatbotReadinessSummary, chatbotCanAnswer, gaps
- Summarize and analyze what the documents mean for admins and a future student FAQ chatbot.
- Ground every claim in the document, but wording may be your own.
- Do not invent policies, dates, fees, or requirements not supported by the text.`;

export const DOCUMENT_EXTRACTION_RULES = `EXTRACTIVE OUTPUT (verbatim from the document — do NOT invent):
- suggestedOfferings, eligibilityRules, documentRequirements, workflowSteps, queue settings
- Copy names, labels, steps, criteria, and document titles EXACTLY as written (minimal normalization: trim whitespace, fix obvious line breaks).
- Include only items explicitly stated for the relevant offering/track/section.
- Do NOT infer generic offerings, workflow steps, AI automation, or placeholder rules.
- If nothing is explicitly stated, return an empty array (or null for queue when not described).
- Every extracted item MUST include documentExcerpt: a direct quote from the document (≤300 characters) proving it.
- Preserve document order for lists (offerings, steps, documents, rules).`;

export const OFFERING_DEFINITION = `An "offering" is a distinct academic programme / course / intake that a student can APPLY TO separately.

INCLUDE only when the document names a real programme, typically with a degree token:
- B.E. / B.Tech / B.Sc / BBA / BCA / M.E. / M.Tech / M.Sc / MBA / MCA / Ph.D / Diploma / Integrated …
- Example: "B.E. Computer Science", "MBA in Business Analytics", "M.Sc. Economics"
- Include campus in the name only if the document presents that campus as a separate apply-to option

DO NOT treat as offerings (these are NOT programmes):
- Table of contents / numbered section titles: "Purpose of This Knowledge Document", "Campuses Covered", "Programmes Covered in This Document"
- Workflow or process steps: "Application submission", "Profile screening", "Interview scheduling", "Offer release", "Final merit generation"
- Policy chapters: "Queue and Appointment Handling", "AI Chatbot Knowledge Guidelines", "Audit and Compliance", "Escalation Matrix"
- Generic headings: "Programme Knowledge Sections", "General Admissions Operational Principles"

EXTRACTION RULES FOR OFFERINGS:
- Return every named degree programme the student can apply to (small PDFs often have 3–8; large catalogues may have more).
- Never add a numbered heading just because it is numbered.
- Copy programme titles exactly as written (light cleanup of line breaks OK).
- If no degree programme is named, return an empty suggestedOfferings array.
- Prefer quality over quantity: never pad the list with section titles.`;
