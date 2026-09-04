import { apiClient } from '@/config/api';

export const userApi = {
  getStaffRoles: () => apiClient.get('/users/staff-roles'),
  listStaff: () => apiClient.get('/users/staff'),
  createStaff: (data) => apiClient.post('/users/staff', data),
  updateStaff: (id, data) => apiClient.patch(`/users/staff/${id}`, data),
  deactivateStaff: (id) => apiClient.delete(`/users/staff/${id}`),
  listStudents: (params) => apiClient.get('/users/students', { params }),
  listProgrammes: () => apiClient.get('/users/programmes'),
  createStudent: (data) => apiClient.post('/users/students', data),
  updateStudent: (id, data) => apiClient.patch(`/users/students/${id}`, data),
  deactivateStudent: (id) => apiClient.delete(`/users/students/${id}`),
  importStudents: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/users/students/import', formData);
  },
};
