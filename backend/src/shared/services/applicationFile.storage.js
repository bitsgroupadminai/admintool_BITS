import { createReadStream, createWriteStream, existsSync } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import mongoose from 'mongoose';
import { GridFSBucket, ObjectId } from 'mongodb';
import { APPLICATION_UPLOAD_ROOT } from '../../core/config/upload.js';
import { AppError } from '../../core/utils/AppError.js';
import { logger } from '../../core/logger/index.js';
import { resolveStoredApplicationFilePath } from '../helpers/applicationDocument.helper.js';

export const APPLICATION_FILES_BUCKET = 'applicationDocuments';

function getDb() {
  const db = mongoose.connection.db;
  if (!db) {
    throw new AppError('File storage is not ready. Try again in a moment.', 503);
  }
  return db;
}

function getBucket() {
  return new GridFSBucket(getDb(), { bucketName: APPLICATION_FILES_BUCKET });
}

function asObjectId(value) {
  const raw = String(value ?? '');
  if (!ObjectId.isValid(raw)) return null;
  return new ObjectId(raw);
}

/**
 * @param {Express.Multer.File} file
 * @returns {Promise<{ storageId: string, storedName: string, filePath: string }>}
 */
export async function storeApplicationUpload(file) {
  if (!file) {
    throw new AppError('Document file is required', 400);
  }

  const storedName = file.filename || `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const bucket = getBucket();

  const storageId = await new Promise((resolve, reject) => {
    const upload = bucket.openUploadStream(storedName, {
      contentType: file.mimetype,
      metadata: {
        originalName: file.originalname,
      },
    });
    const source = file.buffer ? Readable.from(file.buffer) : createReadStream(file.path);
    source.on('error', reject);
    upload.on('error', reject);
    upload.on('finish', () => resolve(upload.id.toString()));
    source.pipe(upload);
  });

  return {
    storageId,
    storedName,
    filePath: file.path || `gridfs:${storageId}`,
  };
}

/**
 * @param {Express.Multer.File} file
 */
export async function persistUploadedApplicationFile(file) {
  try {
    const stored = await storeApplicationUpload(file);
    return {
      originalName: file.originalname,
      storedName: stored.storedName,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      filePath: stored.filePath,
      storageId: stored.storageId,
      uploadedAt: new Date(),
    };
  } catch (error) {
    if (file?.path) {
      await fs.unlink(file.path).catch(() => {});
    }
    throw error;
  }
}

/**
 * @param {{ storageId?: string, filePath?: string, storedName?: string }} document
 */
export async function applicationFileExists(document) {
  const storageId = asObjectId(document?.storageId);
  if (storageId) {
    const file = await getDb().collection(`${APPLICATION_FILES_BUCKET}.files`).findOne({ _id: storageId });
    if (file) return true;
  }
  return Boolean(resolveStoredApplicationFilePath(document));
}

/**
 * @param {{ storageId?: string, filePath?: string, storedName?: string }} document
 * @returns {import('stream').Readable | null}
 */
export function openApplicationFileStream(document) {
  const storageId = asObjectId(document?.storageId);
  if (storageId) {
    return getBucket().openDownloadStream(storageId);
  }

  const filePath = resolveStoredApplicationFilePath(document);
  if (!filePath) return null;
  return createReadStream(filePath);
}

/**
 * Restore a GridFS file onto local disk when the API host does not have a copy.
 * @param {{ storageId?: string, filePath?: string, storedName?: string }} document
 * @returns {Promise<string | null>}
 */
export async function ensureApplicationFileLocal(document) {
  const existing = resolveStoredApplicationFilePath(document);
  if (existing) return existing;

  const storageId = asObjectId(document?.storageId);
  if (!storageId) return null;

  const destName = document.storedName || storageId.toString();
  const dest = path.join(APPLICATION_UPLOAD_ROOT, path.basename(destName));
  if (existsSync(dest)) return dest;

  await fs.mkdir(APPLICATION_UPLOAD_ROOT, { recursive: true });
  await pipeline(getBucket().openDownloadStream(storageId), createWriteStream(dest));
  return dest;
}

/**
 * @param {string | undefined} filePath
 */
export async function removeStoredApplicationFile(filePath) {
  if (!filePath || String(filePath).startsWith('gridfs:')) return;
  try {
    await fs.unlink(filePath);
  } catch {
    // Ignore missing files during cleanup.
  }
}

/**
 * @param {{ storageId?: string, filePath?: string }} document
 */
export async function deleteStoredApplicationDocument(document) {
  const storageId = asObjectId(document?.storageId);
  if (storageId) {
    try {
      await getBucket().delete(storageId);
    } catch (err) {
      logger.warn({ err, storageId: document.storageId }, 'Failed to delete stored application file');
    }
  }
  await removeStoredApplicationFile(document?.filePath);
}
