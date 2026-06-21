import { apiClient } from '@/config/api';

export function getStudentDocumentFilePath(serviceId, offeringId, documentId, download = false) {
  const base = `/student/services/${serviceId}/offerings/${offeringId}/applications/documents/${documentId}/file`;
  return download ? `${base}?download=1` : base;
}

export function isPreviewableMimeType(mimeType) {
  return ['application/pdf', 'image/jpeg', 'image/png'].includes(mimeType);
}

export async function fetchStudentDocumentBlob(serviceId, offeringId, documentId) {
  const { data } = await apiClient.get(
    getStudentDocumentFilePath(serviceId, offeringId, documentId),
    { responseType: 'blob' },
  );
  return data;
}

export async function downloadStudentDocument(serviceId, offeringId, document, download = true) {
  const { data } = await apiClient.get(
    getStudentDocumentFilePath(serviceId, offeringId, document.id, download),
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
