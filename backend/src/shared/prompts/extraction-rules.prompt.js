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

export const OFFERING_DEFINITION = `An "offering" is a distinct programme / course / intake track under a parent service that students apply to separately.

INCLUDE as offerings when explicitly listed:
- Degree programmes and specialisations (e.g. "B.Tech. Computer Science & Engineering", "MBA Fintech", "BCA Data Science")
- Named application categories, quotas, batches, or campuses when the document presents them as separate apply-to options
- Prefer the most specific named programme line (degree + specialisation + campus if stated together)

DO NOT treat as offerings:
- Marketing section headings alone (e.g. "Rankings", "Placements", "Vision")
- Workflow steps, document checklist titles, or generic labels like "Undergraduate" with no programme name
- Years, survey names, or ranking positions

EXTRACTION RULES FOR OFFERINGS:
- List ONLY offerings explicitly named in the document (exact titles as written; light cleanup of line breaks OK).
- For nested catalogues (School → Degree → Specialisation), emit one offering per specialisation/programme line, not only the school name.
- If the document describes a single intake only, return exactly one offering with its exact name from the document.
- If no distinct offering is explicitly named, return an empty suggestedOfferings array.
- Return as many valid offerings as the document lists (do not stop early at an arbitrary small count).`;
