import mongoose from 'mongoose';

const chatSessionSchema = new mongoose.Schema(
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
    isPreview: {
      type: Boolean,
      default: false,
    },
    studentEmail: {
      type: String,
      lowercase: true,
      trim: true,
      index: true,
    },
  },
  { timestamps: true },
);

chatSessionSchema.index(
  { instituteId: 1, serviceId: 1, studentEmail: 1 },
  { unique: true, sparse: true },
);
chatSessionSchema.index({ instituteId: 1, serviceId: 1, createdAt: -1 });

export const ChatSession = mongoose.model('ChatSession', chatSessionSchema);
