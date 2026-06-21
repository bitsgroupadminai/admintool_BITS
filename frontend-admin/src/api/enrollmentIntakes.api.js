import { apiClient } from '@/config/api';

async function downloadIntakeDocument(intakeId, document, basePath) {
  const { data } = await apiClient.get(
    `${basePath}/${intakeId}/documents/${document.id}/file?download=1`,
    { responseType: 'blob' },
  );
  const url = URL.createObjectURL(data);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = document.originalName || 'document';
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const enrollmentIntakesApi = {
  list: (params) => apiClient.get('/enrollment-intakes', { params }),
  get: (id) => apiClient.get(`/enrollment-intakes/${id}`),
  approve: (id, payload = {}) => apiClient.post(`/enrollment-intakes/${id}/approve`, payload),
  reject: (id, payload) => apiClient.post(`/enrollment-intakes/${id}/reject`, payload),
  downloadDocument: (intakeId, document) =>
    downloadIntakeDocument(intakeId, document, '/enrollment-intakes'),
};

export const staffEnrollmentIntakesApi = {
  list: (params) => apiClient.get('/staff/enrollment-intakes', { params }),
  get: (id) => apiClient.get(`/staff/enrollment-intakes/${id}`),
  downloadDocument: (intakeId, document) =>
    downloadIntakeDocument(intakeId, document, '/staff/enrollment-intakes'),
};
