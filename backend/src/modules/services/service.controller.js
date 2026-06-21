import * as serviceService from './service.service.js';
import * as serviceInsightsService from './service-insights.service.js';
import {
  createServiceSchema,
  updateServiceSchema,
  manualOfferingSuggestionSchema,
  updateOfferingSuggestionSchema,
} from './service.validator.js';
import { sendSuccess } from '../../core/utils/apiResponse.js';

export async function list(req, res, next) {
  try {
    const services = await serviceService.listServices(req.user.instituteId);
    sendSuccess(res, 200, 'Services', { services });
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const payload = createServiceSchema.parse(req.body);
    const service = await serviceService.createService(req.user.instituteId, payload);
    sendSuccess(res, 201, 'Service created', { service });
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const service = await serviceService.getServiceById(
      req.params.id,
      req.user.instituteId,
    );
    sendSuccess(res, 200, 'Service details', { service });
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const payload = updateServiceSchema.parse(req.body);
    const service = await serviceService.updateService(
      req.params.id,
      req.user.instituteId,
      payload,
    );
    sendSuccess(res, 200, 'Service updated', { service });
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const result = await serviceService.deleteService(
      req.params.id,
      req.user.instituteId,
    );
    sendSuccess(res, 200, 'Service deleted', result);
  } catch (err) {
    next(err);
  }
}

export async function activate(req, res, next) {
  try {
    const service = await serviceService.activateService(
      req.params.id,
      req.user.instituteId,
    );
    sendSuccess(res, 200, 'Service activated', { service });
  } catch (err) {
    next(err);
  }
}

export async function getInsights(req, res, next) {
  try {
    const data = await serviceInsightsService.getServiceInsights(
      req.params.id,
      req.user.instituteId,
    );
    sendSuccess(res, 200, 'Knowledge insights', data);
  } catch (err) {
    next(err);
  }
}

export async function generateInsights(req, res, next) {
  try {
    const result = await serviceInsightsService.generateServiceInsightsAction(
      req.params.id,
      req.user.instituteId,
    );
    sendSuccess(res, 200, result.message, {
      insights: result.insights,
      documentCount: result.documentCount,
      aiEnabled: result.aiEnabled,
    });
  } catch (err) {
    next(err);
  }
}

export async function addManualSuggestion(req, res, next) {
  try {
    const payload = manualOfferingSuggestionSchema.parse(req.body);
    const insights = await serviceInsightsService.addManualOfferingSuggestion(
      req.params.id,
      req.user.instituteId,
      payload,
    );
    sendSuccess(res, 201, 'Suggestion added', { insights });
  } catch (err) {
    next(err);
  }
}

export async function updateSuggestion(req, res, next) {
  try {
    const payload = updateOfferingSuggestionSchema.parse(req.body);
    const insights = await serviceInsightsService.updateOfferingSuggestion(
      req.params.id,
      req.user.instituteId,
      req.params.suggestionId,
      payload,
    );
    sendSuccess(res, 200, 'Suggestion updated', { insights });
  } catch (err) {
    next(err);
  }
}

export async function dismissSuggestion(req, res, next) {
  try {
    const insights = await serviceInsightsService.dismissOfferingSuggestion(
      req.params.id,
      req.user.instituteId,
      req.params.suggestionId,
    );
    sendSuccess(res, 200, 'Suggestion dismissed', { insights });
  } catch (err) {
    next(err);
  }
}

export async function createOfferingFromSuggestion(req, res, next) {
  try {
    const result = await serviceInsightsService.createOfferingFromSuggestion(
      req.params.id,
      req.user.instituteId,
      req.params.suggestionId,
    );
    sendSuccess(res, 201, 'Offering created from suggestion', result);
  } catch (err) {
    next(err);
  }
}

export async function getRagStatus(req, res, next) {
  try {
    const { getServiceRagStatus } = await import('../../shared/services/rag.service.js');
    const status = await getServiceRagStatus(req.user.instituteId, req.params.id);
    sendSuccess(res, 200, 'RAG index status', status);
  } catch (err) {
    next(err);
  }
}

export async function reindexRag(req, res, next) {
  try {
    const { enqueueServiceReindex } = await import('../../core/queues/embedding.queue.js');
    await enqueueServiceReindex(req.user.instituteId, req.params.id, 'manual-reindex');
    sendSuccess(res, 202, 'Knowledge re-index queued', { queued: true });
  } catch (err) {
    next(err);
  }
}
