import { apiClient } from '@/config/api';

export const notificationsApi = {
  list: (params) => apiClient.get('/notifications', { params }),
  markAllRead: () => apiClient.patch('/notifications/read-all'),
  markRead: (id) => apiClient.patch(`/notifications/${id}/read`),
};

export const queueApi = {
  listOfferings: () => apiClient.get('/staff/queue/offerings'),
  getOfferingBoard: (offeringId) => apiClient.get(`/staff/queue/offerings/${offeringId}`),
  getOfferingStats: (offeringId) => apiClient.get(`/staff/queue/offerings/${offeringId}/stats`),
  callNext: (offeringId, counterId) =>
    apiClient.post(`/staff/queue/offerings/${offeringId}/call-next`, { counterId }),
  callTicket: (ticketId, counterId) =>
    apiClient.post(`/staff/queue/tickets/${ticketId}/call`, { counterId }),
  updatePriority: (ticketId, data) =>
    apiClient.patch(`/staff/queue/tickets/${ticketId}/priority`, data),
  startServing: (ticketId) => apiClient.post(`/staff/queue/tickets/${ticketId}/serving`),
  completeTicket: (ticketId) => apiClient.post(`/staff/queue/tickets/${ticketId}/complete`),
  cancelTicket: (ticketId) => apiClient.post(`/staff/queue/tickets/${ticketId}/cancel`),
};

export const adminOperationsApi = {
  listQueueOfferings: () => apiClient.get('/admin/queue/offerings'),
  getQueueBoard: (offeringId) => apiClient.get(`/admin/queue/offerings/${offeringId}`),
  listAppointmentOfferings: () => apiClient.get('/admin/appointments/offerings'),
  listOfferingAppointments: (offeringId) =>
    apiClient.get(`/admin/appointments/offerings/${offeringId}`),
};

export const appointmentsApi = {
  listOfferings: () => apiClient.get('/staff/appointments/offerings'),
  listOfferingAppointments: (offeringId) =>
    apiClient.get(`/staff/appointments/offerings/${offeringId}`),
  listSlots: (offeringId, appointmentId) =>
    apiClient.get(`/staff/appointments/offerings/${offeringId}/slots`, {
      params: appointmentId ? { appointmentId } : undefined,
    }),
};
