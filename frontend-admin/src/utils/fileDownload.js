export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function extractFilename(contentDisposition, fallback) {
  if (!contentDisposition) return fallback;
  const match = contentDisposition.match(/filename="([^"]+)"/);
  return match?.[1] ?? fallback;
}

/**
 * Persist an axios blob response as a file download.
 * @param {import('axios').AxiosResponse} response
 * @param {string} fallbackName
 */
export function downloadAxiosBlob(response, fallbackName) {
  const filename = extractFilename(response.headers['content-disposition'], fallbackName);
  const contentType = response.headers['content-type'] || 'application/octet-stream';
  const blob = response.data instanceof Blob
    ? response.data
    : new Blob([response.data], { type: contentType });
  downloadBlob(blob, filename);
}
