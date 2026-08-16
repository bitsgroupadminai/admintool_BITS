/**
 * Deterministic offering extraction for structured admissions knowledge docs.
 * Supports the reusable college template pattern:
 *   ----- Offering Name: B.Tech. CSE (Lakeside Campus) -----
 * and catalogue index lines:
 *   1.  B.Tech. Computer Science & Engineering (Lakeside Campus)
 */

const OFFERING_NAME_BLOCK =
  /(?:^-{3,}\s*)?Offering Name:\s*(.+?)(?:\s*-{3,})?\s*$/gim;

const CATALOGUE_INDEX_LINE =
  /^\s*\d{1,3}\.\s+([A-Za-z].{2,180}?(?:\([^)]+\))?)\s*$/gm;

// Require dotted/abbreviated degrees so English words like "be" / "me" do not match.
const DEGREE_TOKEN =
  /\b(?:b\.e\.?|b\.?\s*tech\.?|b\.?\s*sc\.?|b\.?\s*com\.?|b\.?\s*arch\.?|b\.?\s*pharm\.?|bba|bca|b\.?\s*des\.?|ll\.?\s*b\.?|ll\.?\s*m\.?|mba|m\.e\.?|m\.?\s*tech\.?|m\.?\s*sc\.?|mca|m\.?\s*com\.?|m\.?\s*arch\.?|ph\.?\s*d\.?|m\.?\s*phil\.?|pgdm|diploma|integrated|bachelor(?:['’]s)?\s+of|master(?:['’]s)?\s+of)\b/i;

const PROGRAMME_TITLE_LINE =
  /^\s*(?:\d+(?:\.\d+)*\.?\s+)?((?:B\.E\.|B\.Tech\.?|B\.Sc\.?|B\.Com\.?|B\.Arch\.?|B\.Des\.?|BBA|BCA|MBA|M\.E\.|M\.Tech\.?|M\.Sc\.?|M\.Com\.?|MCA|Ph\.D\.?|PGDM|LL\.B\.?|LL\.M\.?|Diploma|Integrated)[^\n]{2,120})\s*$/gim;

const SKIP_NAME =
  /^(school of|college of|part |document |end |primary service|undergraduate & postgraduate|purpose of|campuses covered|programmes covered|programs covered|general admissions|programme knowledge|application submission|profile screening|entrance score|interview scheduling|interview evaluation|final merit|offer release|standard deficiency|queue and appointment|ai chatbot|audit and compliance|internal escalation|end-of-cycle|end of cycle|knowledge document|knowledge sections|operational principles|operational closure|deficiency handling)/i;

const SECTION_OR_STEP =
  /\b(purpose of this|campuses covered|programmes covered|programs covered|operational principles|knowledge sections|application submission|profile screening|entrance score validation|interview scheduling|interview evaluation|final merit|offer release|deficiency handling|queue and appointment|chatbot knowledge|audit and compliance|escalation matrix|operational closure|knowledge guidelines)\b/i;

/**
 * True only for apply-to programmes (B.E., M.Sc., MBA, …), not TOC headings or workflow steps.
 * @param {string} name
 */
export function isLikelyProgrammeOfferingName(name) {
  const cleaned = cleanOfferingName(name);
  if (!cleaned || cleaned.length < 5 || cleaned.length > 160) return false;
  if (SKIP_NAME.test(cleaned)) return false;
  if (SECTION_OR_STEP.test(cleaned)) return false;
  if (/^\d+[\.)]\s/.test(cleaned)) return false;
  return DEGREE_TOKEN.test(cleaned);
}

/**
 * Drop TOC headings / workflow steps that models often mis-label as offerings.
 * @param {Array<{ name?: string, description?: string, documentExcerpt?: string }>} offerings
 */
export function filterProgrammeOfferings(offerings) {
  const seen = new Set();
  const out = [];
  for (const o of offerings ?? []) {
    const name = cleanOfferingName(o?.name);
    if (!isLikelyProgrammeOfferingName(name)) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      name,
      description: String(o.description ?? '').trim(),
      documentExcerpt: String(o.documentExcerpt ?? name).trim().slice(0, 500),
    });
  }
  return out;
}

