import * as offeringService from './offering.service.js';
import * as aiSuggestionService from './ai-suggestion.service.js';
import {
  createOfferingSchema,
  updateOfferingSchema,
  updateEligibilitySchema,
  updateDocumentsSchema,
  updateWorkflowSchema,
  updateQueueSchema,
  updateOfferingDetailsSchema,
  applyAiSuggestionsSchema,
  generateAiSectionSchema,
  bulkOfferingActionSchema,
} from './offering.validator.js';
import { updatePaymentSchema } from '../payments/payment.validator.js';
import { sendSuccess } from '../../core/utils/apiResponse.js';

export async function list(req, res, next) {
  try {
    const offerings = await offeringService.listOfferings(
      req.user.instituteId,
      req.query.serviceId,
    );
    sendSuccess(res, 200, 'Offerings', { offerings });
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const payload = createOfferingSchema.parse(req.body);
    const offering = await offeringService.createOffering(req.user.instituteId, payload);
    sendSuccess(res, 201, 'Offering created', { offering });
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const offering = await offeringService.getOfferingById(
      req.params.id,
      req.user.instituteId,
    );
    sendSuccess(res, 200, 'Offering details', { offering });
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const payload = updateOfferingSchema.parse(req.body);
    const offering = await offeringService.updateOffering(
      req.params.id,
      req.user.instituteId,
      payload,
    );
    sendSuccess(res, 200, 'Offering updated', { offering });
  } catch (err) {
    next(err);
  }
}

export async function updateDetails(req, res, next) {
  try {
    const payload = updateOfferingDetailsSchema.parse(req.body);
    const offering = await offeringService.updateOfferingDetails(
      req.params.id,
      req.user.instituteId,
      payload,
    );
    sendSuccess(res, 200, 'Offering details updated', { offering });
  } catch (err) {
    next(err);
  }
}

export async function updatePayment(req, res, next) {
  try {
    const payload = updatePaymentSchema.parse(req.body);
    const offering = await offeringService.updateOfferingPayment(
      req.params.id,
      req.user.instituteId,
      payload.paymentConfig,
    );
    sendSuccess(res, 200, 'Payment settings updated', { offering });
  } catch (err) {
    next(err);
  }
}

export async function updateEligibility(req, res, next) {
  try {
    const payload = updateEligibilitySchema.parse(req.body);
    const offering = await offeringService.updateEligibilityRules(
      req.params.id,
      req.user.instituteId,
      payload,
    );
    sendSuccess(res, 200, 'Eligibility rules updated', { offering });
  } catch (err) {
    next(err);
  }
}

export async function updateDocuments(req, res, next) {
  try {
    const { requirements } = updateDocumentsSchema.parse(req.body);
    const offering = await offeringService.updateDocumentRequirements(
      req.params.id,
      req.user.instituteId,
      requirements,
    );
    sendSuccess(res, 200, 'Document requirements updated', { offering });
  } catch (err) {
    next(err);
  }
}

export async function updateWorkflow(req, res, next) {
  try {
    const { steps } = updateWorkflowSchema.parse(req.body);
    const offering = await offeringService.updateWorkflow(
      req.params.id,
      req.user.instituteId,
      steps,
    );
    sendSuccess(res, 200, 'Workflow updated', { offering });
  } catch (err) {
    next(err);
  }
}

export async function generateWorkflowEmails(req, res, next) {
  try {
    const offering = await offeringService.ensureWorkflowStudentEmails(
      req.params.id,
      req.user.instituteId,
    );
    sendSuccess(res, 200, 'Student email templates ready', { offering });
  } catch (err) {
    next(err);
  }
}

export async function updateQueue(req, res, next) {
  try {
    const payload = updateQueueSchema.parse(req.body);
    const offering = await offeringService.updateQueueConfig(
      req.params.id,
      req.user.instituteId,
      payload,
    );
    sendSuccess(res, 200, 'Queue configuration updated', { offering });
  } catch (err) {
    next(err);
  }
}

export async function activate(req, res, next) {
  try {
    const offering = await offeringService.activateOffering(
      req.params.id,
      req.user.instituteId,
    );
    sendSuccess(res, 200, 'Offering activated', { offering });
  } catch (err) {
    next(err);
  }
}

export async function duplicate(req, res, next) {
  try {
    const offering = await offeringService.duplicateOffering(
      req.params.id,
      req.user.instituteId,
    );
    sendSuccess(res, 201, 'Offering duplicated', { offering });
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const result = await offeringService.deleteOffering(
      req.params.id,
      req.user.instituteId,
    );
    sendSuccess(res, 200, 'Offering deleted', result);
  } catch (err) {
    next(err);
  }
}

export async function bulkAction(req, res, next) {
  try {
    const payload = bulkOfferingActionSchema.parse(req.body);
    const result = await offeringService.bulkOfferingAction(
      req.user.instituteId,
      payload,
    );
    sendSuccess(res, 200, 'Bulk action completed', result);
  } catch (err) {
    next(err);
  }
}

export async function generateAiSuggestions(req, res, next) {
  try {
    const { section } = generateAiSectionSchema.parse({
      section: req.body.section ?? req.query.section,
    });
    const result = await aiSuggestionService.generateSuggestions(
      req.params.id,
      req.user.instituteId,
      section,
    );
    sendSuccess(res, 200, result.message, result.data);
  } catch (err) {
    next(err);
  }
}

export async function getAiSuggestions(req, res, next) {
  try {
    const suggestions = await aiSuggestionService.getSuggestions(
      req.params.id,
      req.user.instituteId,
    );
    sendSuccess(res, 200, 'AI suggestions', { suggestions });
  } catch (err) {
    next(err);
  }
}

export async function applyAiSuggestions(req, res, next) {
  try {
    const payload = applyAiSuggestionsSchema.parse(req.body);
    const offering = await aiSuggestionService.applySuggestions(
      req.params.id,
      req.user.instituteId,
      payload,
    );
    sendSuccess(res, 200, 'Suggestions applied', { offering });
  } catch (err) {
    next(err);
  }
}

export async function rejectAiSuggestions(req, res, next) {
  try {
    const offering = await aiSuggestionService.rejectSuggestions(
      req.params.id,
      req.user.instituteId,
    );
    sendSuccess(res, 200, 'Suggestions rejected', { offering });
  } catch (err) {
    next(err);
  }
}
