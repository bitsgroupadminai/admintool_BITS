import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { env } from './env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_ROOT = path.resolve(__dirname, '../../../uploads/knowledge');
export const APPLICATION_UPLOAD_ROOT = path.resolve(__dirname, '../../../uploads/applications');
export const AVATAR_UPLOAD_ROOT = path.resolve(__dirname, '../../../uploads/avatars');

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const STUDENT_IMPORT_MIME_TYPES = new Set([
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

const APPLICATION_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);

if (!fs.existsSync(UPLOAD_ROOT)) {
  fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
}

if (!fs.existsSync(APPLICATION_UPLOAD_ROOT)) {
  fs.mkdirSync(APPLICATION_UPLOAD_ROOT, { recursive: true });
}

if (!fs.existsSync(AVATAR_UPLOAD_ROOT)) {
  fs.mkdirSync(AVATAR_UPLOAD_ROOT, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_ROOT);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`);
  },
});

/**
 * Knowledge document upload (PDF and DOCX).
 */
export const knowledgeUpload = multer({
  storage,
  limits: { fileSize: env.MAX_KNOWLEDGE_FILE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error('Only PDF and DOCX files are supported'));
    }
    cb(null, true);
  },
});

/**
 * Student account import upload (CSV and XLSX).
 */
export const studentImportUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (STUDENT_IMPORT_MIME_TYPES.has(file.mimetype) || ['.csv', '.xlsx'].includes(extension)) {
      cb(null, true);
      return;
    }
    cb(new Error('Only CSV and XLSX files are supported'));
  },
});

const applicationStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, APPLICATION_UPLOAD_ROOT);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`);
  },
});

/**
 * Student application document upload (PDF, JPG, PNG).
 */
export const applicationDocumentUpload = multer({
  storage: applicationStorage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!APPLICATION_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error('Only PDF, JPG, and PNG files are supported'));
    }
    cb(null, true);
  },
});

const AVATAR_MAX_BYTES = 500 * 1024;

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, AVATAR_UPLOAD_ROOT);
  },
  filename: (req, file, cb) => {
    const ext = file.mimetype === 'image/png' ? 'png' : 'jpg';
    cb(null, `${req.user.userId}-${Date.now()}.${ext}`);
  },
});

/**
 * Profile avatar upload (JPG and PNG, max 500 KB).
 */
export const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: AVATAR_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!['image/jpeg', 'image/png'].includes(file.mimetype)) {
      return cb(new Error('Only JPG and PNG images up to 500 KB are supported'));
    }
    cb(null, true);
  },
});

export { AVATAR_MAX_BYTES };
