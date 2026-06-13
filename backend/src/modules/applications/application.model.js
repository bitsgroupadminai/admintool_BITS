import mongoose from 'mongoose';
import { APPLICATION_STATUS } from '../../shared/enums/application.enums.js';

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
    status: {
      type: String,
      enum: Object.values(APPLICATION_STATUS),
      default: APPLICATION_STATUS.DRAFT,
    },
    currentStepId: {
      type: String,
    },
  },
  { timestamps: true },
);

applicationSchema.index({ instituteId: 1, applicantEmail: 1, offeringId: 1 });

export const Application = mongoose.model('Application', applicationSchema);
