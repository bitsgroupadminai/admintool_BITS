import { KnowledgeDocument } from './knowledgeDocument.model.js';
import { KnowledgeDocumentVersion } from './knowledgeDocument.version.model.js';
import { Service } from '../services/service.model.js';
import { Offering } from '../offerings/offering.model.js';
import { AppError } from '../../core/utils/AppError.js';

/**
 * @param {import('./knowledgeDocument.model.js').KnowledgeDocument} doc
 * @param {'upload' | 'replace' | 'delete'} changeType
 */
export async function recordKnowledgeDocumentVersion(doc, changeType = 'upload') {
  const latest = await KnowledgeDocumentVersion.findOne({ documentId: doc._id })
    .sort({ version: -1 })
    .select('version');

  const version = (latest?.version ?? 0) + 1;
  const preview = (doc.extractedText ?? '').slice(0, 500);

  await KnowledgeDocumentVersion.create({
    instituteId: doc.instituteId,
    serviceId: doc.serviceId,
    documentId: doc._id,
    version,
    originalName: doc.originalName,
    mimeType: doc.mimeType,
    sizeBytes: doc.sizeBytes,
    extractedTextPreview: preview,
    changeType,
  });

  return version;
}

/**
 * @param {string} instituteId
 * @param {string} serviceId
 * @param {string} documentId
 */
export async function listKnowledgeDocumentVersions(instituteId, serviceId, documentId) {
  const doc = await KnowledgeDocument.findOne({ _id: documentId, instituteId, serviceId });
  if (!doc) {
    throw new AppError('Knowledge document not found', 404);
  }

  const versions = await KnowledgeDocumentVersion.find({ documentId })
    .sort({ version: -1 })
    .select('version originalName mimeType sizeBytes extractedTextPreview changeType createdAt');

  return {
    documentId: doc._id.toString(),
    currentName: doc.originalName,
    versions: versions.map((v) => ({
      version: v.version,
      originalName: v.originalName,
      mimeType: v.mimeType,
      sizeBytes: v.sizeBytes,
      extractedTextPreview: v.extractedTextPreview,
      changeType: v.changeType,
      createdAt: v.createdAt,
    })),
  };
}

/**
 * @param {string} instituteId
 * @param {string} serviceId
 */
export async function getServiceKnowledgeCoverage(instituteId, serviceId) {
  const service = await Service.findOne({ _id: serviceId, instituteId });
  if (!service) {
    throw new AppError('Service not found', 404);
  }

  const documents = await KnowledgeDocument.find({ instituteId, serviceId });
  const offerings = await Offering.find({ instituteId, serviceId }).select(
    'name status eligibilityRules documentRequirements workflowSteps',
  );

  const indexedDocs = documents.filter((d) => d.indexStatus === 'indexed');
  const failedDocs = documents.filter((d) => d.indexStatus === 'failed');

  const offeringGaps = offerings.map((offering) => {
    const missing = [];
    if (!offering.eligibilityRules?.length) missing.push('eligibility rules');
    if (!offering.documentRequirements?.length) missing.push('document requirements');
    if (!offering.workflowSteps?.length) missing.push('workflow steps');
    return {
      offeringId: offering._id.toString(),
      offeringName: offering.name,
      status: offering.status,
      gaps: missing,
      chatReady: indexedDocs.length > 0 && missing.length === 0,
    };
  });

  return {
    serviceId: service._id.toString(),
    serviceName: service.name,
    knowledgeDocuments: {
      total: documents.length,
      indexed: indexedDocs.length,
      failed: failedDocs.length,
      pending: documents.length - indexedDocs.length - failedDocs.length,
    },
    chatbotCoverage: {
      ready: offeringGaps.filter((o) => o.chatReady).length,
      gaps: offeringGaps.filter((o) => !o.chatReady),
    },
    recommendation:
      indexedDocs.length === 0
        ? 'Upload and index knowledge documents to enable chatbot answers.'
        : failedDocs.length > 0
          ? 'Some documents failed indexing — review and re-upload.'
          : 'Knowledge base is indexed. Review offering gaps for full chat coverage.',
  };
}
