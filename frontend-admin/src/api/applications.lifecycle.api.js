import { apiClient } from '@/config/api';

export const applicationLifecycleApi = {
  getAuditLog: (id, role = 'admin') =>
    apiClient.get(`/${role === 'staff' ? 'staff/applications' : 'applications'}/${id}/audit-log`),
  cancel: (id, data, role = 'admin') =>
    apiClient.patch(`/${role === 'staff' ? 'staff/applications' : 'applications'}/${id}/cancel`, data),
  reopen: (id, data) => apiClient.patch(`/applications/${id}/reopen`, data),
  transfer: (id, data) => apiClient.patch(`/applications/${id}/transfer`, data),
  escalate: (id, data, role = 'admin') =>
    apiClient.patch(`/${role === 'staff' ? 'staff/applications' : 'applications'}/${id}/escalate`, data),
  claim: (id) => apiClient.patch(`/staff/applications/${id}/claim`),
  listUnassigned: (params) => apiClient.get('/staff/applications/unassigned', { params }),
};
