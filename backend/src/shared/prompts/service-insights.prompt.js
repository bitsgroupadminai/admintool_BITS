import {
  OFFERING_DEFINITION,
  SUMMARY_INTERPRETATION_RULES,
  DOCUMENT_EXTRACTION_RULES,
} from './extraction-rules.prompt.js';

/**
 * Example JSON shape the model must return for service insights.
 */
export const SERVICE_INSIGHTS_JSON_EXAMPLE = `{
  "understandingSummary": "AI-written summary of what the service covers",
  "chatbotReadinessSummary": "AI-written note on future chatbot coverage",
  "chatbotCanAnswer": ["Example student question 1?", "Example student question 2?"],
  "gaps": ["Missing topic 1", "Missing topic 2"],
  "suggestedOfferings": [
    {
      "name": "Exact offering name from document",
      "description": "Only if the document states a description adjacent to that offering; otherwise empty string",
      "documentExcerpt": "Direct quote from document proving this offering exists"
    }
  ]
}`;

/**
 * System prompt for analyzing service knowledge documents.
 */
export const SERVICE_INSIGHTS_SYSTEM_PROMPT = `You analyze university administrative policy documents for an admin setup tool.
There is NO live chatbot yet — you produce a readiness report for a future student FAQ chatbot.

${SUMMARY_INTERPRETATION_RULES}

${DOCUMENT_EXTRACTION_RULES}

${OFFERING_DEFINITION}

Respond with valid JSON only.`;

/**
 * @param {{ serviceName: string, serviceDescription?: string, docText: string }} params
 */
export function buildServiceInsightsUserPrompt({ serviceName, serviceDescription, docText }) {
  return `Service name: ${serviceName}
Service description: ${serviceDescription?.trim() || '(none)'}

Knowledge document text:
"""
${docText}
"""

Return JSON with:

INTERPRETIVE (AI-written, grounded in document):
- understandingSummary: 2-4 sentences on what this service covers
- chatbotReadinessSummary: 2-4 sentences on what a future FAQ chatbot could vs could not answer from these documents alone
- chatbotCanAnswer: 5-12 example student questions answerable from the document (phrase as questions)
- gaps: topics students would ask about that the document does NOT adequately cover

EXTRACTIVE (exact from document — empty array if none found):
- suggestedOfferings: each { name, description, documentExcerpt }
  - name: exact offering/intake/category name as written in the document
  - description: only text explicitly tied to that offering in the document; else ""
  - documentExcerpt: required direct quote proving this offering; omit offerings you cannot quote

Use exactly this JSON shape (arrays must be arrays, not strings or booleans):
${SERVICE_INSIGHTS_JSON_EXAMPLE}`;
}
