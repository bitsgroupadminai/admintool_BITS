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

export const OFFERING_DEFINITION = `An "offering" is a distinct operational intake track under a parent service that students apply to separately (e.g. separate application categories, quotas, batches, or programs with their own stated process).

EXTRACTION RULES FOR OFFERINGS:
- List ONLY offerings explicitly named or labeled in the document (exact titles/headings/category names).
- Do NOT create offerings from years, examples, or patterns unless the document uses that exact label.
- Do NOT treat workflow steps, document names, or section headings as offerings.
- If the document describes a single intake only, return exactly one offering with its exact name from the document.
- If no distinct offering is explicitly named, return an empty suggestedOfferings array.`;
