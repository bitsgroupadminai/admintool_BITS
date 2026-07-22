import { apiClient } from '@/config/api';

export const erpApi = {
  getStatus: () => apiClient.get('/admin/erp'),
  generateApiKey: () => apiClient.post('/admin/erp/api-key'),
  revokeApiKey: () => apiClient.delete('/admin/erp/api-key'),
};
