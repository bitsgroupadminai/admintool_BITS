import { apiClient } from '@/config/api';

export const servicesApi = {
  list: () => apiClient.get('/services'),
  get: (id) => apiClient.get(`/services/${id}`),
  create: (data) => apiClient.post('/services', data),
  update: (id, data) => apiClient.patch(`/services/${id}`, data),
  remove: (id) => apiClient.delete(`/services/${id}`),
  getInsights: (id) => apiClient.get(`/services/${id}/knowledge-insights`),
  generateInsights: (id) => apiClient.post(`/services/${id}/knowledge-insights/generate`),
  addManualSuggestion: (id, data) =>
    apiClient.post(`/services/${id}/knowledge-insights/suggestions`, data),
  updateSuggestion: (id, suggestionId, data) =>
    apiClient.patch(`/services/${id}/knowledge-insights/suggestions/${suggestionId}`, data),
  dismissSuggestion: (id, suggestionId) =>
    apiClient.post(`/services/${id}/knowledge-insights/suggestions/${suggestionId}/dismiss`),
  createOfferingFromSuggestion: (id, suggestionId) =>
    apiClient.post(
      `/services/${id}/knowledge-insights/suggestions/${suggestionId}/create-offering`,
    ),
};
