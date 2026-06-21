import mongoose from 'mongoose';
import { Service } from './service.model.js';
import { Offering } from '../offerings/offering.model.js';
import { AppError } from '../../core/utils/AppError.js';
import { SERVICE_STATUS } from '../../shared/enums/service.enums.js';
import { OFFERING_STATUS } from '../../shared/enums/offering.enums.js';
import { deleteAllForService as deleteKnowledgeDocumentsForService } from '../knowledge-documents/knowledgeDocument.service.js';
import { enqueueServiceReindex } from '../../core/queues/embedding.queue.js';
import { isOfferingReadyForServiceActivation } from '../../shared/helpers/offeringCompleteness.helper.js';
import { cachedRead } from '../../shared/helpers/cachedRead.helper.js';
import { cacheNs } from '../../shared/constants/cacheKeys.js';
import { flushInstituteReadCache } from '../../shared/helpers/cacheInvalidation.helper.js';

async function loadServicesList(instituteId) {
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
    isSystem: Boolean(s.isSystem),
    systemKey: s.systemKey ?? null,
    offeringCount: countMap[s._id.toString()]?.total ?? 0,
    activeOfferingCount: countMap[s._id.toString()]?.active ?? 0,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }));
}

/**
 * @param {string} instituteId
 */
export async function listServices(instituteId) {
  return cachedRead(cacheNs.SERVICES_LIST, [instituteId], () => loadServicesList(instituteId));
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

  await flushInstituteReadCache(instituteId);
  return formatService(service);
}

/**
 * @param {string} serviceId
 * @param {string} instituteId
 */
async function loadServiceById(serviceId, instituteId) {
  const service = await Service.findOne({ _id: serviceId, instituteId });
  if (!service) {
    throw new AppError('Service not found', 404);
  }
  return formatService(service);
}

/**
 * @param {string} serviceId
 * @param {string} instituteId
 */
export async function getServiceById(serviceId, instituteId) {
  return cachedRead(cacheNs.SERVICE_DETAIL, [instituteId, serviceId], () =>
    loadServiceById(serviceId, instituteId),
  );
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
  await enqueueServiceReindex(instituteId, serviceId, 'service-update');
  await flushInstituteReadCache(instituteId);
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

  if (service.isSystem) {
    throw new AppError('System services cannot be deleted', 400);
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
  await flushInstituteReadCache(instituteId);
  return { id: serviceId };
}

/**
 * @param {string} serviceId
 * @param {string} instituteId
 */
export async function countServiceReadyOfferings(serviceId, instituteId) {
  const offerings = await Offering.find({ serviceId, instituteId });
  return offerings.filter(isOfferingReadyForServiceActivation).length;
}

/**
 * Keep service live while at least one offering is active or fully configured.
 * @param {string} serviceId
 * @param {string} instituteId
 */
export async function syncServiceActiveStatus(serviceId, instituteId) {
  const service = await Service.findOne({ _id: serviceId, instituteId });
  if (!service) return;

  if (
    service.status === SERVICE_STATUS.DISABLED ||
    service.status === SERVICE_STATUS.ARCHIVED
  ) {
    return;
  }

  const readyCount = await countServiceReadyOfferings(serviceId, instituteId);

  await Service.updateOne(
    { _id: serviceId, instituteId },
    {
      $set: {
        status: readyCount > 0 ? SERVICE_STATUS.ACTIVE : SERVICE_STATUS.DRAFT,
      },
    },
  );
}

/**
 * @param {string} serviceId
 * @param {string} instituteId
 */
export async function activateService(serviceId, instituteId) {
  const service = await Service.findOne({ _id: serviceId, instituteId });
  if (!service) {
    throw new AppError('Service not found', 404);
  }

  if (service.status === SERVICE_STATUS.ACTIVE) {
    return formatService(service);
  }

  if (
    service.status === SERVICE_STATUS.DISABLED ||
    service.status === SERVICE_STATUS.ARCHIVED
  ) {
    throw new AppError('This service cannot be activated in its current state', 400);
  }

  const readyCount = await countServiceReadyOfferings(serviceId, instituteId);
  if (readyCount === 0) {
    throw new AppError(
      'At least one offering must be active or fully configured before activating this service',
      400,
    );
  }

  service.status = SERVICE_STATUS.ACTIVE;
  await service.save();
  await flushInstituteReadCache(instituteId);
  return formatService(service);
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
    isSystem: Boolean(service.isSystem),
    systemKey: service.systemKey ?? null,
    knowledgeInsights: service.knowledgeInsights ?? null,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
  };
}
