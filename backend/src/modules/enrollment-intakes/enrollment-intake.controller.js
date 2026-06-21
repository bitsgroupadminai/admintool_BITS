import * as enrollmentIntakeService from './enrollment-intake.service.js';
import { sendSuccess } from '../../core/utils/apiResponse.js';
import { AppError } from '../../core/utils/AppError.js';
import {
  approveEnrollmentIntakeSchema,
  listEnrollmentIntakesQuerySchema,
  rejectEnrollmentIntakeSchema,
} from './enrollment-intake.validator.js';

export async function list(req, res, next) {
  try {
    const query = listEnrollmentIntakesQuerySchema.parse(req.query);
    const result = await enrollmentIntakeService.listEnrollmentIntakes(req.user.instituteId, query);
    sendSuccess(res, 200, 'Enrollment intakes', result);
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const intake = await enrollmentIntakeService.getEnrollmentIntake(
      req.user.instituteId,
      req.params.id,
    );
    sendSuccess(res, 200, 'Enrollment intake', { intake });
  } catch (err) {
    next(err);
  }
}

export async function approve(req, res, next) {
  try {
    const payload = approveEnrollmentIntakeSchema.parse(req.body ?? {});
    const intake = await enrollmentIntakeService.approveEnrollmentIntake(
      req.user.instituteId,
      req.params.id,
      req.user,
      payload,
    );
    sendSuccess(res, 200, 'Enrollment intake approved', { intake });
  } catch (err) {
    next(err);
  }
}

export async function reject(req, res, next) {
  try {
    const payload = rejectEnrollmentIntakeSchema.parse(req.body);
    const intake = await enrollmentIntakeService.rejectEnrollmentIntake(
      req.user.instituteId,
      req.params.id,
      req.user,
      payload,
    );
    sendSuccess(res, 200, 'Enrollment intake rejected', { intake });
  } catch (err) {
    next(err);
  }
}

export async function streamDocument(req, res, next) {
  try {
    await enrollmentIntakeService.streamIntakeDocument(
      req.user.instituteId,
      req.params.id,
      req.params.documentId,
      res,
      { download: req.query.download === '1' },
    );
  } catch (err) {
    if (err instanceof AppError && !res.headersSent) {
      next(err);
      return;
    }
    if (!res.headersSent) {
      next(err);
    }
  }
}
