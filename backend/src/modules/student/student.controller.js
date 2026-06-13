import * as studentService from './student.service.js';
import { sendSuccess } from '../../core/utils/apiResponse.js';
import {
  createApplicationSchema,
  changePasswordSchema,
} from './student.validator.js';
import * as authService from '../auth/auth.service.js';

export async function getInstitute(req, res, next) {
  try {
    const instituteId = await studentService.resolveStudentInstituteId();
    const institute = await studentService.getInstitutePublicProfile(instituteId);
    sendSuccess(res, 200, 'Institute profile', { institute });
  } catch (err) {
    next(err);
  }
}

export async function listEnrollmentOfferings(req, res, next) {
  try {
    const instituteId = await studentService.resolveStudentInstituteId();
    const offerings = await studentService.listEnrollmentOfferings(instituteId);
    sendSuccess(res, 200, 'Enrollment programmes', { offerings });
  } catch (err) {
    next(err);
  }
}

export async function getEnrollmentOffering(req, res, next) {
  try {
    const instituteId = await studentService.resolveStudentInstituteId();
    const offering = await studentService.getEnrollmentOfferingDetail(
      req.params.offeringId,
      instituteId,
    );
    sendSuccess(res, 200, 'Programme offering', { offering });
  } catch (err) {
    next(err);
  }
}

export async function createApplication(req, res, next) {
  try {
    const payload = createApplicationSchema.parse(req.body);
    const instituteId = await studentService.resolveStudentInstituteId();
    const application = await studentService.createEnrollmentApplication(instituteId, payload);
    sendSuccess(res, 201, 'Application started', { application });
  } catch (err) {
    next(err);
  }
}

export async function listServices(req, res, next) {
  try {
    const services = await studentService.listStudentServices(
      req.user.instituteId,
      req.user.enrolledOfferingId,
    );
    sendSuccess(res, 200, 'Available services', { services });
  } catch (err) {
    next(err);
  }
}

export async function getService(req, res, next) {
  try {
    const service = await studentService.getStudentServiceDetail(
      req.params.serviceId,
      req.user.instituteId,
    );
    sendSuccess(res, 200, 'Service detail', { service });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req, res, next) {
  try {
    const payload = changePasswordSchema.parse(req.body);
    const user = await authService.changeStudentPassword(req.user.userId, payload, req.sessionId);
    sendSuccess(res, 200, 'Password updated', { user });
  } catch (err) {
    next(err);
  }
}

export async function skipPasswordChange(req, res, next) {
  try {
    const user = await authService.skipPasswordChange(req.user.userId, req.sessionId);
    sendSuccess(res, 200, 'Password change skipped', { user });
  } catch (err) {
    next(err);
  }
}
