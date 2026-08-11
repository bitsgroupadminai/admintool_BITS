import axios from 'axios';
import { normalizeApiError } from '@/utils/apiError';

/**
 * In local Vite, `/api/v1` is proxied to the backend.
 * On Vercel, set `VITE_API_BASE_URL` to the Railway API (e.g. https://xxx.up.railway.app/api/v1).
 */
export function getApiBaseUrl() {
  const fromEnv = import.meta.env.VITE_API_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  return '/api/v1';
}

/** Origin of the API host (no `/api/v1`), used for `/uploads` and sockets. */
export function getApiOrigin() {
  if (import.meta.env.VITE_SOCKET_URL?.trim()) {
    return import.meta.env.VITE_SOCKET_URL.trim().replace(/\/$/, '');
  }
  const base = getApiBaseUrl();
  if (base.startsWith('http')) {
    return base.replace(/\/api\/v1\/?$/, '');
  }
  return '';
}

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(normalizeApiError(error)),
);