/**
 * @param {string} docText
 * @returns {Array<{ name: string, description: string, documentExcerpt: string }>}
 */
export function extractStructuredOfferingsFromText(docText) {
  if (!docText?.trim()) return [];

  /** @type {Map<string, { name: string, description: string, documentExcerpt: string }>} */
  const byKey = new Map();

  const add = (rawName, excerpt) => {
    const name = cleanOfferingName(rawName).replace(/^\d+(?:\.\d+)*\.?\s+/, '');
    if (!isLikelyProgrammeOfferingName(name)) return;
    const key = name.toLowerCase();
    if (byKey.has(key)) return;
    byKey.set(key, {
      name,
      description: '',
      documentExcerpt: excerpt.slice(0, 500),
    });
  };

  OFFERING_NAME_BLOCK.lastIndex = 0;
  CATALOGUE_INDEX_LINE.lastIndex = 0;
  PROGRAMME_TITLE_LINE.lastIndex = 0;

  for (const match of docText.matchAll(OFFERING_NAME_BLOCK)) {
    const name = match[1] ?? '';
    add(name, `Offering Name: ${cleanOfferingName(name)}`);
  }

  // Numbered catalogue index — only inside a real catalogue slice, never the whole TOC.
  const catalogueSection =
    sliceBetween(docText, /PART H[^\n]*PROGRAMME CATALOGUE/i, /PART I[^\n]*PROGRAMME DETAILS/i) ||
    sliceBetween(
      docText,
      /programmes covered in this document/i,
      /general admissions operational/i,
    );

  const numberedSource = catalogueSection || (byKey.size === 0 ? docText : '');
  if (numberedSource) {
    CATALOGUE_INDEX_LINE.lastIndex = 0;
    for (const match of numberedSource.matchAll(CATALOGUE_INDEX_LINE)) {
      add(match[1] ?? '', String(match[0]).trim());
    }
  }

  PROGRAMME_TITLE_LINE.lastIndex = 0;
  for (const match of docText.matchAll(PROGRAMME_TITLE_LINE)) {
    add(match[1] ?? '', String(match[0]).trim());
  }

  return [...byKey.values()].slice(0, 80);
}

/**
 * Build a prompt-sized document for insights: keep control + common policy +
 * catalogue + offering headers so large real-college docs do not time out.
 * @param {string} docText
 * @param {number} [maxChars]
 */
export function prepareInsightsDocumentText(docText, maxChars = 55_000) {
  const text = docText?.trim() ?? '';
  if (!text) return '';
  if (text.length <= maxChars) return text;

  const offerings = extractStructuredOfferingsFromText(text);
  const commonPolicy = sliceBetween(
    text,
    /PART G[^\n]*COMMON ADMISSIONS/i,
    /PART H[^\n]*PROGRAMME CATALOGUE/i,
  );
  const catalogue = sliceBetween(
    text,
    /PART H[^\n]*PROGRAMME CATALOGUE/i,
    /PART I[^\n]*PROGRAMME DETAILS/i,
  );
  const head = text.slice(0, 12_000);

  const offeringLines =
    offerings.length > 0
      ? offerings.map((o) => `- Offering Name: ${o.name}`).join('\n')
      : '';

  const sampleDetails = extractOfferingDetailSamples(text, 8, 1_800);

  const compact = [
    head,
    commonPolicy ? `\n\n--- COMMON ADMISSIONS POLICY (excerpt) ---\n${commonPolicy.slice(0, 18_000)}` : '',
    catalogue ? `\n\n--- PROGRAMME CATALOGUE INDEX ---\n${catalogue.slice(0, 12_000)}` : '',
    offeringLines ? `\n\n--- EXTRACTED OFFERING NAMES ---\n${offeringLines}` : '',
    sampleDetails ? `\n\n--- SAMPLE PROGRAMME DETAILS ---\n${sampleDetails}` : '',
    '\n\n[Document truncated for analysis. suggestedOfferings must list only named degree programmes — never table-of-contents titles or workflow steps.]',
  ]
    .join('')
    .slice(0, maxChars);

  return compact;
}

