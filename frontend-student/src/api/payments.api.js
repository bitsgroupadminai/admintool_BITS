import { apiClient } from '@/config/api';

export const paymentsApi = {
  createOrder: (serviceId, offeringId) =>
    apiClient.post(`/student/services/${serviceId}/offerings/${offeringId}/payments/create-order`),
  verify: (serviceId, offeringId, data) =>
    apiClient.post(`/student/services/${serviceId}/offerings/${offeringId}/payments/verify`, data),
};
