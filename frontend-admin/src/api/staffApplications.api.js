import { apiClient } from '@/config/api';

export const staffApplicationsApi = {
  summary: () => apiClient.get('/staff/applications/summary'),
  list: (params) => apiClient.get('/staff/applications', { params }),
  get: (id) => apiClient.get(`/staff/applications/${id}`),
  updateStatus: (id, status) => apiClient.patch(`/staff/applications/${id}/status`, { status }),
  workflowAction: (id, payload) =>
    apiClient.patch(`/staff/applications/${id}/workflow-action`, payload),
  slaAction: (id, action) => apiClient.patch(`/staff/applications/${id}/sla-action`, { action }),
  getDocumentFilePath: (applicationId, documentId, download = false) => {
    const base = `/staff/applications/${applicationId}/documents/${documentId}/file`;
    return download ? `${base}?download=1` : base;
  },
  fetchDocumentBlob: (applicationId, documentId) =>
    apiClient.get(staffApplicationsApi.getDocumentFilePath(applicationId, documentId), {
      responseType: 'blob',
    }),
};

export async function downloadStaffApplicationDocument(applicationId, document) {
  const { data } = await apiClient.get(
    staffApplicationsApi.getDocumentFilePath(applicationId, document.id, true),
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
