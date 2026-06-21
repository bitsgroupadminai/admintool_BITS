import { Service } from '../../modules/services/service.model.js';
import { Offering } from '../../modules/offerings/offering.model.js';
import { KnowledgeDocument } from '../../modules/knowledge-documents/knowledgeDocument.model.js';
import { OFFERING_STATUS } from '../enums/offering.enums.js';
import { chunkText } from '../helpers/textChunking.helper.js';
import { embedText, embedTexts } from './embedding.service.js';
import {
  deleteDocumentVectors,
  deleteServiceVectors,
  isPineconeConfigured,
  queryServiceVectors,
  upsertVectors,
} from './pinecone.service.js';
import { env } from '../../core/config/env.js';
import { logger } from '../../core/logger/index.js';

function formatQueueMode(mode) {
  const labels = {
    queue_only: 'Walk-in queue — students join a queue when visiting the office',
    appointment_only: 'Appointment only — students must book a time slot before visiting',
    hybrid: 'Hybrid — students may join the queue or book an appointment',
    none: 'No visit booking configured for this programme',
  };
  return labels[mode] ?? mode?.replace(/_/g, ' ') ?? 'Not configured';
}

/**
 * @param {import('../../modules/offerings/offering.model.js').Offering} offering
 */
function buildOfferingTopicChunks(offering) {
  const offeringId = offering._id.toString();
  const name = offering.name;
  const chunks = [];

  const docs = offering.documentRequirements ?? [];
  if (docs.length) {
    const lines = docs.map((doc, index) => {
      const label = doc.required === false ? 'optional' : 'required';
      const types = doc.allowedTypes?.length ? ` (${doc.allowedTypes.join(', ')})` : '';
      return `${index + 1}. ${doc.name}${types} — ${label}`;
    });
    chunks.push({
      sourceType: 'DOCUMENTS',
      sourceName: `${name} — Documents to prepare`,
      offeringId,
      text: [
        `Programme: ${name}`,
        offering.description ? `About: ${offering.description}` : '',
        'Documents students need for this programme:',
        ...lines,
        'Students upload these on the service page before submitting their request.',
      ]
        .filter(Boolean)
        .join('\n'),
    });
  }

  const rules = offering.eligibilityRules ?? [];
  if (rules.length) {
    const lines = rules.map(
      (rule, index) => `${index + 1}. ${rule.field} ${rule.operator} ${rule.value}`,
    );
    chunks.push({
      sourceType: 'ELIGIBILITY',
      sourceName: `${name} — Eligibility checks`,
      offeringId,
      text: [`Programme: ${name}`, 'Eligibility requirements:', ...lines].join('\n'),
    });
  }

  const steps = [...(offering.workflowSteps ?? [])].sort((a, b) => a.order - b.order);
  if (steps.length) {
    const lines = steps.map((step, index) => {
      const detail = step.description ? ` — ${step.description}` : '';
      const handler = step.handledBy?.assignee
        ? ` (handled by ${step.handledBy.assignee})`
        : step.handledBy?.type
          ? ` (${step.handledBy.type})`
          : '';
      return `${index + 1}. ${step.name}${detail}${handler}`;
    });
    chunks.push({
      sourceType: 'WORKFLOW',
      sourceName: `${name} — What happens after you submit`,
      offeringId,
      text: [
        `Programme: ${name}`,
        'After a student submits all required documents, the institute follows this process:',
        ...lines,
        'Students receive email updates when their status changes or if corrections are needed.',
      ].join('\n'),
    });
  }

  chunks.push({
    sourceType: 'VISIT',
    sourceName: `${name} — Visits, queue & appointments`,
    offeringId,
    text: [
      `Programme: ${name}`,
      `Visit planning mode: ${formatQueueMode(offering.queueMode)}`,
      offering.queueMode === 'appointment_only' || offering.queueMode === 'hybrid'
        ? `Appointment slots: ${offering.appointmentConfig?.slotDurationMinutes ?? 30} minutes between ${offering.appointmentConfig?.operatingHoursStart ?? '09:00'} and ${offering.appointmentConfig?.operatingHoursEnd ?? '17:00'}.`
        : '',
      offering.queueMode === 'queue_only' || offering.queueMode === 'hybrid'
        ? `Queue capacity: about ${offering.queueConfig?.capacity ?? 'limited'} students can wait at once.`
        : '',
      'Queue and appointment booking typically open after the student submits their request with all required documents uploaded.',
      'Students use the Visit planning section on their service page to join the queue or book a slot.',
    ]
      .filter(Boolean)
      .join('\n'),
  });

  return chunks;
}

