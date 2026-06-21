const MIME_BY_TYPE = {
  pdf: ['application/pdf'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  png: ['image/png'],
};

export function getRequiredDocuments(documents = []) {
  return documents.filter((document) => document.required !== false);
}

export function getUploadedDocumentMap(application) {
  const map = new Map();
  for (const document of application?.documents ?? []) {
    map.set(document.requirementId, document);
  }
  return map;
}

export function getMissingRequiredDocuments(offering, application) {
  const required = getRequiredDocuments(offering?.documentRequirements ?? []);
  const uploaded = getUploadedDocumentMap(application);
  const uploadedNames = new Set(
    (application?.documents ?? [])
      .map((document) => document.requirementName?.trim().toLowerCase())
      .filter(Boolean),
  );

  return required.filter((requirement) => {
    if (uploaded.has(requirement.id)) return false;
    const name = requirement.name?.trim().toLowerCase();
    if (name && uploadedNames.has(name)) return false;
    return true;
  });
}

export function areAllRequiredDocumentsUploaded(offering, application) {
  if (application?.status === 'admitted') {
    return true;
  }

  if (getMissingRequiredDocuments(offering, application).length === 0) {
    return true;
  }

  if (application?.documentsComplete != null) {
    return application.documentsComplete;
  }

  return false;
}

export function buildAcceptAttribute(allowedTypes = ['pdf']) {
  const normalized = allowedTypes.length ? allowedTypes : ['pdf'];
  const extensions = normalized.map((type) => `.${type.toLowerCase()}`);
  const mimeTypes = normalized.flatMap((type) => MIME_BY_TYPE[type.toLowerCase()] ?? []);
  return [...new Set([...mimeTypes, ...extensions])].join(',');
}

export function validateFileForRequirement(file, requirement) {
  if (!file || !requirement) {
    return 'Choose a file to upload';
  }

  const allowedTypes = requirement.allowedTypes?.length ? requirement.allowedTypes : ['pdf'];
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  const normalizedAllowed = allowedTypes.map((type) => type.toLowerCase());

  const extensionAllowed = normalizedAllowed.includes(extension);
  const mimeAllowed = normalizedAllowed.some((type) =>
    (MIME_BY_TYPE[type] ?? []).includes(file.type),
  );

  if (!extensionAllowed && !mimeAllowed) {
    return `Only ${normalizedAllowed.map((type) => type.toUpperCase()).join(', ')} files are allowed`;
  }

  const maxBytes = (requirement.maxSizeMb ?? 5) * 1024 * 1024;
  if (file.size > maxBytes) {
    return `File must be ${requirement.maxSizeMb ?? 5} MB or smaller`;
  }

  return null;
}

export function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getDocumentProgressLabel(offering, application) {
  const requiredCount =
    application?.requiredDocumentCount ??
    getRequiredDocuments(offering?.documentRequirements ?? []).length;
  const uploadedCount =
    application?.uploadedRequiredCount ??
    requiredCount - getMissingRequiredDocuments(offering, application).length;

  if (requiredCount === 0) {
    return 'No documents required';
  }

  return `${uploadedCount} of ${requiredCount} required documents uploaded`;
}
