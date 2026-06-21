import { apiClient } from '@/config/api';

export const authApi = {
  login: (data) => apiClient.post('/auth/login', data),
  logout: () => apiClient.post('/auth/logout'),
  me: () => apiClient.get('/auth/me'),
  updateProfile: (data) => apiClient.patch('/auth/profile', data),
  forgotPassword: (data) => apiClient.post('/auth/forgot-password', data),
  resetPassword: (data) => apiClient.post('/auth/reset-password', data),
  uploadAvatar: (file, onProgress) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return apiClient.post('/auth/profile/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        if (onProgress && event.total) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      },
    });
  },
  removeAvatar: () => apiClient.delete('/auth/profile/avatar'),
};

export const studentApi = {
  listInstitutes: (params) => apiClient.get('/student/institutes', { params }),
  getInstitute: (instituteId) => apiClient.get(`/student/${instituteId}/institute`),
  listEnrollmentOfferings: (instituteId) =>
    apiClient.get(`/student/${instituteId}/enrollment/offerings`),
  getEnrollmentOffering: (instituteId, offeringId) =>
    apiClient.get(`/student/${instituteId}/enrollment/offerings/${offeringId}`),
  createApplication: (instituteId, data, intakeDocumentFile) => {
    const formData = new FormData();
    formData.append('offeringId', data.offeringId);
    formData.append('applicantName', data.applicantName);
    formData.append('applicantEmail', data.applicantEmail);
    formData.append('applicantMobile', data.applicantMobile);
    if (data.applicantDetails && Object.keys(data.applicantDetails).length > 0) {
      formData.append('applicantDetails', JSON.stringify(data.applicantDetails));
    }
    if (intakeDocumentFile) {
      formData.append('intakeDocument', intakeDocumentFile);
    }
    return apiClient.post(`/student/${instituteId}/enrollment/applications`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getEnrollmentIntakeStatus: (instituteId, offeringId, email) =>
    apiClient.get(`/student/${instituteId}/enrollment/intake-status`, {
      params: { offeringId, email },
    }),
  listServices: () => apiClient.get('/student/services'),
  listApplications: () => apiClient.get('/student/applications'),
  getService: (id) => apiClient.get(`/student/services/${id}`),
  startServiceApplication: (serviceId, offeringId, data = {}) =>
    apiClient.post(`/student/services/${serviceId}/offerings/${offeringId}/applications/start`, data),
  updateServiceApplicationDetails: (serviceId, offeringId, data) =>
    apiClient.put(`/student/services/${serviceId}/offerings/${offeringId}/applications/details`, data),
  submitServiceApplication: (serviceId, offeringId) =>
    apiClient.post(`/student/services/${serviceId}/offerings/${offeringId}/applications/submit`),
  resubmitServiceApplication: (serviceId, offeringId) =>
    apiClient.post(`/student/services/${serviceId}/offerings/${offeringId}/applications/resubmit`),
  uploadApplicationDocument: (serviceId, offeringId, requirementId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post(
      `/student/services/${serviceId}/offerings/${offeringId}/applications/documents/${requirementId}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
  },
  removeApplicationDocument: (serviceId, offeringId, requirementId) =>
    apiClient.delete(
      `/student/services/${serviceId}/offerings/${offeringId}/applications/documents/${requirementId}`,
    ),
  changePassword: (data) => apiClient.post('/student/change-password', data),
  skipPasswordChange: () => apiClient.post('/student/skip-password-change'),
  previewEligibility: (offeringId) =>
    apiClient.get(`/student/offerings/${offeringId}/eligibility-preview`),
  withdrawApplication: (applicationId, data) =>
    apiClient.patch(`/student/applications/${applicationId}/withdraw`, data),
};
