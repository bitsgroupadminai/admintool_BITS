import { AppError } from '../../core/utils/AppError.js';
import * as studentService from './student.service.js';
import { sendSuccess } from '../../core/utils/apiResponse.js';
import {
  createApplicationSchema,
  changePasswordSchema,
  listInstitutesQuerySchema,
  enrollmentIntakeStatusQuerySchema,
  startServiceApplicationSchema,
  updateServiceApplicationDetailsSchema,
} from './student.validator.js';
import * as authService from '../auth/auth.service.js';

export async function listInstitutes(req, res, next) {
  try {
    const query = listInstitutesQuerySchema.parse(req.query);
    const result = await studentService.listStudentPortalInstitutes(query);
    sendSuccess(res, 200, 'Institutes', result);
  } catch (err) {
    next(err);
  }
}

export async function getInstitute(req, res, next) {
  try {
    const institute = await studentService.getInstitutePublicProfile(req.params.instituteId);
    sendSuccess(res, 200, 'Institute profile', { institute });
  } catch (err) {
    next(err);
  }
}

export async function listEnrollmentOfferings(req, res, next) {
  try {
    const offerings = await studentService.listEnrollmentOfferings(req.params.instituteId);
    sendSuccess(res, 200, 'Enrollment programmes', { offerings });
  } catch (err) {
    next(err);
  }
}

export async function getEnrollmentOffering(req, res, next) {
  try {
    const offering = await studentService.getEnrollmentOfferingDetail(
      req.params.offeringId,
      req.params.instituteId,
    );
    sendSuccess(res, 200, 'Programme offering', { offering });
  } catch (err) {
    next(err);
  }
}

export async function getEnrollmentIntakeStatus(req, res, next) {
  try {
    const query = enrollmentIntakeStatusQuerySchema.parse(req.query);
    const status = await studentService.getEnrollmentIntakeStatus(
      req.params.instituteId,
      query.offeringId,
      query.email,
    );
    sendSuccess(res, 200, 'Enrollment intake status', { intake: status });
  } catch (err) {
    next(err);
  }
}

export async function createApplication(req, res, next) {
  try {
    let applicantDetails = {};
    if (req.body.applicantDetails) {
      try {
        applicantDetails =
          typeof req.body.applicantDetails === 'string'
            ? JSON.parse(req.body.applicantDetails)
            : req.body.applicantDetails;
      } catch {
        throw new AppError('Invalid applicant details', 400);
      }
    }

    const payload = createApplicationSchema.parse({
      offeringId: req.body.offeringId,
      applicantName: req.body.applicantName,
      applicantEmail: req.body.applicantEmail,
      applicantMobile: req.body.applicantMobile,
      applicantDetails,
    });
    const application = await studentService.createEnrollmentApplication(
      req.params.instituteId,
      payload,
      req.file,
    );
    sendSuccess(res, 201, 'Application started', { application });
  } catch (err) {
    next(err);
  }
}

export async function listApplications(req, res, next) {
  try {
    const applications = await studentService.listStudentApplications(
      req.user.instituteId,
      req.user.email,
    );
    sendSuccess(res, 200, 'Your requests', { applications });
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
      req.user,
    );
    sendSuccess(res, 200, 'Service detail', { service });
  } catch (err) {
    next(err);
  }
}

export async function startServiceApplication(req, res, next) {
  try {
    const payload = startServiceApplicationSchema.parse(req.body ?? {});
    const application = await studentService.startStudentServiceApplication(
      req.user.instituteId,
      req.user,
      req.params.serviceId,
      req.params.offeringId,
      payload.applicantDetails ?? {},
    );
    sendSuccess(res, 201, 'Request started', { application });
  } catch (err) {
    next(err);
  }
}

export async function updateServiceApplicationDetails(req, res, next) {
  try {
    const payload = updateServiceApplicationDetailsSchema.parse(req.body);
    const application = await studentService.updateStudentServiceApplicationDetails(
      req.user.instituteId,
      req.user,
      req.params.serviceId,
      req.params.offeringId,
      payload.applicantDetails,
    );
    sendSuccess(res, 200, 'Details updated', { application });
  } catch (err) {
    next(err);
  }
}

export async function submitServiceApplication(req, res, next) {
  try {
    const application = await studentService.submitStudentServiceApplication(
      req.user.instituteId,
      req.user,
      req.params.serviceId,
      req.params.offeringId,
    );
    sendSuccess(res, 200, 'Request submitted', { application });
  } catch (err) {
    next(err);
  }
}

export async function resubmitServiceApplication(req, res, next) {
  try {
    const application = await studentService.resubmitStudentServiceApplication(
      req.user.instituteId,
      { email: req.user.email, name: req.user.name, userId: req.user.userId },
      req.params.serviceId,
      req.params.offeringId,
    );
    sendSuccess(res, 200, 'Request resubmitted', { application });
  } catch (err) {
    next(err);
  }
}

export async function uploadServiceApplicationDocument(req, res, next) {
  try {
    const application = await studentService.uploadStudentApplicationDocument(
      req.user.instituteId,
      { email: req.user.email },
      req.params.serviceId,
      req.params.offeringId,
      req.params.requirementId,
      req.file,
    );
    sendSuccess(res, 200, 'Document uploaded', { application });
  } catch (err) {
    next(err);
  }
}

export async function removeServiceApplicationDocument(req, res, next) {
  try {
    const application = await studentService.removeStudentApplicationDocument(
      req.user.instituteId,
      { email: req.user.email },
      req.params.serviceId,
      req.params.offeringId,
      req.params.requirementId,
    );
    sendSuccess(res, 200, 'Document removed', { application });
  } catch (err) {
    next(err);
  }
}

export async function downloadServiceApplicationDocument(req, res, next) {
  try {
    await studentService.streamStudentApplicationDocument(
      req.user.instituteId,
      req.user.email,
      req.params.serviceId,
      req.params.offeringId,
      req.params.documentId,
      res,
      { download: req.query.download === '1' },
    );
  } catch (err) {
    if (!res.headersSent) {
      next(err);
    }
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
