import { updateInstituteSchema } from '../auth/auth.validator.js';
import * as instituteService from './institute.service.js';
import { sendSuccess } from '../../core/utils/apiResponse.js';

export async function getInstitute(req, res, next) {
  try {
    const institute = await instituteService.getInstituteForUser(
      req.params.id,
      req.user.instituteId,
    );
    sendSuccess(res, 200, 'Institute details', {
      institute: {
        id: institute._id.toString(),
        name: institute.name,
        setupCompleted: institute.setupCompleted,
        isStudentPortalHost: institute.isStudentPortalHost ?? false,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateInstitute(req, res, next) {
  try {
    const payload = updateInstituteSchema.parse(req.body);
    const institute = await instituteService.updateInstitute(
      req.params.id,
      req.user.instituteId,
      payload,
    );
    sendSuccess(res, 200, 'Institute updated', {
      institute: {
        id: institute._id.toString(),
        name: institute.name,
        setupCompleted: institute.setupCompleted,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getSetupSummary(req, res, next) {
  try {
    const summary = await instituteService.getSetupSummary(
      req.params.id,
      req.user.instituteId,
    );
    sendSuccess(res, 200, 'Setup summary', summary);
  } catch (err) {
    next(err);
  }
}

export async function designateStudentPortalHost(req, res, next) {
  try {
    const institute = await instituteService.designateStudentPortalHost(
      req.params.id,
      req.user.instituteId,
    );
    sendSuccess(res, 200, 'Student portal host updated', { institute });
  } catch (err) {
    next(err);
  }
}
export async function completeSetup(req, res, next) {
  try {
    const institute = await instituteService.completeSetup(
      req.params.id,
      req.user.instituteId,
    );
    sendSuccess(res, 200, 'Setup completed', {
      institute: {
        id: institute._id.toString(),
        name: institute.name,
        setupCompleted: institute.setupCompleted,
      },
    });
  } catch (err) {
    next(err);
  }
}
