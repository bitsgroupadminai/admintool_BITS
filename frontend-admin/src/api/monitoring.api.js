import { apiClient } from '@/config/api';

export const monitoringApi = {
  health: () => apiClient.get('/monitoring/health'),
};
