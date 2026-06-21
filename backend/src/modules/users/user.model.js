import mongoose from 'mongoose';
import { ROLES } from '../../shared/constants/roles.js';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      required: true,
    },
    staffRole: {
      type: String,
      trim: true,
    },
    instituteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institute',
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockedUntil: {
      type: Date,
    },
    mustChangePassword: {
      type: Boolean,
      default: false,
    },
    enrolledOfferingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Offering',
    },
    enrolledProgrammeName: {
      type: String,
      trim: true,
      maxlength: 160,
    },
    enrollmentStatus: {
      type: String,
      enum: ['pending', 'enrolled', 'rejected'],
    },
    avatarUrl: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true },
);

userSchema.index({ instituteId: 1, role: 1 });

export const User = mongoose.model('User', userSchema);
