import axios from 'axios';
import { normalizeApiError } from '@/utils/apiError';

/**
 * Normalize Vercel/Railway env values.
 * Missing `https://` makes the browser treat the host as a path on the Vercel domain.
 */
function normalizeAbsoluteUrl(value) {
  const raw = value?.trim();
  if (!raw) return '';
  let url = raw.replace(/\/$/, '');
  if (url.startsWith('//')) url = `https:${url}`;
  if (!/^https?:\/\//i.test(url) && /^[a-z0-9.-]+\.[a-z]{2,}/i.test(url)) {
    url = `https://${url}`;
  }
  return url.replace(/\/$/, '');
}

/**
 * In local Vite, `/api/v1` is proxied to the backend.
 * On Vercel, set `VITE_API_BASE_URL` to https://xxx.up.railway.app/api/v1
 */
export function getApiBaseUrl() {
  const fromEnv = normalizeAbsoluteUrl(import.meta.env.VITE_API_BASE_URL);
  if (!fromEnv) return '/api/v1';
  if (/\/api\/v1$/i.test(fromEnv)) return fromEnv;
  return `${fromEnv}/api/v1`;
}

/** Origin of the API host (no `/api/v1`), used for `/uploads` and sockets. */
export function getApiOrigin() {
  const socket = normalizeAbsoluteUrl(import.meta.env.VITE_SOCKET_URL);
  if (socket) return socket.replace(/\/api\/v1$/i, '');
  const base = getApiBaseUrl();
  if (base.startsWith('http')) return base.replace(/\/api\/v1$/i, '');
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
