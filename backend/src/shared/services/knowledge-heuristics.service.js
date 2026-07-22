/**
 * Keyword-based fallback when OpenAI is unavailable or times out.
 * Summaries are generic; offerings come from structured document headers when present.
 * @param {{ name: string, description?: string }} service
 * @param {string} docText
 * @param {Array<{ name: string, description?: string, documentExcerpt: string }>} [structuredOfferings]
 */
export function buildHeuristicServiceInsights(service, docText, structuredOfferings = []) {
  const chatbotCanAnswer = [
    `What documents are required for ${service.name}`,
    'General eligibility and qualification criteria',
    'Step-by-step application process overview',
  ];

  const lower = `${service.name} ${service.description ?? ''} ${docText}`.toLowerCase();
  if (lower.includes('fee') || lower.includes('payment')) {
    chatbotCanAnswer.push('Fee payment requirements and methods');
  }
  if (lower.includes('deadline') || lower.includes('last date') || lower.includes('applications open')) {
    chatbotCanAnswer.push('Important dates and deadlines');
  }
  if (structuredOfferings.length > 0) {
    chatbotCanAnswer.push('Which programmes / offerings are available');
  }

  const gaps = [];
  if (structuredOfferings.length === 0) {
    gaps.push(
      'Exact offering names and workflow steps require OpenAI — re-analyze with OPENAI_API_KEY to extract verbatim items from the document.',
    );
  } else {
    gaps.push(
      'Summaries are basic (OpenAI unavailable or timed out). Offering names were read from the document structure — review before creating.',
    );
  }
  if (!lower.includes('deadline') && !lower.includes('last date') && !lower.includes('applications open')) {
    gaps.push('Application deadlines are not clearly documented — add dates to improve guidance.');
  }
  if (!lower.includes('fee') && !lower.includes('payment')) {
    gaps.push('Fee structure and payment process may be missing.');
  }
  if (docText.length < 500) {
    gaps.push('Limited text extracted — use text-based PDFs/DOCX or check scanned documents.');
  }

  const understandingSummary = docText.length
    ? structuredOfferings.length > 0
      ? `From uploaded documents, ${service.name} covers admissions operations with ${structuredOfferings.length} named programme offerings detected in the catalogue. (Basic summary — OpenAI full analysis unavailable.)`
      : `From uploaded documents, this service covers ${service.name.toLowerCase()} operations including application intake and verification. (Interpretive summary — configure OpenAI for full analysis.)`
    : `No document text available for ${service.name}.`;

  const chatbotReadinessSummary = docText.length
    ? structuredOfferings.length > 0
      ? `A student chatbot can be grounded in the uploaded catalogue (${structuredOfferings.length} offerings detected). Exact eligibility/document wording is in the knowledge text; full AI narrative analysis was not available.`
      : `A future student chatbot could likely discuss topics present in the uploads, but exact offerings and process steps must be extracted with OpenAI — not available in fallback mode.`
    : `A future chatbot cannot be grounded in these documents until readable text is extracted from your uploads.`;

  return {
    understandingSummary,
    chatbotReadinessSummary,
    chatbotCanAnswer,
    gaps,
    suggestedOfferings: structuredOfferings.map((o) => ({
      name: o.name,
      description: o.description ?? '',
      documentExcerpt: o.documentExcerpt,
    })),
  };
}
