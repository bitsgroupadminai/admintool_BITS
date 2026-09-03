import mongoose from 'mongoose';

const instituteSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    setupCompleted: {
      type: Boolean,
      default: false,
    },
    setupCompletedAt: {
      type: Date,
    },
    isStudentPortalHost: {
      type: Boolean,
      default: false,
      index: true,
    },
    customStaffRoles: {
      type: [String],
      default: [],
    },
    autoAssignmentConfig: {
      enabled: { type: Boolean, default: true },
      strategy: { type: String, enum: ['least_loaded'], default: 'least_loaded' },
    },
    aiVerificationConfig: {
      /** Accept unofficial / AI-generated sample documents during testing. */
      allowSampleDocuments: { type: Boolean, default: false },
    },
    operationsCalendar: {
      defaultOperatingDays: {
        type: [Number],
        default: [1, 2, 3, 4, 5],
      },
      exceptions: {
        type: [
          {
            date: { type: String, required: true },
            type: { type: String, enum: ['closed', 'modified_hours'], required: true },
            reason: { type: String, trim: true, maxlength: 200 },
            operatingHoursStart: { type: String },
            operatingHoursEnd: { type: String },
          },
        ],
        default: [],
      },
    },
    erpSync: {
      enabled: { type: Boolean, default: false },
      /** SHA-256 hash of the issued API key (raw key is shown once at generation). */
      apiKeyHash: { type: String, default: null, index: true },
      /** Non-secret prefix for display, e.g. "erp_ab12cd34". */
      apiKeyPrefix: { type: String, default: null },
      keyGeneratedAt: { type: Date, default: null },
      lastSyncAt: { type: Date, default: null },
    },
  },
  { timestamps: true },
);

export const Institute = mongoose.model('Institute', instituteSchema);
