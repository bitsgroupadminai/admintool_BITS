import mongoose from 'mongoose';
import {
  OFFERING_STATUS,
  QUEUE_MODE,
  RULE_FIELD_TYPE,
  RULE_OPERATOR,
  SLA_UNIT,
  DOCUMENT_FILE_TYPES,
} from '../../shared/enums/offering.enums.js';
import {
  HANDLER_TYPE,
  OUTCOME_TYPE,
  ROUTE_ACTION,
  TERMINAL_STATE,
} from '../../shared/enums/workflow.enums.js';

const eligibilityRuleSchema = new mongoose.Schema(
  {
    field: { type: String, required: true, trim: true },
    fieldType: {
      type: String,
      enum: Object.values(RULE_FIELD_TYPE),
      required: true,
    },
    operator: {
      type: String,
      enum: Object.values(RULE_OPERATOR),
      required: true,
    },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { _id: true },
);

const documentRequirementSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    required: { type: Boolean, default: true },
    allowedTypes: {
      type: [String],
      enum: DOCUMENT_FILE_TYPES,
      default: ['pdf'],
    },
    maxSizeMb: { type: Number, default: 5, min: 1, max: 25 },
  },
  { _id: true },
);

const outcomeRouteSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: Object.values(ROUTE_ACTION),
      required: true,
    },
    nextStepId: { type: String },
    terminalState: {
      type: String,
      enum: Object.values(TERMINAL_STATE),
    },
    returnToStepId: { type: String },
    requireReupload: { type: [String], default: [] },
  },
  { _id: false },
);

const stepOutcomeSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: Object.values(OUTCOME_TYPE),
      required: true,
    },
    route: { type: outcomeRouteSchema, required: true },
  },
  { _id: false },
);

const workflowStepSchema = new mongoose.Schema(
  {
    stepId: { type: String, required: true },
    order: { type: Number, required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    handledBy: {
      type: {
        type: String,
        enum: Object.values(HANDLER_TYPE),
        required: true,
      },
      assignee: { type: String, required: true, trim: true },
    },
    slaValue: { type: Number, required: true, min: 1 },
    slaUnit: {
      type: String,
      enum: Object.values(SLA_UNIT),
      required: true,
    },
    outcomes: { type: [stepOutcomeSchema], required: true },
    assignedRole: { type: String },
    allowedActions: { type: [String] },
  },
  { _id: true },
);

const offeringSchema = new mongoose.Schema(
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
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    status: {
      type: String,
      enum: Object.values(OFFERING_STATUS),
      default: OFFERING_STATUS.DRAFT,
    },
    startDate: { type: Date },
    endDate: { type: Date },
    configurationVersion: {
      type: Number,
      default: 1,
    },
    eligibilityRules: [eligibilityRuleSchema],
    documentRequirements: [documentRequirementSchema],
    workflowSteps: [workflowStepSchema],
    queueMode: {
      type: String,
      enum: Object.values(QUEUE_MODE),
    },
    queueConfig: {
      capacity: { type: Number, min: 1 },
      processingRatePerHour: { type: Number, min: 1 },
    },
    appointmentConfig: {
      slotDurationMinutes: { type: Number, min: 5 },
      slotCapacity: { type: Number, min: 1 },
      operatingHoursStart: { type: String },
      operatingHoursEnd: { type: String },
    },
    aiSuggestions: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    activatedAt: { type: Date },
  },
  { timestamps: true },
);

offeringSchema.index({ instituteId: 1, serviceId: 1, name: 1 });

/** @typedef {mongoose.InferSchemaType<typeof offeringSchema> & { _id: mongoose.Types.ObjectId }} OfferingDocument */

export const Offering = mongoose.model('Offering', offeringSchema);
