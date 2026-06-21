const MAX_AVATAR_BYTES = 500 * 1024;

/**
 * @param {string} src
 */
function createImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () => reject(new Error('Could not load image')));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = src;
  });
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {string} type
 * @param {number} quality
 */
function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Could not prepare image'));
          return;
        }
        resolve(blob);
      },
      type,
      quality,
    );
  });
}

/**
 * @param {string} imageSrc
 * @param {{ x: number, y: number, width: number, height: number }} pixelCrop
 * @param {number} [maxBytes]
 */
export async function getCroppedAvatarBlob(imageSrc, pixelCrop, maxBytes = MAX_AVATAR_BYTES) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Could not prepare image');
  }

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  context.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  let quality = 0.92;
  let blob = await canvasToBlob(canvas, 'image/jpeg', quality);

  while (blob.size > maxBytes && quality > 0.45) {
    quality -= 0.08;
    blob = await canvasToBlob(canvas, 'image/jpeg', quality);
  }

  if (blob.size > maxBytes) {
    throw new Error('Image is too large after cropping. Try zooming in or choose a smaller photo.');
  }

  return blob;
}

export { MAX_AVATAR_BYTES };

/**
 * @param {string | null | undefined} avatarUrl
 */
export function resolveAvatarUrl(avatarUrl) {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith('http')) return avatarUrl;
  return avatarUrl;
}

/**
 * @param {string} name
 */
export function getInitials(name) {
  return (name ?? 'ST')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

/**
 * @param {number} bytes
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}