/**
 * @param {import('../../modules/services/service.model.js').Service} service
 * @param {import('../../modules/offerings/offering.model.js').Offering[]} offerings
 * @param {import('../../modules/knowledge-documents/knowledgeDocument.model.js').KnowledgeDocument[]} knowledgeDocs
 */
export function buildIndexableChunks(service, offerings, knowledgeDocs) {
  const instituteId = service.instituteId.toString();
  const serviceId = service._id.toString();
  const records = [];

  const serviceText = [
    `Service: ${service.name}`,
    service.description ? `Description: ${service.description}` : '',
    `Status: ${service.status}`,
    'This is an institute administrative service available to students through the student portal.',
  ]
    .filter(Boolean)
    .join('\n');

  for (const piece of chunkText(serviceText, {
    chunkSize: env.RAG_CHUNK_SIZE,
    overlap: env.RAG_CHUNK_OVERLAP,
  })) {
    records.push({
      instituteId,
      serviceId,
      sourceType: 'SERVICE',
      sourceName: service.name,
      text: piece,
    });
  }

  for (const offering of offerings) {
    for (const topic of buildOfferingTopicChunks(offering)) {
      for (const piece of chunkText(topic.text, {
        chunkSize: env.RAG_CHUNK_SIZE,
        overlap: env.RAG_CHUNK_OVERLAP,
      })) {
        records.push({
          instituteId,
          serviceId,
          sourceType: topic.sourceType,
          sourceName: topic.sourceName,
          offeringId: topic.offeringId,
          text: piece,
        });
      }
    }
  }

  for (const doc of knowledgeDocs) {
    if (!doc.extractedText?.trim()) continue;
    const header = `Source document: ${doc.originalName}`;
    for (const piece of chunkText(`${header}\n${doc.extractedText}`, {
      chunkSize: env.RAG_CHUNK_SIZE,
      overlap: env.RAG_CHUNK_OVERLAP,
    })) {
      records.push({
        instituteId,
        serviceId,
        sourceType: 'KNOWLEDGE',
        sourceName: doc.originalName,
        documentId: doc._id.toString(),
        text: piece,
      });
    }
  }

  return records;
}

/**
 * Full re-index for a service (offerings + knowledge documents + service profile).
 * @param {string} instituteId
 * @param {string} serviceId
 */
