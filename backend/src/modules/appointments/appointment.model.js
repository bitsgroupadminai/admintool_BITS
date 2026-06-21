import mongoose from 'mongoose';

import { VISIT_MODE, MEETING_PROVIDER, MEETING_STATUS } from '../../shared/enums/operations.enums.js';



export const APPOINTMENT_STATUS = {

  BOOKED: 'booked',

  COMPLETED: 'completed',

  CANCELLED: 'cancelled',

  NO_SHOW: 'no_show',

};



const appointmentSchema = new mongoose.Schema(

  {

    instituteId: {

      type: mongoose.Schema.Types.ObjectId,

      ref: 'Institute',

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

      index: true,

    },

    applicantEmail: { type: String, required: true, lowercase: true, trim: true },

    slotStart: { type: Date, required: true, index: true },

    slotEnd: { type: Date, required: true },

    status: {

      type: String,

      enum: Object.values(APPOINTMENT_STATUS),

      default: APPOINTMENT_STATUS.BOOKED,

      index: true,

    },

    visitMode: {

      type: String,

      enum: Object.values(VISIT_MODE),

      default: VISIT_MODE.IN_PERSON,

    },

    meeting: {

      provider: { type: String, enum: Object.values(MEETING_PROVIDER) },

      link: { type: String, trim: true },

      meetingId: { type: String, trim: true },

      passcode: { type: String, trim: true },

      status: { type: String, enum: Object.values(MEETING_STATUS) },

      additionalRecipients: { type: [String], default: [] },

      hostStaffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

      hostStaffEmail: { type: String, lowercase: true, trim: true },

      hostStaffName: { type: String, trim: true },

      calendarEventId: { type: String, trim: true },
      generatedAt: { type: Date },

      confirmedAt: { type: Date },

      confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

      sentAt: { type: Date },
      linkSentToStudent: { type: Boolean, default: false },
    },

  },

  { timestamps: true },

);



appointmentSchema.index({ offeringId: 1, slotStart: 1, status: 1 });



export const Appointment = mongoose.model('Appointment', appointmentSchema);


