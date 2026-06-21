import { apiClient } from '@/config/api';

export const notificationsApi = {
  list: (params) => apiClient.get('/notifications', { params }),
  markAllRead: () => apiClient.patch('/notifications/read-all'),
  markRead: (id) => apiClient.patch(`/notifications/${id}/read`),
};

export const queueApi = {
  join: (applicationId) => apiClient.post(`/student/queue/applications/${applicationId}/join`),
  status: (applicationId) => apiClient.get(`/student/queue/applications/${applicationId}/status`),
  cancel: (applicationId) => apiClient.post(`/student/queue/applications/${applicationId}/cancel`),
};

export const appointmentsApi = {
  listSlots: (offeringId, applicationId) =>
    apiClient.get(`/student/appointments/offerings/${offeringId}/slots`, {
      params: applicationId ? { applicationId } : undefined,
    }),
  book: (applicationId, slotStart, options = {}) =>
    apiClient.post(`/student/appointments/applications/${applicationId}/book`, {
      slotStart,
      ...options,
    }),
  current: (applicationId) =>
    apiClient.get(`/student/appointments/applications/${applicationId}/current`),
  cancel: (applicationId) =>
    apiClient.post(`/student/appointments/applications/${applicationId}/cancel`),
  reschedule: (applicationId, slotStart) =>
    apiClient.post(`/student/appointments/applications/${applicationId}/reschedule`, { slotStart }),
};

export const chatApi = {
  history: (serviceId) => apiClient.get(`/student/services/${serviceId}/chat/history`),
  send: (serviceId, message, offeringId) =>
    apiClient.post(`/student/services/${serviceId}/chat/messages`, {
      message,
      ...(offeringId ? { offeringId } : {}),
    }),
};
