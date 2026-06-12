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
    customStaffRoles: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true },
);

export const Institute = mongoose.model('Institute', instituteSchema);
