import mongoose from 'mongoose';

export const AI_DECISION_HANDLER = {
  DOCUMENT_VERIFICATION: 'document_verification',
  ELIGIBILITY_SCREENING: 'eligibility_screening',
  INTAKE_AUTHORIZATION: 'intake_authorization',
};

export const AI_DECISION_ACTION = {
  APPROVED: 'approved',
  RETURNED_FOR_CORRECTION: 'returned_for_correction',
  ESCALATED: 'escalated',
  RECOMMENDATION: 'recommendation',
  FAILED: 'failed',
};

const aiDecisionSchema = new mongoose.Schema(
  {
    instituteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institute',
      required: true,
      index: true,
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      index: true,
    },
    offeringId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Offering',
    },
    stepId: { type: String },
    stepName: { type: String, trim: true, default: '' },
    handler: {
      type: String,
      enum: Object.values(AI_DECISION_HANDLER),
      required: true,
    },
    /** How the system acted on the AI verdict (auto-approve, escalate, etc). */
    action: {
      type: String,
      enum: Object.values(AI_DECISION_ACTION),
      required: true,
    },
    /** The model's raw verdict: pass | fail | uncertain. */
    verdict: { type: String },
    confidence: { type: Number, min: 0, max: 1 },
    summary: { type: String, trim: true, default: '' },
    issues: { type: [String], default: [] },
    /** Per-document findings (document verification). */
    perDocument: { type: [mongoose.Schema.Types.Mixed], default: [] },
    /** Extracted values used for deterministic eligibility comparison. */
    extractedFields: { type: [mongoose.Schema.Types.Mixed], default: [] },
    /** Deterministic eligibility evaluation result, when applicable. */
    eligibilityResult: { type: mongoose.Schema.Types.Mixed, default: null },
    modelUsed: { type: String, trim: true, default: '' },
    error: { type: String, trim: true, default: '' },
    /** Full raw model payload for auditing/debugging. */
    raw: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

aiDecisionSchema.index({ instituteId: 1, applicationId: 1, createdAt: -1 });

export const AiDecision = mongoose.model('AiDecision', aiDecisionSchema);
