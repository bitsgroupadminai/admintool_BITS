import * as knowledgeService from './knowledgeDocument.service.js';
import { sendSuccess } from '../../core/utils/apiResponse.js';
import { AppError } from '../../core/utils/AppError.js';

export async function list(req, res, next) {
  try {
    const documents = await knowledgeService.listDocuments(
      req.user.instituteId,
      req.params.serviceId,
    );
    sendSuccess(res, 200, 'Knowledge documents', { documents });
  } catch (err) {
    next(err);
  }
}

export async function upload(req, res, next) {
  try {
    if (!req.file) {
      throw new AppError('PDF file is required', 400);
    }
    const document = await knowledgeService.uploadDocument(
      req.user.instituteId,
      req.params.serviceId,
      req.file,
    );
    sendSuccess(res, 201, 'Document uploaded', { document });
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const result = await knowledgeService.deleteDocument(
      req.params.id,
      req.user.instituteId,
    );
    sendSuccess(res, 200, 'Document deleted', result);
  } catch (err) {
    next(err);
  }
}