/**
 * @param {string} name
 */
function cleanOfferingName(name) {
  return String(name ?? '')
    .replace(/-{2,}/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\[PROPOSED\].*$/i, (m) => m.trim())
    .trim();
}

/**
 * Return the document slice for one offering.
 * Keeps eligibility/document extraction fast and accurate on large corpora.
 * @param {string} docText
 * @param {string} offeringName
 * @param {number} [maxChars]
 */
export function focusDocumentForOffering(docText, offeringName, maxChars = 28_000) {
  const text = docText?.trim() ?? '';
  const target = cleanOfferingName(offeringName).toLowerCase();
  if (!text || !target) return text.slice(0, maxChars);

  const matched = findOfferingBlock(text, target);
  if (matched) {
    return matched.slice(0, maxChars);
  }

  const family = sliceBetween(
    text,
    /SECTION A[^\n]*PROGRAMME FAMILY DEFAULTS/i,
    /SECTION B[^\n]*OFFERING-SPECIFIC/i,
  );
  const commonG = sliceBetween(
    text,
    /PART G[^\n]*COMMON ADMISSIONS/i,
    /PART H[^\n]*PROGRAMME CATALOGUE/i,
  );

  const focused = [
    family ? `--- PROGRAMME FAMILY DEFAULTS ---\n${family.slice(0, 10_000)}` : '',
    commonG ? `\n\n--- COMMON ADMISSIONS POLICY ---\n${commonG.slice(0, 10_000)}` : '',
    `\n\n--- FULL DOCUMENT EXCERPT ---\n${text.slice(0, 12_000)}`,
  ]
    .join('')
    .trim();

  return (focused || text).slice(0, maxChars);
}

/**
 * @param {string} text
 * @param {string} targetLower
 */
function findOfferingBlock(text, targetLower) {
  const blocks = text.split(/(?=----- Offering Name:)/i);
  for (const block of blocks) {
    const header = block.match(/Offering Name:\s*(.+?)(?:\s*-{3,}|\n|$)/i);
    if (!header) continue;
    const name = cleanOfferingName(header[1]).toLowerCase();
    if (name === targetLower || name.includes(targetLower) || targetLower.includes(name)) {
      const nextIdx = block.search(/\n----- Offering Name:/i);
      return (nextIdx > 0 ? block.slice(0, nextIdx) : block).trim();
    }
  }
  return '';
}

const EXTRACTABLE_RULE_LINE =
  /field:\s*([^|]+)\|\s*fieldType:\s*(numeric|text|boolean)\s*\|\s*operator:\s*(eq|neq|gte|lte|gt|lt)\s*\|\s*value:\s*([^|]+?)(?:\s*\|\s*documentExcerpt:\s*[""]?(.+?)[""]?\s*)?$/gim;

/**
 * Parse "Extractable rules:" lines for a specific offering from structured docs.
 * @param {string} docText
 * @param {string} offeringName
 * @returns {Array<{ field: string, fieldType: 'numeric'|'text'|'boolean', operator: string, value: string|number|boolean, documentExcerpt: string }>}
 */
