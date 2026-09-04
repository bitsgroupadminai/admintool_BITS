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
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

/** Cap text sent to the verification model per document (keeps prompts small). */
const MAX_VERIFY_TEXT_CHARS = 12_000;
const MAX_VERIFY_PDF_PAGES = 2;
const PDF_SCREENSHOT_WIDTH = 1280;

/**
 * @param {Buffer} buffer
 * @returns {string | null}
 */
function sniffImageMime(buffer) {
  if (!buffer?.length) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'image/png';
  }
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

function normalizeMime(mimeType = '') {
  return String(mimeType)
    .toLowerCase()
    .split(';')[0]
    .trim();
}

function pageScreenshotDataUrl(page) {
  if (typeof page?.dataUrl === 'string' && page.dataUrl.startsWith('data:')) return page.dataUrl;
  if (typeof page?.data === 'string' && page.data.startsWith('data:')) return page.data;
  const buffer = page?.data ?? page?.buffer;
  if (Buffer.isBuffer(buffer) && buffer.length) {
    return `data:image/png;base64,${buffer.toString('base64')}`;
  }
  return null;
}

/**
 * Render the first pages of a PDF so the vision model can read marks tables
 * that live in the visual layout rather than a text layer.
 * @param {string} filePath
 * @returns {Promise<string[]>}
 */
async function screenshotPdfPages(filePath) {
  let parser;
  try {
    const { PDFParse } = await import('pdf-parse');
    parser = new PDFParse({ data: fs.readFileSync(filePath) });
    const result = await parser.getScreenshot({
      first: MAX_VERIFY_PDF_PAGES,
      desiredWidth: PDF_SCREENSHOT_WIDTH,
      imageBuffer: false,
      imageDataUrl: true,
    });
    return (result?.pages ?? []).map(pageScreenshotDataUrl).filter(Boolean);
  } catch (err) {
    logger.warn({ err, filePath }, 'PDF screenshot for AI verification failed');
    return [];
  } finally {
    if (parser) {
      await parser.destroy().catch(() => {});
    }
  }
}

/**
 * Decide how a single uploaded file should be fed to the AI verifier:
 * - images -> base64 data URL for a vision model
 * - PDFs -> page screenshots (and extracted text when a text layer exists)
 * - text-based DOCX/TXT -> extracted text
 * - unknown / unreadable -> escalate to staff
 *
 * @param {string} filePath
 * @param {string} mimeType
 * @returns {Promise<{ kind: 'image' | 'text' | 'unreadable', text?: string, dataUrl?: string, dataUrls?: string[], reason?: string }>}
 */
export async function prepareDocumentForVerification(filePath, mimeType) {
  if (!filePath || !fs.existsSync(filePath)) {
    return { kind: 'unreadable', reason: 'File is missing on the server' };
  }

  const mime = normalizeMime(mimeType);
  const ext = path.extname(filePath).toLowerCase();
  let buffer;
  try {
    buffer = fs.readFileSync(filePath);
  } catch {
    return { kind: 'unreadable', reason: 'File could not be read' };
  }

  const sniffedImage = sniffImageMime(buffer);
  const imageMime =
    sniffedImage ||
    (IMAGE_MIME_TYPES.has(mime) ? (mime === 'image/jpg' ? 'image/jpeg' : mime) : null) ||
    (IMAGE_EXTENSIONS.has(ext)
      ? ext === '.png'
        ? 'image/png'
        : ext === '.webp'
          ? 'image/webp'
          : 'image/jpeg'
      : null);

  if (imageMime) {
    return { kind: 'image', dataUrl: `data:${imageMime};base64,${buffer.toString('base64')}` };
  }

  const isPdf = resolveExtractKind(filePath, mime) === 'pdf';
  if (isPdf) {
    const [text, dataUrls] = await Promise.all([
      extractTextFromDocument(filePath, mime || 'application/pdf'),
      screenshotPdfPages(filePath),
    ]);
    const trimmed = text.trim();
    if (dataUrls.length) {
      return {
        kind: 'image',
        dataUrl: dataUrls[0],
        dataUrls,
        text: trimmed.length >= 20 ? trimmed.slice(0, MAX_VERIFY_TEXT_CHARS) : undefined,
      };
    }
    if (trimmed.length >= 20) {
      return { kind: 'text', text: trimmed.slice(0, MAX_VERIFY_TEXT_CHARS) };
    }
    return {
      kind: 'unreadable',
      reason: 'PDF appears to be scanned with no extractable text layer',
    };
  }

  const text = await extractTextFromDocument(filePath, mimeType);
  const trimmed = text.trim();
  if (trimmed.length >= 20) {
    return { kind: 'text', text: trimmed.slice(0, MAX_VERIFY_TEXT_CHARS) };
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
