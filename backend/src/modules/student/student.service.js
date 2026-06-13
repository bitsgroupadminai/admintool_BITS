import { Institute } from '../institutes/institute.model.js';
import { Service } from '../services/service.model.js';
import { Offering } from '../offerings/offering.model.js';
import { Application } from '../applications/application.model.js';
import { AppError } from '../../core/utils/AppError.js';
import { env } from '../../core/config/env.js';
import { OFFERING_STATUS } from '../../shared/enums/offering.enums.js';
import { SERVICE_STATUS } from '../../shared/enums/service.enums.js';
import { SYSTEM_SERVICE_KEYS } from '../../shared/constants/systemServices.js';
import { APPLICATION_STATUS } from '../../shared/enums/application.enums.js';

/**
 * @returns {Promise<string>}
 */
export async function resolveStudentInstituteId() {
  if (env.STUDENT_PORTAL_INSTITUTE_ID) {
    const institute = await Institute.findById(env.STUDENT_PORTAL_INSTITUTE_ID);
    if (!institute) {
      throw new AppError('Student portal institute not found', 500);
    }
    return institute._id.toString();
  }

  const institute = await Institute.findOne({ setupCompleted: true }).sort({ createdAt: 1 });
  if (!institute) {
    throw new AppError('No institute is available for the student portal yet', 404);
  }
  return institute._id.toString();
}

/**
 * @param {string} instituteId
 */
export async function getInstitutePublicProfile(instituteId) {
  const institute = await Institute.findById(instituteId);
  if (!institute) {
    throw new AppError('Institute not found', 404);
  }

  return {
    id: institute._id.toString(),
    name: institute.name,
  };
}

/**
 * @param {string} instituteId
 */
async function getEnrollmentService(instituteId) {
  const service = await Service.findOne({
    instituteId,
    systemKey: SYSTEM_SERVICE_KEYS.ENROLLMENT,
  });
  if (!service) {
    throw new AppError('Enrollment service is not configured for this institute', 404);
  }
  return service;
}

/**
 * @param {string} instituteId
 */
export async function listEnrollmentOfferings(instituteId) {
  const service = await getEnrollmentService(instituteId);
  const offerings = await Offering.find({
    instituteId,
    serviceId: service._id,
    status: OFFERING_STATUS.ACTIVE,
  }).sort({ name: 1 });

  return offerings.map((o) => ({
    id: o._id.toString(),
    name: o.name,
    description: o.description ?? '',
    startDate: o.startDate,
    endDate: o.endDate,
  }));
}

/**
 * @param {string} offeringId
 * @param {string} instituteId
 */
export async function getEnrollmentOfferingDetail(offeringId, instituteId) {
  const service = await getEnrollmentService(instituteId);
  const offering = await Offering.findOne({
    _id: offeringId,
    instituteId,
    serviceId: service._id,
    status: OFFERING_STATUS.ACTIVE,
  });

  if (!offering) {
    throw new AppError('Programme offering not found', 404);
  }

  return {
    id: offering._id.toString(),
    name: offering.name,
    description: offering.description ?? '',
    eligibilityRules: offering.eligibilityRules ?? [],
    documentRequirements: offering.documentRequirements ?? [],
    workflowSteps: (offering.workflowSteps ?? []).map((step) => ({
      stepId: step.stepId,
      order: step.order,
      name: step.name,
      description: step.description,
      handledBy: step.handledBy,
      slaValue: step.slaValue,
      slaUnit: step.slaUnit,
    })),
    startDate: offering.startDate,
    endDate: offering.endDate,
  };
}

/**
 * @param {string} instituteId
 * @param {{ offeringId: string, applicantName: string, applicantEmail: string }} payload
 */
export async function createEnrollmentApplication(instituteId, payload) {
  const service = await getEnrollmentService(instituteId);
  const offering = await Offering.findOne({
    _id: payload.offeringId,
    instituteId,
    serviceId: service._id,
    status: OFFERING_STATUS.ACTIVE,
  });

  if (!offering) {
    throw new AppError('Programme offering not found', 404);
  }

  const email = payload.applicantEmail.toLowerCase();
  const application = await Application.create({
    instituteId,
    serviceId: service._id,
    offeringId: offering._id,
    applicantName: payload.applicantName.trim(),
    applicantEmail: email,
    status: APPLICATION_STATUS.DRAFT,
    currentStepId: offering.workflowSteps?.[0]?.stepId ?? null,
  });

  return {
    id: application._id.toString(),
    status: application.status,
    offeringId: offering._id.toString(),
    offeringName: offering.name,
    applicantName: application.applicantName,
    applicantEmail: application.applicantEmail,
    createdAt: application.createdAt,
  };
}

/**
 * @param {string} instituteId
 * @param {string} [enrolledOfferingId]
 */
export async function listStudentServices(instituteId, enrolledOfferingId) {
  const services = await Service.find({
    instituteId,
    status: SERVICE_STATUS.ACTIVE,
    systemKey: { $ne: SYSTEM_SERVICE_KEYS.ENROLLMENT },
  }).sort({ name: 1 });

  const results = [];
  for (const service of services) {
    const offerings = await Offering.find({
      instituteId,
      serviceId: service._id,
      status: OFFERING_STATUS.ACTIVE,
    }).sort({ name: 1 });

    results.push({
      id: service._id.toString(),
      name: service.name,
      description: service.description ?? '',
      offerings: offerings.map((o) => ({
        id: o._id.toString(),
        name: o.name,
        isEnrolledProgramme: enrolledOfferingId === o._id.toString(),
      })),
    });
  }

  return results;
}

/**
 * @param {string} serviceId
 * @param {string} instituteId
 */
export async function getStudentServiceDetail(serviceId, instituteId) {
  const service = await Service.findOne({
    _id: serviceId,
    instituteId,
    status: SERVICE_STATUS.ACTIVE,
    systemKey: { $ne: SYSTEM_SERVICE_KEYS.ENROLLMENT },
  });

  if (!service) {
    throw new AppError('Service not found', 404);
  }

  const offerings = await Offering.find({
    instituteId,
    serviceId: service._id,
    status: OFFERING_STATUS.ACTIVE,
  }).sort({ name: 1 });

  return {
    id: service._id.toString(),
    name: service.name,
    description: service.description ?? '',
    offerings: offerings.map((o) => ({
      id: o._id.toString(),
      name: o.name,
      eligibilityRules: o.eligibilityRules ?? [],
      documentRequirements: o.documentRequirements ?? [],
      workflowSteps: (o.workflowSteps ?? []).map((step) => ({
        stepId: step.stepId,
        order: step.order,
        name: step.name,
        description: step.description,
        handledBy: step.handledBy,
      })),
    })),
  };
}
