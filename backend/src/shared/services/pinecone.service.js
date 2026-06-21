import { Pinecone } from '@pinecone-database/pinecone';
import { env } from '../../core/config/env.js';
import { logger } from '../../core/logger/index.js';

/** @type {import('@pinecone-database/pinecone').Index | null} */
let index = null;

export function isPineconeConfigured() {
  return Boolean(env.PINECONE_API_KEY?.trim() && env.PINECONE_INDEX?.trim());
}

function getIndex() {
  if (!isPineconeConfigured()) return null;
  if (!index) {
    const pc = new Pinecone({ apiKey: env.PINECONE_API_KEY });
    index = pc.index(env.PINECONE_INDEX);
  }
  return index;
}

/**
 * @param {Array<{ id: string, values: number[], metadata: Record<string, string | number | boolean> }>} vectors
 */
export async function upsertVectors(vectors) {
  const pineconeIndex = getIndex();
  if (!pineconeIndex || !vectors.length) return;

  const batchSize = 100;
  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize).map((vector) => ({
      id: vector.id,
      values: vector.values,
      metadata: {
        ...vector.metadata,
        text: String(vector.metadata.text ?? '').slice(0, 3500),
      },
    }));
    await pineconeIndex.upsert(batch);
  }
}

/**
 * @param {string} instituteId
 * @param {string} serviceId
 * @param {number[]} vector
 * @param {number} topK
 */
export async function queryServiceVectors(instituteId, serviceId, vector, topK) {
  const pineconeIndex = getIndex();
  if (!pineconeIndex) return [];

  const response = await pineconeIndex.query({
    vector,
    topK,
    includeMetadata: true,
    filter: {
      instituteId: { $eq: instituteId },
      serviceId: { $eq: serviceId },
    },
  });

  return (response.matches ?? [])
    .filter((match) => typeof match.metadata?.text === 'string')
    .map((match) => ({
      id: match.id,
      score: match.score ?? 0,
      sourceName: String(match.metadata?.sourceName ?? 'Institute knowledge'),
      sourceType: String(match.metadata?.sourceType ?? 'KNOWLEDGE'),
      text: String(match.metadata?.text ?? ''),
      offeringId: match.metadata?.offeringId ? String(match.metadata.offeringId) : null,
      documentId: match.metadata?.documentId ? String(match.metadata.documentId) : null,
    }));
}

/**
 * @param {string} instituteId
 * @param {string} serviceId
 */
export async function deleteServiceVectors(instituteId, serviceId) {
  const pineconeIndex = getIndex();
  if (!pineconeIndex) return;

  try {
    await pineconeIndex.deleteMany({
      filter: {
        instituteId: { $eq: instituteId },
        serviceId: { $eq: serviceId },
      },
    });
  } catch (err) {
    logger.warn({ err, instituteId, serviceId }, 'Pinecone deleteMany failed for service');
  }
}

/**
 * @param {string} instituteId
 * @param {string} serviceId
 * @param {string} documentId
 */
export async function deleteDocumentVectors(instituteId, serviceId, documentId) {
  const pineconeIndex = getIndex();
  if (!pineconeIndex) return;

  try {
    await pineconeIndex.deleteMany({
      filter: {
        instituteId: { $eq: instituteId },
        serviceId: { $eq: serviceId },
        documentId: { $eq: documentId },
      },
    });
  } catch (err) {
    logger.warn({ err, documentId }, 'Pinecone deleteMany failed for document');
  }
}
