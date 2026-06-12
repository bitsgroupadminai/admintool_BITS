import crypto from 'crypto';
import { Service } from './service.model.js';
import { KnowledgeDocument } from '../knowledge-documents/knowledgeDocument.model.js';
import { Offering } from '../offerings/offering.model.js';
import { AppError } from '../../core/utils/AppError.js';
import * as offeringService from '../offerings/offering.service.js';
import { generateServiceInsights } from '../../shared/services/knowledge-ai.service.js';
import { isOpenAiConfigured } from '../../shared/services/openai.client.js';
import { extractTextFromDocument } from '../../shared/services/document-text.service.js';

/**
 * @param {string} serviceId
 * @param {string} instituteId
 */
export async function getServiceInsights(serviceId, instituteId) {
  const service = await Service.findOne({ _id: serviceId, instituteId });
  if (!service) {
    throw new AppError('Service not found', 404);
  }

  const documentCount = await KnowledgeDocument.countDocuments({ serviceId, instituteId });

  return {
    documentCount,
    insights: service.knowledgeInsights ?? null,
    aiEnabled: isOpenAiConfigured(),
  };
}

/**
 * @param {string} serviceId
 * @param {string} instituteId
 */
export async function generateServiceInsightsAction(serviceId, instituteId) {
  const service = await Service.findOne({ _id: serviceId, instituteId });
  if (!service) {
    throw new AppError('Service not found', 404);
  }

  const documents = await KnowledgeDocument.find({ serviceId, instituteId });
  if (documents.length === 0) {
    throw new AppError('Upload at least one knowledge document before generating insights', 400);
  }

  await ensureDocumentsHaveText(documents);

  const extractableCount = documents.filter((d) => d.extractedText?.trim()).length;
  if (extractableCount === 0) {
    throw new AppError(
      'No readable text found in uploaded files. Use text-based PDF or DOCX (scanned images need OCR).',
      400,
    );
  }

  const insights = await generateServiceInsights(
    { name: service.name, description: service.description },
    documents,
  );

  service.knowledgeInsights = {
    ...insights,
    generatedAt: new Date().toISOString(),
    sourceDocumentCount: documents.length,
    analysisMode: insights.analysisMode ?? (isOpenAiConfigured() ? 'openai' : 'heuristic'),
    analysisWarning: insights.analysisWarning ?? null,
  };
  await service.save();

  const usedOpenAi = service.knowledgeInsights.analysisMode === 'openai';

  return {
    message: usedOpenAi
      ? 'AI analyzed your knowledge documents. Review suggested offerings before creating them.'
      : service.knowledgeInsights.analysisWarning ??
        'Insights generated with basic fallback. Set OPENAI_API_KEY for document-aware AI.',
    insights: service.knowledgeInsights,
    documentCount: documents.length,
    aiEnabled: isOpenAiConfigured(),
  };
}

/**
 * Re-extract text from disk when missing (e.g. uploaded before DOCX support).
 * @param {Array} documents
 */
async function ensureDocumentsHaveText(documents) {
  for (const doc of documents) {
    if (doc.extractedText?.trim()) continue;
    if (!doc.filePath) continue;

    const text = await extractTextFromDocument(doc.filePath, doc.mimeType);
    if (text) {
      doc.extractedText = text;
      await doc.save();
    }
  }
}

/**
 * @param {string} serviceId
 * @param {string} instituteId
 * @param {{ name: string, description?: string }} payload
 */
export async function addManualOfferingSuggestion(serviceId, instituteId, payload) {
  const service = await Service.findOne({ _id: serviceId, instituteId });
  if (!service) {
    throw new AppError('Service not found', 404);
  }

  const insights = service.knowledgeInsights ?? {
    understandingSummary: '',
    chatbotReadinessSummary: '',
    chatbotCanAnswer: [],
    gaps: [],
    suggestedOfferings: [],
  };

  insights.suggestedOfferings = insights.suggestedOfferings ?? [];
  insights.suggestedOfferings.push({
    id: crypto.randomUUID(),
    name: payload.name.trim(),
    description: payload.description?.trim() ?? '',
    rationale: 'Added manually by admin',
    status: 'pending',
    source: 'manual',
  });

  service.knowledgeInsights = insights;
  await service.save();
  return service.knowledgeInsights;
}

/**
 * @param {string} serviceId
 * @param {string} instituteId
 * @param {string} suggestionId
 * @param {{ name?: string, description?: string }} updates
 */
export async function updateOfferingSuggestion(serviceId, instituteId, suggestionId, updates) {
  const service = await Service.findOne({ _id: serviceId, instituteId });
  if (!service?.knowledgeInsights?.suggestedOfferings) {
    throw new AppError('Suggestion not found', 404);
  }

  const suggestion = service.knowledgeInsights.suggestedOfferings.find((s) => s.id === suggestionId);
  if (!suggestion || suggestion.status === 'accepted') {
    throw new AppError('Suggestion not found', 404);
  }

  if (updates.name) suggestion.name = updates.name.trim();
  if (updates.description !== undefined) suggestion.description = updates.description.trim();

  await service.save();
  return service.knowledgeInsights;
}

/**
 * @param {string} serviceId
 * @param {string} instituteId
 * @param {string} suggestionId
 */
export async function dismissOfferingSuggestion(serviceId, instituteId, suggestionId) {
  const service = await Service.findOne({ _id: serviceId, instituteId });
  if (!service?.knowledgeInsights?.suggestedOfferings) {
    throw new AppError('Suggestion not found', 404);
  }

  const suggestion = service.knowledgeInsights.suggestedOfferings.find((s) => s.id === suggestionId);
  if (!suggestion) {
    throw new AppError('Suggestion not found', 404);
  }

  suggestion.status = 'dismissed';
  await service.save();
  return service.knowledgeInsights;
}

/**
 * @param {string} serviceId
 * @param {string} instituteId
 * @param {string} suggestionId
 */
export async function createOfferingFromSuggestion(serviceId, instituteId, suggestionId) {
  const service = await Service.findOne({ _id: serviceId, instituteId });
  if (!service?.knowledgeInsights?.suggestedOfferings) {
    throw new AppError('Suggestion not found', 404);
  }

  const suggestion = service.knowledgeInsights.suggestedOfferings.find(
    (s) => s.id === suggestionId && s.status === 'pending',
  );
  if (!suggestion) {
    throw new AppError('Suggestion not found or already used', 404);
  }

  const offering = await offeringService.createOffering(instituteId, {
    serviceId,
    name: suggestion.name,
    description: suggestion.description,
  });

  suggestion.status = 'accepted';
  await service.save();

  return { offering, insights: service.knowledgeInsights };
}
