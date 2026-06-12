import mongoose from 'mongoose';
import { Service } from './service.model.js';
import { Offering } from '../offerings/offering.model.js';
import { AppError } from '../../core/utils/AppError.js';
import { SERVICE_STATUS } from '../../shared/enums/service.enums.js';
import { OFFERING_STATUS } from '../../shared/enums/offering.enums.js';
import { deleteAllForService as deleteKnowledgeDocumentsForService } from '../knowledge-documents/knowledgeDocument.service.js';

/**
 * @param {string} instituteId
 */
export async function listServices(instituteId) {
  const services = await Service.find({ instituteId }).sort({ createdAt: -1 });
  if (services.length === 0) return [];

  const offeringCounts = await Offering.aggregate([
    { $match: { instituteId: new mongoose.Types.ObjectId(instituteId) } },
    {
      $group: {
        _id: '$serviceId',
        total: { $sum: 1 },
        active: {
          $sum: { $cond: [{ $eq: ['$status', OFFERING_STATUS.ACTIVE] }, 1, 0] },
        },
      },
    },
  ]);

  const countMap = Object.fromEntries(
    offeringCounts.map((c) => [c._id.toString(), c]),
  );

  return services.map((s) => ({
    id: s._id.toString(),
    name: s.name,
    description: s.description ?? '',
    status: s.status,
    offeringCount: countMap[s._id.toString()]?.total ?? 0,
    activeOfferingCount: countMap[s._id.toString()]?.active ?? 0,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }));
}

/**
 * @param {string} instituteId
 * @param {{ name: string, description?: string }} payload
 */
export async function createService(instituteId, payload) {
  const nameNormalized = payload.name.trim().toLowerCase();
  const existing = await Service.findOne({ instituteId, nameNormalized });
  if (existing) {
    throw new AppError('A service with this name already exists', 409);
  }

  const service = await Service.create({
    instituteId,
    name: payload.name.trim(),
    nameNormalized,
    description: payload.description?.trim(),
    status: SERVICE_STATUS.DRAFT,
  });

  return formatService(service);
}

/**
 * @param {string} serviceId
 * @param {string} instituteId
 */
export async function getServiceById(serviceId, instituteId) {
  const service = await Service.findOne({ _id: serviceId, instituteId });
  if (!service) {
    throw new AppError('Service not found', 404);
  }
  return formatService(service);
}

/**
 * @param {string} serviceId
 * @param {string} instituteId
 * @param {Object} payload
 */
export async function updateService(serviceId, instituteId, payload) {
  const service = await Service.findOne({ _id: serviceId, instituteId });
  if (!service) {
    throw new AppError('Service not found', 404);
  }

  if (payload.name) {
    const nameNormalized = payload.name.trim().toLowerCase();
    const duplicate = await Service.findOne({
      instituteId,
      nameNormalized,
      _id: { $ne: serviceId },
    });
    if (duplicate) {
      throw new AppError('A service with this name already exists', 409);
    }
    service.name = payload.name.trim();
    service.nameNormalized = nameNormalized;
  }

  if (payload.description !== undefined) {
    service.description = payload.description?.trim() ?? '';
  }

  if (payload.status) {
    service.status = payload.status;
  }

  await service.save();
  await syncServiceActiveStatus(serviceId, instituteId);
  return formatService(service);
}

/**
 * @param {string} serviceId
 * @param {string} instituteId
 */
export async function deleteService(serviceId, instituteId) {
  const service = await Service.findOne({ _id: serviceId, instituteId });
  if (!service) {
    throw new AppError('Service not found', 404);
  }

  const offeringCount = await Offering.countDocuments({ serviceId });
  if (offeringCount > 0) {
    throw new AppError(
      'Cannot delete service with existing offerings. Delete all offerings first.',
      400,
    );
  }

  await deleteKnowledgeDocumentsForService(serviceId, instituteId);
  await Service.deleteOne({ _id: serviceId });
  return { id: serviceId };
}

/**
 * Promote service to active when it has at least one active offering.
 * @param {string} serviceId
 * @param {string} instituteId
 */
export async function syncServiceActiveStatus(serviceId, instituteId) {
  const activeCount = await Offering.countDocuments({
    serviceId,
    instituteId,
    status: OFFERING_STATUS.ACTIVE,
  });

  await Service.updateOne(
    { _id: serviceId, instituteId },
    {
      $set: {
        status: activeCount > 0 ? SERVICE_STATUS.ACTIVE : SERVICE_STATUS.DRAFT,
      },
    },
  );
}

/**
 * @param {import('./service.model.js').Service} service
 */
function formatService(service) {
  return {
    id: service._id.toString(),
    name: service.name,
    description: service.description ?? '',
    status: service.status,
    knowledgeInsights: service.knowledgeInsights ?? null,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
  };
}
