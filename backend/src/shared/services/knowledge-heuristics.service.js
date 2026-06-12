import crypto from 'crypto';

/**
 * Keyword-based fallback when OpenAI is unavailable.
 * Summaries are generic; offerings are NOT invented — extractive fields require GenAI.
 * @param {{ name: string, description?: string }} service
 * @param {string} docText
 */
export function buildHeuristicServiceInsights(service, docText) {
  const chatbotCanAnswer = [
    `What documents are required for ${service.name}`,
    'General eligibility and qualification criteria',
    'Step-by-step application process overview',
  ];

  const lower = `${service.name} ${service.description ?? ''} ${docText}`.toLowerCase();
  if (lower.includes('fee') || lower.includes('payment')) {
    chatbotCanAnswer.push('Fee payment requirements and methods');
  }
  if (lower.includes('deadline') || lower.includes('last date')) {
    chatbotCanAnswer.push('Important dates and deadlines');
  }

  const gaps = [];
  gaps.push(
    'Exact offering names and workflow steps require OpenAI — re-analyze with OPENAI_API_KEY to extract verbatim items from the document.',
  );
  if (!lower.includes('deadline') && !lower.includes('last date')) {
    gaps.push('Application deadlines are not clearly documented — add dates to improve guidance.');
  }
  if (!lower.includes('fee') && !lower.includes('payment')) {
    gaps.push('Fee structure and payment process may be missing.');
  }
  if (docText.length < 500) {
    gaps.push('Limited text extracted — use text-based PDFs/DOCX or check scanned documents.');
  }

  const understandingSummary = docText.length
    ? `From uploaded documents, this service covers ${service.name.toLowerCase()} operations including application intake and verification. (Interpretive summary — configure OpenAI for full analysis.)`
    : `No document text available for ${service.name}.`;

  const chatbotReadinessSummary = docText.length
    ? `A future student chatbot could likely discuss topics present in the uploads, but exact offerings and process steps must be extracted with OpenAI — not available in fallback mode.`
    : `A future chatbot cannot be grounded in these documents until readable text is extracted from your uploads.`;

  return {
    understandingSummary,
    chatbotReadinessSummary,
    chatbotCanAnswer,
    gaps,
    suggestedOfferings: [],
  };
}
