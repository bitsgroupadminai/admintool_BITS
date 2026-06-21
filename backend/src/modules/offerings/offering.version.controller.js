import * as versionService from './offering.version.service.js';
import { sendSuccess } from '../../core/utils/apiResponse.js';

export async function getConfigurationVersions(req, res, next) {
  try {
    const result = await versionService.getOfferingConfigurationVersions(
      req.user.instituteId,
      req.params.id,
    );
    sendSuccess(res, 200, 'Offering configuration versions', result);
  } catch (err) {
    next(err);
  }
}

export async function getConfigurationVersionDetail(req, res, next) {
  try {
    const version = Number.parseInt(req.params.version, 10);
    const result = await versionService.getOfferingConfigurationVersionDetail(
      req.user.instituteId,
      req.params.id,
      version,
    );
    sendSuccess(res, 200, 'Configuration version detail', result);
  } catch (err) {
    next(err);
  }
}
