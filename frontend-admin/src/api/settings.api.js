import { apiClient } from '@/config/api';

export const settingsApi = {
  getAutoAssignment: (instituteId) =>
    apiClient.get(`/institutes/${instituteId}/auto-assignment`),
  updateAutoAssignment: (instituteId, data) =>
    apiClient.patch(`/institutes/${instituteId}/auto-assignment`, data),
  getOperationsCalendar: (instituteId) =>
    apiClient.get(`/institutes/${instituteId}/operations-calendar`),
  updateOperationsCalendar: (instituteId, data) =>
    apiClient.patch(`/institutes/${instituteId}/operations-calendar`, data),
  getOfferingConfigVersions: (offeringId) =>
    apiClient.get(`/offerings/${offeringId}/configuration-versions`),
  getKnowledgeCoverage: (serviceId) =>
    apiClient.get(`/services/${serviceId}/knowledge-coverage`),
  getKnowledgeDocumentVersions: (serviceId, documentId) =>
    apiClient.get(`/services/${serviceId}/knowledge-documents/${documentId}/versions`),
};
