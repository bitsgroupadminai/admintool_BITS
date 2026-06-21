import { recordOfferingConfigSnapshot } from './offering.version.service.js';

/**
 * Mongoose plugin that records configuration snapshots after save.
 * @param {import('mongoose').Schema} schema
 */
export function offeringConfigSnapshotPlugin(schema) {
  schema.post('save', async function recordSnapshot() {
    if (this.configurationVersion) {
      await recordOfferingConfigSnapshot(this).catch(() => {});
    }
  });
}
