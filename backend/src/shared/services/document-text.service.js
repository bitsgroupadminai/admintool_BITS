import fs from 'fs';

const MAX_EXTRACT_CHARS = 80_000;

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
  }

  return text.replace(/\s+/g, ' ').trim().slice(0, MAX_EXTRACT_CHARS);
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
