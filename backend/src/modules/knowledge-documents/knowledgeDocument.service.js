import fs from 'fs';
import { KnowledgeDocument } from './knowledgeDocument.model.js';
import { Service } from '../services/service.model.js';
import { AppError } from '../../core/utils/AppError.js';
import { env } from '../../core/config/env.js';
import { extractTextFromDocument } from '../../shared/services/document-text.service.js';
import { enqueueServiceReindex, enqueueServicePurge } from '../../core/queues/embedding.queue.js';
import { cachedRead } from '../../shared/helpers/cachedRead.helper.js';
import { cacheNs } from '../../shared/constants/cacheKeys.js';
import { flushInstituteReadCache } from '../../shared/helpers/cacheInvalidation.helper.js';

/**
 * @param {string} serviceId
 * @param {string} instituteId
 */
export async function deleteAllForService(serviceId, instituteId) {
  const docs = await KnowledgeDocument.find({ serviceId, instituteId });
  for (const doc of docs) {
    if (doc.filePath && fs.existsSync(doc.filePath)) {
      fs.unlinkSync(doc.filePath);
    }
  }
  await KnowledgeDocument.deleteMany({ serviceId, instituteId });
  await enqueueServicePurge(instituteId, serviceId);
  await flushInstituteReadCache(instituteId);
}

/**
 * @param {string} instituteId
 * @param {string} serviceId
 */
export async function listDocuments(instituteId, serviceId) {
  return cachedRead(cacheNs.KNOWLEDGE_DOCS, [instituteId, serviceId], async () => {
  const service = await Service.findOne({ _id: serviceId, instituteId });
  if (!service) {
    throw new AppError('Service not found', 404);
  }

  const docs = await KnowledgeDocument.find({ instituteId, serviceId }).sort({
    createdAt: -1,
  });

  return docs.map((d) => ({
    id: d._id.toString(),
    serviceId: d.serviceId.toString(),
    offeringId: d.offeringId?.toString() ?? null,
    originalName: d.originalName,
    mimeType: d.mimeType,
    sizeBytes: d.sizeBytes,
    hasExtractedText: Boolean(d.extractedText),
    indexStatus: d.indexStatus ?? 'pending',
    chunkCount: d.chunkCount ?? 0,
    indexedAt: d.indexedAt ?? null,
    createdAt: d.createdAt,
  }));
  });
}

/**
 * @param {string} instituteId
 * @param {string} serviceId
 * @param {Express.Multer.File} file
 */
export async function uploadDocument(instituteId, serviceId, file) {
  const service = await Service.findOne({ _id: serviceId, instituteId });
  if (!service) {
    throw new AppError('Service not found', 404);
  }

  const count = await KnowledgeDocument.countDocuments({ instituteId, serviceId });
  if (count >= env.MAX_KNOWLEDGE_FILES_PER_SERVICE) {
    throw new AppError('Maximum knowledge documents reached for this service', 400);
  }

  const extractedText = await extractTextFromDocument(file.path, file.mimetype);

  const doc = await KnowledgeDocument.create({
    instituteId,
    serviceId,
    originalName: file.originalname,
    storedName: file.filename,
    mimeType: file.mimetype,
    sizeBytes: file.size,
    filePath: file.path,
    extractedText,
    indexStatus: 'pending',
  });

  await enqueueServiceReindex(instituteId, serviceId, 'document-upload');

  await flushInstituteReadCache(instituteId);
  return {
    id: doc._id.toString(),
    originalName: doc.originalName,
    mimeType: doc.mimeType,
    sizeBytes: doc.sizeBytes,
    hasExtractedText: Boolean(extractedText),
    indexStatus: doc.indexStatus,
    createdAt: doc.createdAt,
  };
}

/**
 * @param {string} docId
 * @param {string} instituteId
 */
export async function deleteDocument(docId, instituteId) {
  const doc = await KnowledgeDocument.findOne({ _id: docId, instituteId });
  if (!doc) {
    throw new AppError('Document not found', 404);
  }

  if (fs.existsSync(doc.filePath)) {
    fs.unlinkSync(doc.filePath);
  }

  await KnowledgeDocument.deleteOne({ _id: docId });
  await enqueueServiceReindex(instituteId, doc.serviceId.toString(), 'document-delete');
  await flushInstituteReadCache(instituteId);
  return { id: docId };
}
