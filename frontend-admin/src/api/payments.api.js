import { apiClient } from '@/config/api';

export const paymentsApi = {
  getOverview: () => apiClient.get('/admin/payments/overview'),
  list: (params) => apiClient.get('/admin/payments', { params }),
  get: (id) => apiClient.get(`/admin/payments/${id}`),
};