export function extractEligibilityRulesFromText(docText, offeringName) {
  const target = cleanOfferingName(offeringName).toLowerCase();
  const matchedBlock = findOfferingBlock(docText ?? '', target);
  const focused = matchedBlock || focusDocumentForOffering(docText, offeringName, 40_000);
  if (!focused.trim()) return [];

  const rules = [];
  for (const match of focused.matchAll(EXTRACTABLE_RULE_LINE)) {
    const field = String(match[1] ?? '').trim();
    const fieldType = /** @type {'numeric'|'text'|'boolean'} */ (String(match[2]).trim());
    const operator = String(match[3]).trim();
    let valueRaw = String(match[4] ?? '').trim();
    const excerpt = String(match[5] ?? `${field} ${operator} ${valueRaw}`).trim().slice(0, 500);

    if (!field) continue;

    /** @type {string|number|boolean} */
    let value = valueRaw;
    if (fieldType === 'numeric') {
      const num = Number(String(valueRaw).replace(/%/g, '').trim());
      if (Number.isNaN(num)) continue;
      value = num;
    } else if (fieldType === 'boolean') {
      const lower = valueRaw.toLowerCase();
      value = lower === 'true' || lower === 'mandatory' || lower === 'yes' || lower === '1';
    }

    rules.push({
      field,
      fieldType,
      operator,
      value,
      documentExcerpt: excerpt || `field: ${field} | operator: ${operator} | value: ${valueRaw}`,
    });
  }

  const seen = new Set();
  return rules
    .filter((r) => {
      const key = `${r.field}|${r.operator}|${String(r.value)}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 20);
}

/**
 * Merge AI eligibility with deterministic extractable-rule lines.
 * @param {Array} aiRules
 * @param {Array} structuredRules
 */
export function mergeEligibilityRules(aiRules, structuredRules) {
  const out = [];
  const seen = new Set();
  for (const r of [...(aiRules ?? []), ...(structuredRules ?? [])]) {
    if (!r?.field) continue;
    const key = `${String(r.field).toLowerCase()}|${r.operator}|${String(r.value)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      field: String(r.field).trim(),
      fieldType: r.fieldType,
      operator: r.operator,
      value: r.value,
      documentExcerpt: String(r.documentExcerpt ?? '').trim().slice(0, 500) || undefined,
    });
  }
  return out.slice(0, 20);
}

const EXTRACTABLE_DOC_LINE =
  /^\s*-?\s*name:\s*([^|\n]+)\|\s*required:\s*(true|false)\s*\|\s*allowedTypes:\s*([^|\n]+)\|\s*maxSizeMb:\s*(\d+)\s*(?:\|\s*documentExcerpt:\s*"?([^"\n]+)"?\s*)?$/gim;

/**
 * @param {string} docText
 * @param {string} offeringName
 */
export function extractDocumentRequirementsFromText(docText, offeringName) {
  const matched = findOfferingBlock(docText ?? '', cleanOfferingName(offeringName).toLowerCase());
  const common = sliceBetween(
    docText ?? '',
    /1\.1 COMMON REQUIRED DOCUMENTS/i,
    /1\.2 COMMON APPLICATION WORKFLOW/i,
  );
  // Prefer offering-local Extractable documents block; fall back to common list.
  const offeringDocsSection =
    matched.match(/Extractable documents:([\s\S]*?)(?:\nWORKFLOW|\nQUEUE|\nPAYMENT|\n----- Offering Name:|$)/i)?.[1] ||
    '';
  const focused = offeringDocsSection.trim()
    ? offeringDocsSection
    : [matched, common].filter(Boolean).join('\n\n');
  if (!focused.trim()) return [];

  const docs = [];
  const seen = new Set();
  for (const match of focused.matchAll(EXTRACTABLE_DOC_LINE)) {
    const name = String(match[1] ?? '').trim();
    if (!name || name.length > 120) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const allowedTypes = String(match[3] ?? 'pdf')
      .split(/[,\s]+/)
      .map((t) => t.trim().toLowerCase())
      .filter((t) => ['pdf', 'jpg', 'jpeg', 'png'].includes(t));

    docs.push({
      name,
      required: String(match[2]).toLowerCase() === 'true',
      allowedTypes: allowedTypes.length ? allowedTypes : ['pdf'],
      maxSizeMb: Math.min(25, Math.max(1, Number(match[4]) || 5)),
      documentExcerpt: String(match[5] ?? `${name} is required`).trim().slice(0, 500),
    });
  }
  return docs.slice(0, 25);
}

/**
 * @param {Array} aiDocs
 * @param {Array} structuredDocs
 */
export function mergeDocumentRequirements(aiDocs, structuredDocs) {
  const out = [];
  const seen = new Set();
  for (const d of [...(aiDocs ?? []), ...(structuredDocs ?? [])]) {
    const name = String(d?.name ?? '').trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      name,
      required: d.required !== false,
      allowedTypes: Array.isArray(d.allowedTypes) && d.allowedTypes.length ? d.allowedTypes : ['pdf'],
      maxSizeMb: Number(d.maxSizeMb) || 5,
      documentExcerpt: d.documentExcerpt ? String(d.documentExcerpt).slice(0, 500) : undefined,
    });
  }
  return out.slice(0, 25);
}

