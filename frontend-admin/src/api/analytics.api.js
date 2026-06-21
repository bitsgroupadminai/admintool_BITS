import { apiClient } from '@/config/api';

function buildParams(filters = {}) {
  const params = {};
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.serviceId) params.serviceId = filters.serviceId;
  if (filters.offeringId) params.offeringId = filters.offeringId;
  if (filters.status) params.status = filters.status;
  if (filters.staffId) params.staffId = filters.staffId;
  return params;
}

export const analyticsApi = {
  adminDashboard: (filters) => apiClient.get('/analytics/dashboard', { params: buildParams(filters) }),
  staffDashboard: (filters) => apiClient.get('/analytics/staff/dashboard', { params: buildParams(filters) }),
  exportAdminDashboard: (filters, format = 'csv') =>
    apiClient.get('/analytics/dashboard/export', {
      params: { ...buildParams(filters), format },
      responseType: 'blob',
    }),
  exportStaffDashboard: (filters, format = 'csv') =>
    apiClient.get('/analytics/staff/dashboard/export', {
      params: { ...buildParams(filters), format },
      responseType: 'blob',
    }),
};
