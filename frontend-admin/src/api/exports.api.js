import { apiClient } from '@/config/api';

function buildParams(filters = {}) {
  const params = {};
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.serviceId) params.serviceId = filters.serviceId;
  if (filters.offeringId) params.offeringId = filters.offeringId;
  if (filters.status) params.status = filters.status;
  if (filters.format) params.format = filters.format;
  return params;
}

export const exportsApi = {
  /**
   * Download service-request records as CSV, XLSX, or JSON.
   * @param {{ from?: string, to?: string, serviceId?: string, offeringId?: string, status?: string, format?: 'csv' | 'xlsx' | 'json' }} filters
   */
  applications: (filters = {}) =>
    apiClient.get('/exports/applications', {
      params: buildParams(filters),
      responseType: 'blob',
    }),
};