/**
 * Parse queue / appointment / virtual settings from structured operational docs.
 * @param {string} docText
 * @param {string} offeringName
 */
export function extractQueueSettingsFromText(docText, offeringName) {
  const matched = findOfferingBlock(docText ?? '', cleanOfferingName(offeringName).toLowerCase());
  const common = sliceBetween(
    docText ?? '',
    /1\.3 COMMON QUEUE/i,
    /1\.4 COMMON PAYMENT/i,
  );
  const offeringQueue =
    matched.match(/\nQUEUE(?:\s*&\s*APPOINTMENT)?[^\n]*\n([\s\S]*?)(?=\nPAYMENT|\n----- Offering Name:|$)/i)?.[0] ||
    matched.match(/^QUEUE(?:\s*&\s*APPOINTMENT)?[^\n]*\n([\s\S]*?)(?=\nPAYMENT|\n----- Offering Name:|$)/im)?.[0] ||
    '';
  const focused = offeringQueue.trim() || common || '';
  if (!focused.trim()) return null;

  const modeMatch = focused.match(/queueMode:\s*(hybrid|queue_only|appointment_only)/i);
  if (!modeMatch && !/QUEUE/i.test(focused)) return null;
  const queueMode = (modeMatch?.[1] || 'hybrid').toLowerCase();

  const capacity = Number(focused.match(/(?:queueConfig\.)?capacity:\s*(\d+)/i)?.[1]);
  const rate = Number(
    focused.match(/(?:queueConfig\.)?processingRatePerHour:\s*(\d+)/i)?.[1],
  );
  const slotDuration = Number(
    focused.match(/(?:appointmentConfig\.)?slotDurationMinutes:\s*(\d+)/i)?.[1],
  );
  const slotCapacity = Number(
    focused.match(/(?:appointmentConfig\.)?slotCapacity:\s*(\d+)/i)?.[1],
  );
  const start =
    focused.match(/(?:appointmentConfig\.)?operatingHoursStart:\s*([0-9]{2}:[0-9]{2})/i)?.[1] ??
    null;
  const end =
    focused.match(/(?:appointmentConfig\.)?operatingHoursEnd:\s*([0-9]{2}:[0-9]{2})/i)?.[1] ??
    null;

  const excerptMatch = focused.match(/documentExcerpt:\s*"([^"]{10,400})"/i);
  const excerpt =
    excerptMatch?.[1]?.trim() ||
    `queueMode: ${queueMode}; virtual appointments as stated in operational config`;

  /** @type {Record<string, unknown>} */
  const payload = {
    queueMode,
    queueConfig: null,
    appointmentConfig: null,
    documentExcerpt: excerpt.slice(0, 500),
  };

  if (queueMode === 'queue_only' || queueMode === 'hybrid') {
    payload.queueConfig = {
      capacity: Number.isFinite(capacity) && capacity > 0 ? capacity : 120,
      processingRatePerHour: Number.isFinite(rate) && rate > 0 ? rate : 20,
    };
  }

  if (queueMode === 'appointment_only' || queueMode === 'hybrid') {
    payload.appointmentConfig = {
      slotDurationMinutes:
        Number.isFinite(slotDuration) && slotDuration >= 5 ? slotDuration : 20,
      slotCapacity: Number.isFinite(slotCapacity) && slotCapacity >= 1 ? slotCapacity : 1,
      operatingHoursStart: start || '09:30',
      operatingHoursEnd: end || '17:30',
    };
  }

  return payload;
}

/**
 * Parse payment settings for admin reference / future extract.
 * @param {string} docText
 * @param {string} offeringName
 */
