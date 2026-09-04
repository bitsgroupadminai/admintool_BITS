import { apiClient } from '@/config/api';

export const authApi = {
  signup: (data) => apiClient.post('/auth/signup', data),
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
  deleteAccount: (data) => apiClient.delete('/auth/account', { data }),
};
