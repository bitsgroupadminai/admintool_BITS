import * as versionService from './knowledgeDocument.version.service.js';
import { sendSuccess } from '../../core/utils/apiResponse.js';

export async function listVersions(req, res, next) {
  try {
    const result = await versionService.listKnowledgeDocumentVersions(
      req.user.instituteId,
      req.params.serviceId,
      req.params.id,
    );
    sendSuccess(res, 200, 'Knowledge document versions', result);
  } catch (err) {
    next(err);
  }
}

export async function getCoverage(req, res, next) {
  try {
    const result = await versionService.getServiceKnowledgeCoverage(
      req.user.instituteId,
      req.params.id,
    );
    sendSuccess(res, 200, 'Knowledge coverage', result);
  } catch (err) {
    next(err);
  }
}
