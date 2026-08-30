import fs from 'fs';
import path from 'path';
import { APPLICATION_UPLOAD_ROOT } from '../../core/config/upload.js';
import { DOCUMENT_FILE_TYPES } from '../enums/offering.enums.js';

const MIME_BY_TYPE = {
  pdf: ['application/pdf'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  png: ['image/png'],
};

const EXTENSION_BY_TYPE = {
  pdf: '.pdf',
  jpg: '.jpg',
  jpeg: '.jpeg',
  png: '.png',
};

/**
 * @param {import('../modules/offerings/offering.model.js').Offering['documentRequirements']} requirements
 */
/**
 * @param {import('../modules/offerings/offering.model.js').Offering['intakeDocument']} intakeDocument
 */
export function formatIntakeDocumentConfig(intakeDocument) {
  const label = intakeDocument?.label?.trim();
  if (!label) {
    return null;
  }

  return {
    id: intakeDocument._id.toString(),
    label,
    helpText: intakeDocument.helpText?.trim() ?? '',
    required: intakeDocument.required !== false,
    allowedTypes: intakeDocument.allowedTypes?.length ? intakeDocument.allowedTypes : ['pdf'],
    maxSizeMb: intakeDocument.maxSizeMb ?? 5,
  };
}

/**
 * @param {import('../modules/offerings/offering.model.js').Offering} offering
 */
export function getIntakeDocumentRequirement(offering) {
  const config = formatIntakeDocumentConfig(offering.intakeDocument);
  if (!config) {
    return null;
  }

  return {
    _id: offering.intakeDocument._id,
    name: config.label,
    required: config.required,
    allowedTypes: config.allowedTypes,
    maxSizeMb: config.maxSizeMb,
  };
}

export function formatDocumentRequirements(requirements = []) {
  return requirements.map((requirement) => ({
    id: requirement._id.toString(),
    name: requirement.name,
    required: requirement.required !== false,
    allowedTypes: requirement.allowedTypes ?? ['pdf'],
    maxSizeMb: requirement.maxSizeMb ?? 5,
  }));
}

/**
 * @param {import('../modules/offerings/offering.model.js').Offering} offering
 * @param {string} requirementId
 */
export function findDocumentRequirement(offering, requirementId) {
  return offering.documentRequirements?.find(
    (requirement) => requirement._id.toString() === requirementId,
  );
}

/**
 * @param {string} fileName
 */
function getFileExtension(fileName) {
  return path.extname(fileName).replace('.', '').toLowerCase();
}

/**
 * @param {string} mimeType
 */
function getExtensionFromMime(mimeType) {
  switch (mimeType) {
    case 'application/pdf':
      return 'pdf';
    case 'image/jpeg':
      return 'jpeg';
    case 'image/png':
      return 'png';
    default:
      return null;
  }
}

/**
 * @param {import('../modules/offerings/offering.model.js').Offering['documentRequirements'][number]} requirement
 * @param {Express.Multer.File} file
 */
export function validateUploadedFile(requirement, file) {
  const allowedTypes = requirement.allowedTypes?.length ? requirement.allowedTypes : ['pdf'];
  const extension = getFileExtension(file.originalname);
  const mimeExtension = getExtensionFromMime(file.mimetype);
  const normalizedAllowed = allowedTypes.map((type) => type.toLowerCase());

  const extensionAllowed =
    normalizedAllowed.includes(extension) ||
    (mimeExtension && normalizedAllowed.includes(mimeExtension));

  const mimeAllowed = normalizedAllowed.some((type) =>
    (MIME_BY_TYPE[type] ?? []).includes(file.mimetype),
  );

  if (!extensionAllowed && !mimeAllowed) {
    const labels = normalizedAllowed.map((type) => type.toUpperCase()).join(', ');
    return `Only ${labels} files are allowed for ${requirement.name}`;
  }

  const maxBytes = (requirement.maxSizeMb ?? 5) * 1024 * 1024;
  if (file.size > maxBytes) {
    return `${requirement.name} must be ${requirement.maxSizeMb ?? 5} MB or smaller`;
  }

  return null;
}

/**
 * @param {import('../modules/offerings/offering.model.js').Offering} offering
 * @param {import('../modules/applications/application.model.js').Application} application
 */
export function getMissingRequiredDocuments(offering, application) {
  const requiredRequirements =
    offering.documentRequirements?.filter((requirement) => requirement.required !== false) ?? [];

  if (!requiredRequirements.length) {
    return [];
  }

  const uploadedIds = new Set(
    (application.documents ?? []).map((document) => document.requirementId.toString()),
  );
  const uploadedNames = new Set(
    (application.documents ?? [])
      .map((document) => document.requirementName?.trim().toLowerCase())
      .filter(Boolean),
  );

  return requiredRequirements.filter((requirement) => {
    const requirementId = requirement._id.toString();
    if (uploadedIds.has(requirementId)) {
      return false;
    }

    const requirementName = requirement.name?.trim().toLowerCase();
    if (requirementName && uploadedNames.has(requirementName)) {
      return false;
    }

    return true;
  });
}

/**
 * @param {import('../modules/offerings/offering.model.js').Offering} offering
 * @param {import('../modules/applications/application.model.js').Application} application
 */
export function getDocumentUploadProgress(offering, application) {
  const requiredRequirements =
    offering.documentRequirements?.filter((requirement) => requirement.required !== false) ?? [];
  const missingRequired = getMissingRequiredDocuments(offering, application);

  return {
    documents: (application.documents ?? []).map((document) => ({
      id: document._id.toString(),
      requirementId: document.requirementId.toString(),
      requirementName: document.requirementName,
      originalName: document.originalName,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
      uploadedAt: document.uploadedAt,
    })),
    requiredDocumentCount: requiredRequirements.length,
    uploadedRequiredCount: requiredRequirements.length - missingRequired.length,
    missingRequiredDocuments: missingRequired.map((requirement) => ({
      id: requirement._id.toString(),
      name: requirement.name,
    })),
    documentsComplete: missingRequired.length === 0,
  };
}

/**
 * @param {string[]} allowedTypes
 */
export function buildAcceptAttribute(allowedTypes = ['pdf']) {
  const normalized = allowedTypes.length ? allowedTypes : ['pdf'];
  const extensions = normalized
    .map((type) => EXTENSION_BY_TYPE[type.toLowerCase()])
    .filter(Boolean);
  const mimeTypes = normalized.flatMap((type) => MIME_BY_TYPE[type.toLowerCase()] ?? []);

  return [...new Set([...mimeTypes, ...extensions])].join(',');
}

export function isAllowedDocumentType(type) {
  return DOCUMENT_FILE_TYPES.includes(type);
}

/**
 * @param {import('../modules/applications/application.model.js').Application} application
 * @param {string} documentId
 */
export function findApplicationDocument(application, documentId) {
  const id = String(documentId ?? '');
  return application.documents?.find((document) => {
    const docId = document._id?.toString?.() ?? document.id;
    return docId === id;
  });
}

/**
 * @param {{ filePath?: string, storedName?: string }} document
 * @returns {string | null}
 */
export function resolveStoredApplicationFilePath(document) {
  const candidates = [
    document?.filePath,
    document?.storedName ? path.join(APPLICATION_UPLOAD_ROOT, document.storedName) : null,
    document?.filePath ? path.join(APPLICATION_UPLOAD_ROOT, path.basename(document.filePath)) : null,
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}
