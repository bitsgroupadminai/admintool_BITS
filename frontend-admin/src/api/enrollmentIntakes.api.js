import { apiClient } from '@/config/api';
import { downloadAxiosBlob } from '@/utils/fileDownload';
import { toast } from 'sonner';

function intakeDocumentPath(basePath, intakeId, documentId, download = false) {
  const path = `${basePath}/${intakeId}/documents/${documentId}/file`;
  return download ? `${path}?download=1` : path;
}

async function fetchIntakeDocumentBlob(intakeId, documentId, basePath, download = false) {
  return apiClient.get(intakeDocumentPath(basePath, intakeId, documentId, download), {
    responseType: 'blob',
  });
}

async function downloadIntakeDocument(intakeId, document, basePath) {
  try {
    const response = await fetchIntakeDocumentBlob(intakeId, document.id, basePath, true);
    const blob = response.data;
    if (blob instanceof Blob && blob.type?.includes('application/json')) {
      const payload = JSON.parse(await blob.text());
      throw new Error(payload.message || 'Could not download document');
    }
    downloadAxiosBlob(response, document.originalName || 'document');
  } catch (err) {
    toast.error(err.message || 'Could not download document');
    throw err;
  }
}

export const enrollmentIntakesApi = {
  list: (params) => apiClient.get('/enrollment-intakes', { params }),
  get: (id) => apiClient.get(`/enrollment-intakes/${id}`),
  approve: (id, payload = {}) => apiClient.post(`/enrollment-intakes/${id}/approve`, payload),
  reject: (id, payload) => apiClient.post(`/enrollment-intakes/${id}/reject`, payload),
  remove: (id) => apiClient.delete(`/enrollment-intakes/${id}`),
  fetchDocumentBlob: (intakeId, documentId) =>
    fetchIntakeDocumentBlob(intakeId, documentId, '/enrollment-intakes'),
  downloadDocument: (intakeId, document) =>
    downloadIntakeDocument(intakeId, document, '/enrollment-intakes'),
};

export const staffEnrollmentIntakesApi = {
  list: (params) => apiClient.get('/staff/enrollment-intakes', { params }),
  get: (id) => apiClient.get(`/staff/enrollment-intakes/${id}`),
  fetchDocumentBlob: (intakeId, documentId) =>
    fetchIntakeDocumentBlob(intakeId, documentId, '/staff/enrollment-intakes'),
  downloadDocument: (intakeId, document) =>
    downloadIntakeDocument(intakeId, document, '/staff/enrollment-intakes'),
};
