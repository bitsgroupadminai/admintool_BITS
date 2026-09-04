import fs from 'fs';
import path from 'path';
import { logger } from '../../core/logger/index.js';

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
 * Browsers/OS often send octet-stream or empty mime for PDFs.
 * @param {string} filePath
 * @param {string} [mimeType]
 */
function resolveExtractKind(filePath, mimeType = '') {
  const mime = (mimeType || '').toLowerCase();
  const ext = path.extname(filePath).toLowerCase();

  if (mime === 'application/pdf' || mime === 'application/x-pdf' || ext === '.pdf') {
    return 'pdf';
  }
  if (
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mime === 'application/msword' ||
    ext === '.docx' ||
    ext === '.doc'
  ) {
    return 'docx';
  }
  if (mime === 'text/plain' || mime === 'text/markdown' || ext === '.txt' || ext === '.md') {
    return 'text';
  }
  return 'unknown';
}

/**
 * @param {string} filePath
 * @param {string} mimeType
 * @returns {Promise<string>}
 */
export async function extractTextFromDocument(filePath, mimeType) {
  if (!fs.existsSync(filePath)) {
    logger.warn({ filePath }, 'Knowledge file missing on disk during text extract');
    return '';
  }

  const kind = resolveExtractKind(filePath, mimeType);
  let text = '';

  if (kind === 'pdf') {
    text = await extractPdfText(filePath);
  } else if (kind === 'docx') {
    text = await extractDocxText(filePath);
  } else if (kind === 'text') {
    text = fs.readFileSync(filePath, 'utf8');
  }

  return normalizeExtractedText(text).slice(0, MAX_EXTRACT_CHARS);
}

/**
 * pdf-parse v2 uses PDFParse({ data }).getText(), not the v1 default function(buffer).
 * @param {string} filePath
 */
async function extractPdfText(filePath) {
  let parser;
  try {
    const { PDFParse } = await import('pdf-parse');
    const buffer = fs.readFileSync(filePath);
    parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    return result?.text ?? '';
  } catch (err) {
    logger.error({ err, filePath }, 'PDF text extraction failed');
    return '';
  } finally {
    if (parser) {
      await parser.destroy().catch(() => {});
    }
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
  } catch (err) {
    logger.error({ err, filePath }, 'DOCX text extraction failed');
    return '';
  }
}

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

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

  if (resolveExtractKind(filePath, mimeType) === 'pdf') {
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

    if (!text && doc.filePath) {
      text = await extractTextFromDocument(doc.filePath, doc.mimeType);
    }

    if (text) {
      parts.push(`--- ${doc.originalName ?? 'Document'} ---\n${text}`);
    }
  }

  return parts.join('\n\n').slice(0, MAX_EXTRACT_CHARS);
}
