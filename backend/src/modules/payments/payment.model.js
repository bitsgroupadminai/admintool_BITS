import mongoose from 'mongoose';
import { PAYMENT_PURPOSE, PAYMENT_STATUS } from '../../shared/enums/payment.enums.js';

const paymentSchema = new mongoose.Schema(
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
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
    },
    offeringId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Offering',
      required: true,
    },
    applicantEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    purpose: {
      type: String,
      enum: Object.values(PAYMENT_PURPOSE),
      required: true,
    },
    workflowStepId: {
      type: String,
      trim: true,
    },
    label: {
      type: String,
      trim: true,
      default: 'Service fee',
    },
    amountPaise: {
      type: Number,
      required: true,
      min: 100,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    razorpayOrderId: {
      type: String,
      required: true,
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      trim: true,
    },
    razorpaySignature: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.CREATED,
    },
    paidAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

paymentSchema.index({ applicationId: 1, purpose: 1, workflowStepId: 1, status: 1 });

export const Payment = mongoose.model('Payment', paymentSchema);
