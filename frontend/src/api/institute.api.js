import { apiClient } from '@/config/api';

export const instituteApi = {
  get: (id) => apiClient.get(`/institutes/${id}`),
  update: (id, data) => apiClient.patch(`/institutes/${id}`, data),
  getSetupSummary: (id) => apiClient.get(`/institutes/${id}/setup/summary`),
  completeSetup: (id) => apiClient.post(`/institutes/${id}/setup/complete`),
};
