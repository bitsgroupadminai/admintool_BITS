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
  },
  { timestamps: true },
);

chatSessionSchema.index({ serviceId: 1, createdAt: -1 });

export const ChatSession = mongoose.model('ChatSession', chatSessionSchema);
