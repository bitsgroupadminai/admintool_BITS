/**
 * Coerce common OpenAI JSON shape mistakes before Zod validation.
 * @param {unknown} raw
 */
export function normalizeServiceInsightsPayload(raw) {
  if (!raw || typeof raw !== 'object') {
    return {};
  }

  /** @type {Record<string, unknown>} */
  const obj = { ...raw };

  if (!obj.understandingSummary && typeof obj.summary === 'string') {
    obj.understandingSummary = obj.summary;
  }
  if (!obj.chatbotReadinessSummary) {
    const alt = obj.chatbotReadiness ?? obj.chatbotSummary;
    if (typeof alt === 'string') obj.chatbotReadinessSummary = alt;
  }

  obj.chatbotCanAnswer = coerceStringArray(obj.chatbotCanAnswer, {
    ifBooleanTrue: ['General questions covered by the uploaded documents'],
  });
  obj.gaps = coerceStringArray(obj.gaps);

  if (Array.isArray(obj.suggestedOfferings)) {
    obj.suggestedOfferings = obj.suggestedOfferings
      .map((item) => {
        if (typeof item === 'string' && item.trim()) {
          return null;
        }
        if (item && typeof item === 'object') {
          const o = /** @type {Record<string, unknown>} */ (item);
          const name = [o.name, o.title, o.offeringName].find((v) => typeof v === 'string' && v.trim());
          if (!name) return null;
          const documentExcerpt = [o.documentExcerpt, o.sourceQuote, o.evidence, o.rationale]
            .find((v) => typeof v === 'string' && v.trim());
          if (!documentExcerpt) return null;
          return {
            name: String(name).trim(),
            description: typeof o.description === 'string' ? o.description : '',
            documentExcerpt: String(documentExcerpt).trim().slice(0, 500),
          };
        }
        return null;
      })
      .filter(Boolean);
  } else {
    obj.suggestedOfferings = [];
  }

  if (typeof obj.understandingSummary !== 'string' || !obj.understandingSummary.trim()) {
    obj.understandingSummary = 'Summary could not be extracted from the model response.';
  }
  if (typeof obj.chatbotReadinessSummary !== 'string' || !obj.chatbotReadinessSummary.trim()) {
    obj.chatbotReadinessSummary = String(obj.understandingSummary);
  }

  return obj;
}

/**
 * @param {unknown} value
 * @param {{ ifBooleanTrue?: string[] }} [opts]
 */
function coerceStringArray(value, opts = {}) {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => {
        if (typeof item === 'string' && item.trim()) return [item.trim()];
        if (item && typeof item === 'object' && typeof item.question === 'string') {
          return [item.question.trim()];
        }
        return [];
      })
      .slice(0, 20);
  }
  if (typeof value === 'string' && value.trim()) {
    return [value.trim()];
  }
  if (value === true && opts.ifBooleanTrue) {
    return opts.ifBooleanTrue;
  }
  return [];
}
