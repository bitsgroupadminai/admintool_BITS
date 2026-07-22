/**
 * Split long text into overlapping chunks for embedding.
 * Prefers paragraph, then line, then sentence boundaries so programme lists stay coherent.
 * @param {string} text
 * @param {{ chunkSize?: number, overlap?: number }} [options]
 * @returns {string[]}
 */
export function chunkText(text, options = {}) {
  const chunkSize = options.chunkSize ?? 900;
  const overlap = options.overlap ?? 150;
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  if (normalized.length <= chunkSize) {
    return [normalized];
  }

  const chunks = [];
  let start = 0;

  while (start < normalized.length) {
    let end = Math.min(start + chunkSize, normalized.length);

    if (end < normalized.length) {
      const slice = normalized.slice(start, end);
      const breakAt = Math.max(
        slice.lastIndexOf('\n\n'),
        slice.lastIndexOf('\n'),
        slice.lastIndexOf('. '),
      );
      if (breakAt > chunkSize * 0.4) {
        const isSentence = slice[breakAt] === '.';
        end = start + breakAt + (isSentence ? 2 : 1);
      }
    }

    const piece = normalized.slice(start, end).trim();
    if (piece) chunks.push(piece);

    if (end >= normalized.length) break;
    start = Math.max(0, end - overlap);
  }

  return chunks;
}
