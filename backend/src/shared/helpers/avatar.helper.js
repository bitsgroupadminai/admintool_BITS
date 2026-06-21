import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { AVATAR_UPLOAD_ROOT } from '../../core/config/upload.js';

const uploadsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../uploads');

/**
 * @param {string | null | undefined} avatarUrl
 */
export async function deleteAvatarFile(avatarUrl) {
  if (!avatarUrl) return;

  const relativePath = avatarUrl.replace(/^\/uploads\//, '');
  const absolutePath = path.resolve(uploadsRoot, relativePath);

  if (!absolutePath.startsWith(AVATAR_UPLOAD_ROOT)) {
    return;
  }

  try {
    await fs.unlink(absolutePath);
  } catch {
    // Ignore missing files during cleanup.
  }
}
