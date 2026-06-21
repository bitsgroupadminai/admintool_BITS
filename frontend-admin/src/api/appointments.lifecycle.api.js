import { apiClient } from '@/config/api';

export const appointmentLifecycleApi = {
  markComplete: (appointmentId) =>
    apiClient.patch(`/staff/appointments/${appointmentId}/complete`),
  markNoShow: (appointmentId) =>
    apiClient.patch(`/staff/appointments/${appointmentId}/no-show`),
  reschedule: (appointmentId, data) =>
    apiClient.patch(`/staff/appointments/${appointmentId}/reschedule`, data),
  updateMeeting: (appointmentId, data) =>
    apiClient.patch(`/staff/appointments/${appointmentId}/meeting`, data),
  generateMeeting: (appointmentId) =>
    apiClient.post(`/staff/appointments/${appointmentId}/generate-meeting`),
  sendMeetingLink: (appointmentId, data) =>
    apiClient.post(`/staff/appointments/${appointmentId}/send-meeting-link`, data),
  /** @deprecated */
  confirmVirtual: (appointmentId) =>
    apiClient.post(`/staff/appointments/${appointmentId}/confirm-virtual`),
  /** @deprecated */
  regenerateMeeting: (appointmentId) =>
    apiClient.post(`/staff/appointments/${appointmentId}/regenerate-meeting`),
};
