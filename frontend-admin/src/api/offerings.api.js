import { apiClient } from '@/config/api';

function omitNullValues(value) {
  if (value === null) return undefined;
  if (Array.isArray(value)) return value.map(omitNullValues);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .map(([k, v]) => [k, omitNullValues(v)])
        .filter(([, v]) => v !== undefined),
    );
  }
  return value;
}

export const offeringsApi = {
  list: (serviceId) =>
    apiClient.get('/offerings', { params: serviceId ? { serviceId } : {} }),
  get: (id) => apiClient.get(`/offerings/${id}`),
  create: (data) => apiClient.post('/offerings', data),
  update: (id, data) => apiClient.patch(`/offerings/${id}`, data),
  updateDetails: (id, data) => apiClient.put(`/offerings/${id}/details`, data),
  updatePayment: (id, paymentConfig) =>
    apiClient.put(`/offerings/${id}/payment`, { paymentConfig }),
  remove: (id) => apiClient.delete(`/offerings/${id}`),
  duplicate: (id) => apiClient.post(`/offerings/${id}/duplicate`),
  activate: (id) => apiClient.post(`/offerings/${id}/activate`),
  updateEligibility: (id, rules) =>
    apiClient.put(`/offerings/${id}/eligibility`, { rules }),
  updateDocuments: (id, requirements) =>
    apiClient.put(`/offerings/${id}/documents`, { requirements }),
  updateWorkflow: (id, steps) =>
    apiClient.put(`/offerings/${id}/workflow`, { steps: omitNullValues(steps) }),
  updateQueue: (id, data) => apiClient.put(`/offerings/${id}/queue`, data),
  generateAi: (id, { section } = {}) =>
    apiClient.post(`/offerings/${id}/ai-suggestions/generate`, section ? { section } : {}),
  getAi: (id) => apiClient.get(`/offerings/${id}/ai-suggestions`),
  applyAi: (id, data) => apiClient.post(`/offerings/${id}/ai-suggestions/apply`, data),
  rejectAi: (id) => apiClient.post(`/offerings/${id}/ai-suggestions/reject`),
  bulk: (data) => apiClient.post('/offerings/bulk', data),
};
