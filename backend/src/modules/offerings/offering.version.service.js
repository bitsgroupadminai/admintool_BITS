import { Offering } from './offering.model.js';
import { OfferingConfigSnapshot } from './offering.version.model.js';
import { Application } from '../applications/application.model.js';
import { AppError } from '../../core/utils/AppError.js';

function buildSnapshotPayload(offering) {
  return {
    name: offering.name,
    description: offering.description,
    eligibilityRules: offering.eligibilityRules ?? [],
    documentRequirements: offering.documentRequirements ?? [],
    workflowSteps: offering.workflowSteps ?? [],
    queueMode: offering.queueMode,
    queueConfig: offering.queueConfig,
    appointmentConfig: offering.appointmentConfig,
    endDate: offering.endDate,
    status: offering.status,
  };
}

/**
 * Record a configuration snapshot when version changes.
 * @param {import('./offering.model.js').Offering} offering
 */
export async function recordOfferingConfigSnapshot(offering) {
  if (!offering.configurationVersion) return;

  await OfferingConfigSnapshot.findOneAndUpdate(
    {
      offeringId: offering._id,
      configurationVersion: offering.configurationVersion,
    },
    {
      instituteId: offering.instituteId,
      offeringId: offering._id,
      configurationVersion: offering.configurationVersion,
      snapshot: buildSnapshotPayload(offering),
    },
    { upsert: true, new: true },
  );
}

/**
 * @param {string} instituteId
 * @param {string} offeringId
 */
export async function getOfferingConfigurationVersions(instituteId, offeringId) {
  const offering = await Offering.findOne({ _id: offeringId, instituteId });
  if (!offering) {
    throw new AppError('Offering not found', 404);
  }

  const snapshots = await OfferingConfigSnapshot.find({ offeringId })
    .sort({ configurationVersion: -1 })
    .select('configurationVersion createdAt snapshot');

  const versionCounts = await Application.aggregate([
    { $match: { offeringId: offering._id } },
    { $group: { _id: '$configurationVersion', count: { $sum: 1 } } },
  ]);

  const countMap = new Map(versionCounts.map((v) => [v._id, v.count]));

  return {
    offeringId: offering._id.toString(),
    currentVersion: offering.configurationVersion ?? 1,
    versions: snapshots.map((snap) => ({
      version: snap.configurationVersion,
      recordedAt: snap.createdAt,
      requestCount: countMap.get(snap.configurationVersion) ?? 0,
      summary: {
        eligibilityRuleCount: snap.snapshot?.eligibilityRules?.length ?? 0,
        documentCount: snap.snapshot?.documentRequirements?.length ?? 0,
        workflowStepCount: snap.snapshot?.workflowSteps?.length ?? 0,
        queueMode: snap.snapshot?.queueMode ?? null,
      },
    })),
    message:
      'Existing requests keep the workflow version they started with. New requests use the current configuration.',
  };
}

/**
 * @param {string} instituteId
 * @param {string} offeringId
 * @param {number} version
 */
export async function getOfferingConfigurationVersionDetail(instituteId, offeringId, version) {
  const snapshot = await OfferingConfigSnapshot.findOne({
    offeringId,
    instituteId,
    configurationVersion: version,
  });

  if (!snapshot) {
    throw new AppError('Configuration version not found', 404);
  }

  return {
    version: snapshot.configurationVersion,
    recordedAt: snapshot.createdAt,
    snapshot: snapshot.snapshot,
  };
}
