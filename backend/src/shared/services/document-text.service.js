import fs from 'fs';

/** Per-document and combined-corpus cap (real prospectuses exceed the old 80k limit). */
const MAX_EXTRACT_CHARS = 200_000;

/**
 * Keep paragraph/list structure for chunking while normalizing noisy PDF whitespace.
 * @param {string} text
 */
function normalizeExtractedText(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * @param {string} filePath
 * @param {string} mimeType
 * @returns {Promise<string>}
 */
export async function extractTextFromDocument(filePath, mimeType) {
  if (!fs.existsSync(filePath)) {
    return '';
  }

  let text = '';

  if (mimeType === 'application/pdf') {
    text = await extractPdfText(filePath);
  } else if (
    mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  ) {
    text = await extractDocxText(filePath);
  } else if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
    text = fs.readFileSync(filePath, 'utf8');
  }

  return normalizeExtractedText(text).slice(0, MAX_EXTRACT_CHARS);
}

/**
 * @param {string} filePath
 */
async function extractPdfText(filePath) {
  try {
    const pdfParse = (await import('pdf-parse')).default;
    const buffer = fs.readFileSync(filePath);
    const result = await pdfParse(buffer);
    return result.text ?? '';
  } catch {
    return '';
  }
}

/**
 * @param {string} filePath
 */
async function extractDocxText(filePath) {
  try {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value ?? '';
  } catch {
    return '';
  }
}

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png']);

/** Cap text sent to the verification model per document (keeps prompts small). */
const MAX_VERIFY_TEXT_CHARS = 12_000;

/**
 * Decide how a single uploaded file should be fed to the AI verifier:
 * - images -> base64 data URL for a vision model
 * - text-based PDF/DOCX/TXT -> extracted text
 * - scanned PDF (no text layer) or unknown -> unreadable (escalate to staff)
 *
 * @param {string} filePath
 * @param {string} mimeType
 * @returns {Promise<{ kind: 'image' | 'text' | 'unreadable', text?: string, dataUrl?: string, reason?: string }>}
 */
export async function prepareDocumentForVerification(filePath, mimeType) {
  if (!filePath || !fs.existsSync(filePath)) {
    return { kind: 'unreadable', reason: 'File is missing on the server' };
  }

  if (IMAGE_MIME_TYPES.has(mimeType)) {
    try {
      const buffer = fs.readFileSync(filePath);
      const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
      return { kind: 'image', dataUrl };
    } catch {
      return { kind: 'unreadable', reason: 'Image could not be read' };
    }
  }

  const text = await extractTextFromDocument(filePath, mimeType);
  const trimmed = text.trim();

  if (trimmed.length >= 20) {
    return { kind: 'text', text: trimmed.slice(0, MAX_VERIFY_TEXT_CHARS) };
  }

  if (mimeType === 'application/pdf') {
    return {
      kind: 'unreadable',
      reason: 'PDF appears to be scanned with no extractable text layer',
    };
  }

  return { kind: 'unreadable', reason: 'No readable content found in the file' };
}

/**
 * @param {Array<{ extractedText?: string, filePath?: string, mimeType?: string, originalName?: string }>} documents
 */
export async function buildCombinedDocumentText(documents) {
  const parts = [];

  for (const doc of documents) {
    let text = doc.extractedText?.trim() ?? '';

    if (!text && doc.filePath && doc.mimeType) {
      text = await extractTextFromDocument(doc.filePath, doc.mimeType);
    }

    if (text) {
      parts.push(`--- ${doc.originalName ?? 'Document'} ---\n${text}`);
    }
  }

  return parts.join('\n\n').slice(0, MAX_EXTRACT_CHARS);
}
