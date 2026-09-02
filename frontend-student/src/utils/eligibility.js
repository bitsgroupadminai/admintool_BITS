const OPERATOR_LABELS = {
  eq: 'must be',
  neq: 'must not be',
  gte: 'at least',
  lte: 'at most',
  gt: 'more than',
  lt: 'less than',
};

/**
 * @param {{ field: string, fieldType: string, operator: string, value: unknown }} rule
 */
export function formatEligibilityRule(rule) {
  const field = rule.field?.trim() ?? 'Requirement';
  const operator = OPERATOR_LABELS[rule.operator] ?? rule.operator;
  const value = formatRuleValue(rule.value, rule.fieldType);

  if (rule.operator === 'eq' && rule.fieldType === 'text') {
    return `You must have: ${value}`;
  }

  if (rule.fieldType === 'boolean') {
    return value === 'Yes' ? `You must meet: ${field}` : `You must not have: ${field}`;
  }

  if (rule.fieldType === 'numeric') {
    return `${field}: ${operator} ${value}`;
  }

  return `${field} ${operator} ${value}`;
}

/**
 * Attach each eligibility rule to the document that should prove it.
 * Academic / 10+2 / PCM / marks rules go with the Class 12 marksheet when present.
 *
 * @param {Array<{ id?: string, name?: string, required?: boolean }>} documents
 * @param {Array<{ field?: string, fieldType?: string, operator?: string, value?: unknown }>} rules
 * @returns {Map<string, string[]>}
 */
export function groupEligibilityNotesByDocument(documents = [], rules = []) {
  const notesByKey = new Map();
  const docs = documents.filter(Boolean);
  if (!docs.length || !rules.length) return notesByKey;

  for (const rule of rules) {
    const target = pickDocumentForRule(rule, docs);
    if (!target) continue;
    const key = documentEligibilityKey(target);
    const notes = notesByKey.get(key) ?? [];
    notes.push(formatEligibilityRule(rule));
    notesByKey.set(key, notes);
  }

  return notesByKey;
}

export function getDocumentEligibilityNotes(document, documents = [], rules = []) {
  if (!document) return [];
  return groupEligibilityNotesByDocument(documents, rules).get(documentEligibilityKey(document)) ?? [];
}

export function documentEligibilityKey(document) {
  return String(document?.id || document?._id || document?.name || '');
}

/**
 * @param {unknown} value
 * @param {string} fieldType
 */
function formatRuleValue(value, fieldType) {
  if (fieldType === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (fieldType === 'numeric' && typeof value === 'number') {
    return `${value}%`;
  }
  return String(value);
}

function normalize(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/10\s*\+\s*2/g, '10+2')
    .replace(/[^a-z0-9+]+/g, ' ')
    .trim();
}

function isClass12Document(name) {
  return /class 12|12th|\bxii\b|10\+2|senior secondary|higher secondary|intermediate/.test(name);
}

function isClass10Document(name) {
  return /class 10|10th|\bx\b|matric/.test(name) && !isClass12Document(name);
}

function isMarksheetDocument(name) {
  return /marksheet|marks sheet|transcript|grade card|report card/.test(name);
}

function isEntranceDocument(name) {
  return /bitsat|entrance|scorecard|jee|neet|exam score/.test(name);
}

function isIdentityOrPhotoDocument(name) {
  return /id proof|identity|aadhaar|aadhar|passport-size|photograph|signature/.test(name);
}

function isDegreeDocument(name) {
  return /degree|graduation|bachelor|diploma|university/.test(name);
}

function scoreRuleForDocument(rule, document) {
  const doc = normalize(document.name);
  const hay = normalize(`${rule.field ?? ''} ${rule.value ?? ''}`);

  if (isIdentityOrPhotoDocument(doc) && !isEntranceDocument(doc)) return 0;

  let score = 0;

  if (isClass12Document(doc)) {
    if (
      /10\+2|class 12|12th|xii|pcm|physics|chemistry|mathematics|maths|aggregate|subject|qualification|threshold|marks|percentage|board/.test(
        hay,
      )
    ) {
      score += 6;
    }
    if (isMarksheetDocument(doc)) score += 1;
  }

  if (isClass10Document(doc) && /class 10|10th|matric/.test(hay) && !/10\+2|class 12/.test(hay)) {
    score += 6;
  }

  if (isEntranceDocument(doc) && /bitsat|entrance|exam|score|rank|cutoff|percentile/.test(hay)) {
    score += 8;
  }

  if (isDegreeDocument(doc) && /bachelor|degree|graduation|aggregate|minimum/.test(hay)) {
    score += 6;
  }

  if (
    isMarksheetDocument(doc) &&
    /aggregate|percentage|marks|threshold|pcm|physics|chemistry|mathematics/.test(hay)
  ) {
    score += isClass12Document(doc) ? 2 : 1;
  }

  return score;
}

function fallbackAcademicDocument(documents) {
  return (
    documents.find((doc) => isClass12Document(normalize(doc.name))) ||
    documents.find((doc) => isMarksheetDocument(normalize(doc.name)) && !isClass10Document(normalize(doc.name))) ||
    documents.find((doc) => isMarksheetDocument(normalize(doc.name))) ||
    documents.find((doc) => doc.required !== false) ||
    documents[0]
  );
}

function pickDocumentForRule(rule, documents) {
  let best = null;
  let bestScore = 0;

  for (const document of documents) {
    const score = scoreRuleForDocument(rule, document);
    if (score > bestScore) {
      bestScore = score;
      best = document;
    }
  }

  return bestScore > 0 ? best : fallbackAcademicDocument(documents);
}
