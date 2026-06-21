import { apiClient } from '@/config/api';

export const applicationsApi = {
  list: (params) => apiClient.get('/applications', { params }),
  get: (id) => apiClient.get(`/applications/${id}`),
  updateStatus: (id, status) => apiClient.patch(`/applications/${id}/status`, { status }),
  workflowAction: (id, payload) => apiClient.patch(`/applications/${id}/workflow-action`, payload),
  assignStaff: (id, staffUserId) => apiClient.patch(`/applications/${id}/assign`, { staffUserId }),
  slaAction: (id, action) => apiClient.patch(`/applications/${id}/sla-action`, { action }),
  getDocumentFilePath: (applicationId, documentId, download = false) => {
    const base = `/applications/${applicationId}/documents/${documentId}/file`;
    return download ? `${base}?download=1` : base;
  },
  fetchDocumentBlob: (applicationId, documentId) =>
    apiClient.get(applicationsApi.getDocumentFilePath(applicationId, documentId), {
      responseType: 'blob',
    }),
};

export function isPreviewableMimeType(mimeType) {
  return ['application/pdf', 'image/jpeg', 'image/png'].includes(mimeType);
}

export async function downloadApplicationDocument(applicationId, document) {
  const { data } = await apiClient.get(
    applicationsApi.getDocumentFilePath(applicationId, document.id, true),
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
