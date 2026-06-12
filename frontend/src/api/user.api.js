import { apiClient } from '@/config/api';

export const userApi = {
  getStaffRoles: () => apiClient.get('/users/staff-roles'),
  listStaff: () => apiClient.get('/users/staff'),
  createStaff: (data) => apiClient.post('/users/staff', data),
  updateStaff: (id, data) => apiClient.patch(`/users/staff/${id}`, data),
  deactivateStaff: (id) => apiClient.delete(`/users/staff/${id}`),
};
