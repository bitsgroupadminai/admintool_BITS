import mongoose from 'mongoose';
import { SERVICE_STATUS } from '../../shared/enums/service.enums.js';

const serviceSchema = new mongoose.Schema(
  {
    instituteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institute',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    nameNormalized: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: Object.values(SERVICE_STATUS),
      default: SERVICE_STATUS.DRAFT,
    },
    knowledgeInsights: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true },
);

serviceSchema.index({ instituteId: 1, nameNormalized: 1 }, { unique: true });

export const Service = mongoose.model('Service', serviceSchema);
