import { apiClient } from '@/config/api';

export const notificationsApi = {
  list: (params) => apiClient.get('/notifications', { params }),
  markAllRead: () => apiClient.patch('/notifications/read-all'),
  markRead: (id) => apiClient.patch(`/notifications/${id}/read`),
  broadcast: (data) => apiClient.post('/notifications/broadcast', data),
  listBroadcasts: (params) => apiClient.get('/notifications/broadcasts', { params }),
};
