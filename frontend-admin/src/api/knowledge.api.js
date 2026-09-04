import { apiClient } from '@/config/api';

export const knowledgeApi = {
  list: (serviceId) => apiClient.get(`/services/${serviceId}/knowledge-documents`),
  upload: (serviceId, file) => {
    const form = new FormData();
    form.append('file', file);
    return apiClient.post(`/services/${serviceId}/knowledge-documents`, form);
  },
  remove: (serviceId, docId) =>
    apiClient.delete(`/services/${serviceId}/knowledge-documents/${docId}`),
};