export async function indexServiceKnowledge(instituteId, serviceId) {
  if (!isPineconeConfigured() || !env.OPENAI_API_KEY) {
    return { indexed: false, reason: 'RAG not configured', chunkCount: 0 };
  }

  const service = await Service.findOne({ _id: serviceId, instituteId });
  if (!service) {
    return { indexed: false, reason: 'Service not found', chunkCount: 0 };
  }

  const [offerings, knowledgeDocs] = await Promise.all([
    Offering.find({
      instituteId,
      serviceId,
      status: { $nin: [OFFERING_STATUS.DISABLED, OFFERING_STATUS.ARCHIVED, OFFERING_STATUS.EXPIRED] },
    }),
    KnowledgeDocument.find({ instituteId, serviceId }),
  ]);

  const chunks = buildIndexableChunks(service, offerings, knowledgeDocs);
  await deleteServiceVectors(instituteId, serviceId);

  if (!chunks.length) {
    await KnowledgeDocument.updateMany(
      { instituteId, serviceId },
      { indexStatus: 'indexed', chunkCount: 0, indexedAt: new Date(), indexError: null },
    );
    return { indexed: true, chunkCount: 0 };
  }

  const texts = chunks.map((c) => c.text);
  const embeddings = await embedTexts(texts);

  const vectors = chunks.map((chunk, index) => ({
    id: `${serviceId}:chunk:${index}`,
    values: embeddings[index],
    metadata: {
      instituteId: chunk.instituteId,
      serviceId: chunk.serviceId,
      sourceType: chunk.sourceType,
      sourceName: chunk.sourceName,
      text: chunk.text,
      ...(chunk.offeringId ? { offeringId: chunk.offeringId } : {}),
      ...(chunk.documentId ? { documentId: chunk.documentId } : {}),
    },
  }));

  await upsertVectors(vectors);

  await KnowledgeDocument.updateMany(
    { instituteId, serviceId },
    { indexStatus: 'indexed', indexedAt: new Date(), indexError: null },
  );

  for (const doc of knowledgeDocs) {
    const docChunks = chunks.filter((c) => c.documentId === doc._id.toString()).length;
    await KnowledgeDocument.updateOne(
      { _id: doc._id },
      { chunkCount: docChunks, indexStatus: doc.extractedText ? 'indexed' : 'skipped' },
    );
  }

  logger.info({ instituteId, serviceId, chunkCount: vectors.length }, 'Service knowledge indexed');
  return { indexed: true, chunkCount: vectors.length };
}

/**
 * @param {string} instituteId
 * @param {string} serviceId
 * @param {string} query
 */
export async function retrieveRelevantChunks(instituteId, serviceId, query) {
  if (!isPineconeConfigured() || !env.OPENAI_API_KEY) {
    return [];
  }

  const vector = await embedText(query);
  if (!vector) return [];

  const matches = await queryServiceVectors(
    instituteId,
    serviceId,
    vector,
    env.RAG_TOP_K,
  );

  const minScore = 0.35;
  return matches.filter((match) => match.score >= minScore);
}

export async function purgeServiceIndex(instituteId, serviceId) {
  await deleteServiceVectors(instituteId, serviceId);
}

export async function purgeDocumentIndex(instituteId, serviceId, documentId) {
  await deleteDocumentVectors(instituteId, serviceId, documentId);
}

/**
 * @param {string} instituteId
 * @param {string} serviceId
 */
export async function getServiceRagStatus(instituteId, serviceId) {
  const [docs, offeringCount] = await Promise.all([
    KnowledgeDocument.find({ instituteId, serviceId }).select(
      'indexStatus chunkCount indexedAt indexError originalName',
    ),
    Offering.countDocuments({ instituteId, serviceId }),
  ]);

  const indexedDocs = docs.filter((d) => d.indexStatus === 'indexed').length;
  const pendingDocs = docs.filter((d) => d.indexStatus === 'pending' || !d.indexStatus).length;
  const failedDocs = docs.filter((d) => d.indexStatus === 'failed');

  return {
    ragEnabled: isPineconeConfigured() && Boolean(env.OPENAI_API_KEY),
    pineconeConfigured: isPineconeConfigured(),
    openAiConfigured: Boolean(env.OPENAI_API_KEY),
    totalDocuments: docs.length,
    indexedDocuments: indexedDocs,
    pendingDocuments: pendingDocs,
    failedDocuments: failedDocs.length,
    documents: docs.map((d) => ({
      id: d._id.toString(),
      name: d.originalName,
      indexStatus: d.indexStatus ?? 'pending',
      chunkCount: d.chunkCount ?? 0,
      indexedAt: d.indexedAt ?? null,
      indexError: d.indexError ?? null,
    })),
    readyForChat:
      isPineconeConfigured() &&
      Boolean(env.OPENAI_API_KEY) &&
      pendingDocs === 0 &&
      (indexedDocs > 0 || offeringCount > 0),
  };
}
