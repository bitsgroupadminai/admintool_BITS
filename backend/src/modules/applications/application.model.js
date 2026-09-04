import mongoose from 'mongoose';
import { APPLICATION_STATUS, DOCUMENT_REVIEW_STATUS } from '../../shared/enums/application.enums.js';

const workflowOutcomeSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    route: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false },
);

const workflowStepSnapshotSchema = new mongoose.Schema(
  {
    stepId: { type: String, required: true },
    order: { type: Number, required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    staffInstructions: { type: String, trim: true, default: '' },
    adminInstructions: { type: String, trim: true, default: '' },
    studentInstructions: { type: String, trim: true, default: '' },
    studentEmail: {
      subject: { type: String, trim: true, default: '' },
      headline: { type: String, trim: true, default: '' },
      body: { type: String, trim: true, default: '' },
    },
    handledBy: {
      type: { type: String, required: true },
      assignee: { type: String, required: true, trim: true },
    },
    slaValue: { type: Number, required: true, min: 1 },
    slaUnit: { type: String, required: true },
    outcomes: { type: [workflowOutcomeSchema], default: [] },
  },
  { _id: false },
);

const workflowHistorySchema = new mongoose.Schema(
  {
    stepId: { type: String, required: true },
    stepName: { type: String, required: true, trim: true },
    outcome: { type: String, required: true },
    actedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actedByName: { type: String, trim: true, default: '' },
    actedByRole: { type: String, trim: true, default: '' },
    note: { type: String, trim: true, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const applicationDocumentSchema = new mongoose.Schema(
  {
    requirementId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    requirementName: {
      type: String,
      required: true,
      trim: true,
    },
    originalName: {
      type: String,
      required: true,
      trim: true,
    },
    storedName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    sizeBytes: {
      type: Number,
      required: true,
      min: 1,
    },
    filePath: {
      type: String,
      required: true,
    },
    storageId: {
      type: String,
      trim: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    reviewStatus: {
      type: String,
      enum: Object.values(DOCUMENT_REVIEW_STATUS),
      default: DOCUMENT_REVIEW_STATUS.PENDING,
    },
    reviewNote: {
      type: String,
      trim: true,
      default: '',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedByName: {
      type: String,
      trim: true,
      default: '',
    },
    reviewedAt: {
      type: Date,
    },
  },
  { _id: true },
);

const applicationSchema = new mongoose.Schema(
  {
    instituteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institute',
      required: true,
      index: true,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
      index: true,
    },
    offeringId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Offering',
      required: true,
      index: true,
    },
    applicantName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    applicantEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    applicantMobile: {
      type: String,
      trim: true,
      maxlength: 20,
    },
    applicantDetails: {
      type: [
        {
          fieldKey: { type: String, required: true, trim: true },
          label: { type: String, required: true, trim: true },
          value: { type: mongoose.Schema.Types.Mixed },
        },
      ],
      default: [],
    },
    status: {
      type: String,
      enum: Object.values(APPLICATION_STATUS),
      default: APPLICATION_STATUS.DRAFT,
    },
    currentStepId: {
      type: String,
    },
    configurationVersion: {
      type: Number,
    },
    workflowSnapshot: {
      type: [workflowStepSnapshotSchema],
      default: [],
    },
    workflowHistory: {
      type: [workflowHistorySchema],
      default: [],
    },
    correctionNote: {
      type: String,
      trim: true,
    },
    correctionRequiredDocuments: {
      type: [String],
      default: [],
    },
    rollbackNote: {
      type: String,
      trim: true,
    },
    rolledBackToStepId: {
      type: String,
    },
    rolledBackAt: {
      type: Date,
    },
    autoAssignedAt: {
      type: Date,
    },
    currentStepStartedAt: {
      type: Date,
    },
    currentStepDueAt: {
      type: Date,
    },
    slaBreached: {
      type: Boolean,
      default: false,
    },
    aiVerificationPending: {
      type: Boolean,
      default: false,
    },
    documents: {
      type: [applicationDocumentSchema],
      default: [],
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    assignedAt: {
      type: Date,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true },
);

applicationSchema.index({ instituteId: 1, applicantEmail: 1, offeringId: 1 });
applicationSchema.index({ instituteId: 1, assignedTo: 1, status: 1 });

export const Application = mongoose.model('Application', applicationSchema);
