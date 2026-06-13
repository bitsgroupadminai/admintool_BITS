import { apiClient } from '@/config/api';

export const authApi = {
  login: (data) => apiClient.post('/auth/login', data),
  logout: () => apiClient.post('/auth/logout'),
  me: () => apiClient.get('/auth/me'),
};

export const studentApi = {
  getInstitute: () => apiClient.get('/student/institute'),
  listEnrollmentOfferings: () => apiClient.get('/student/enrollment/offerings'),
  getEnrollmentOffering: (id) => apiClient.get(`/student/enrollment/offerings/${id}`),
  createApplication: (data) => apiClient.post('/student/enrollment/applications', data),
  listServices: () => apiClient.get('/student/services'),
  getService: (id) => apiClient.get(`/student/services/${id}`),
  changePassword: (data) => apiClient.post('/student/change-password', data),
  skipPasswordChange: () => apiClient.post('/student/skip-password-change'),
};
