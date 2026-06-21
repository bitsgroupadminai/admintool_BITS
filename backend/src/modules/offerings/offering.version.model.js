import mongoose from 'mongoose';

const offeringConfigSnapshotSchema = new mongoose.Schema(
  {
    instituteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institute',
      required: true,
      index: true,
    },
    offeringId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Offering',
      required: true,
      index: true,
    },
    configurationVersion: { type: Number, required: true },
    snapshot: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);

offeringConfigSnapshotSchema.index({ offeringId: 1, configurationVersion: 1 }, { unique: true });

export const OfferingConfigSnapshot = mongoose.model(
  'OfferingConfigSnapshot',
  offeringConfigSnapshotSchema,
);
