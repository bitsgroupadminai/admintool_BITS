import mongoose from 'mongoose';
import { QUEUE_PRIORITY } from '../../shared/enums/operations.enums.js';

export const QUEUE_TICKET_STATUS = {
  WAITING: 'waiting',
  CALLED: 'called',
  SERVING: 'serving',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const QUEUE_TICKET_MODE = {
  WALK_IN: 'walk_in',
  APPOINTMENT: 'appointment',
};

const queueTicketSchema = new mongoose.Schema(
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
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
    },
    applicantName: { type: String, required: true, trim: true },
    applicantEmail: { type: String, required: true, lowercase: true, trim: true },
    ticketNumber: { type: Number, required: true },
    mode: {
      type: String,
      enum: Object.values(QUEUE_TICKET_MODE),
      default: QUEUE_TICKET_MODE.WALK_IN,
    },
    status: {
      type: String,
      enum: Object.values(QUEUE_TICKET_STATUS),
      default: QUEUE_TICKET_STATUS.WAITING,
      index: true,
    },
    appointmentAt: { type: Date },
    calledAt: { type: Date },
    servingAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
    counterId: { type: String, trim: true },
    counterLabel: { type: String, trim: true },
    priority: {
      type: String,
      enum: Object.values(QUEUE_PRIORITY),
      default: QUEUE_PRIORITY.NORMAL,
      index: true,
    },
    priorityReason: { type: String, trim: true, maxlength: 300 },
    prioritySetBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    prioritySetAt: { type: Date },
  },
  { timestamps: true },
);

queueTicketSchema.index({ offeringId: 1, status: 1, priority: 1, createdAt: 1 });
queueTicketSchema.index({ applicationId: 1 }, { unique: true });

export const QueueTicket = mongoose.model('QueueTicket', queueTicketSchema);