export function extractPaymentSettingsFromText(docText, offeringName) {
  const matched = findOfferingBlock(docText ?? '', cleanOfferingName(offeringName).toLowerCase());
  const common = sliceBetween(
    docText ?? '',
    /1\.4 COMMON PAYMENT/i,
    /PART 2/i,
  );
  const offeringPayment =
    matched.match(/\nPAYMENT[^\n]*\n([\s\S]*?)(?=\n----- Offering Name:|$)/i)?.[0] ||
    matched.match(/^PAYMENT[^\n]*\n([\s\S]*?)(?=\n----- Offering Name:|$)/im)?.[0] ||
    '';
  const focused = offeringPayment.trim() || common;
  if (!focused.trim()) return null;

  const enabledMatch =
    focused.match(/payment\.enabled:\s*(true|false)/i) ||
    focused.match(/PAYMENT:[\s\S]*?enabled\s*:?\s*(true|false)/i) ||
    focused.match(/enabled\s*:?\s*(true|false)/i);
  if (!enabledMatch) return null;

  const amount = Number(
    focused.match(/payment\.amount:\s*(\d+)/i)?.[1] ||
      focused.match(/amount:\s*(\d+)/i)?.[1] ||
      focused.match(/INR\s*(\d+)/i)?.[1],
  );
  const currency =
    focused.match(/payment\.currency:\s*([A-Z]{3})/i)?.[1] ||
    focused.match(/currency:\s*([A-Z]{3})/i)?.[1] ||
    'INR';
  const label =
    focused.match(/payment\.label:\s*([^\n]+)/i)?.[1]?.trim() ||
    focused.match(/label:\s*([^;\n]+)/i)?.[1]?.trim() ||
    'Application processing fee';
  const timingRaw =
    focused.match(/payment\.timing:\s*(workflow_step|before_submit)/i)?.[1] ||
    focused.match(/timing:\s*(workflow_step|before_submit)/i)?.[1] ||
    'workflow_step';
  const workflowStepName =
    focused.match(/payment\.workflowStepName:\s*([^\n]+)/i)?.[1]?.trim() ||
    focused.match(/workflowStepName:\s*([^;\n]+)/i)?.[1]?.trim() ||
    'Fee Payment';

  const excerptMatch = focused.match(/documentExcerpt:\s*"([^"]{10,400})"/i);

  return {
    enabled: String(enabledMatch[1]).toLowerCase() === 'true',
    amount: Number.isFinite(amount) && amount > 0 ? amount : 1000,
    currency,
    label,
    timing: timingRaw,
    workflowStepName,
    documentExcerpt:
      excerptMatch?.[1]?.trim()?.slice(0, 500) ||
      `${label} ${amount || 1000} ${currency}`,
  };
}

/**
 * @param {string} text
 * @param {RegExp} startRe
 * @param {RegExp} endRe
 */
function sliceBetween(text, startRe, endRe) {
  const start = text.search(startRe);
  if (start < 0) return '';
  const from = text.slice(start);
  const endMatch = from.search(endRe);
  if (endMatch > 0) return from.slice(0, endMatch).trim();
  return from.slice(0, 20_000).trim();
}

/**
 * @param {string} text
 * @param {number} maxBlocks
 * @param {number} maxCharsEach
 */
function extractOfferingDetailSamples(text, maxBlocks, maxCharsEach) {
  const parts = text.split(/(?=----- Offering Name:)/i).filter((p) => /Offering Name:/i.test(p));
  if (!parts.length) return '';
  const step = Math.max(1, Math.floor(parts.length / maxBlocks));
  const samples = [];
  for (let i = 0; i < parts.length && samples.length < maxBlocks; i += step) {
    samples.push(parts[i].slice(0, maxCharsEach).trim());
  }
  return samples.join('\n\n');
}

/**
 * Merge AI offerings with deterministic extractions (deterministic fills gaps).
 * @param {Array<{ name: string, description?: string, documentExcerpt: string }>} aiOfferings
 * @param {Array<{ name: string, description?: string, documentExcerpt: string }>} structuredOfferings
 */
export function mergeSuggestedOfferings(aiOfferings, structuredOfferings) {
  return filterProgrammeOfferings([...(aiOfferings ?? []), ...(structuredOfferings ?? [])]);
}
