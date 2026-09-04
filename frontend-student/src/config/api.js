import axios from 'axios';
import { normalizeApiError } from '@/utils/apiError';
import { persistSessionToken, readSessionToken } from '@/utils/sessionToken';

const KNOWN_PRODUCTION_API = 'https://api.bits.bhupeshb7.me/api/v1';

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

function withApiV1(url) {
  if (/\/api\/v1$/i.test(url)) return url;
  return `${url}/api/v1`;
}

function isLocalHostname(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function shouldUseSameOriginProxy() {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return isLocalHostname(host) || host.endsWith('.vercel.app');
}

/**
 * Local Vite and Vercel both proxy `/api` to the Railway API.
 * Same-origin calls keep the session cookie first-party.
 */
export function getApiBaseUrl() {
  if (shouldUseSameOriginProxy()) return '/api/v1';

  const fromEnv = normalizeAbsoluteUrl(import.meta.env.VITE_API_BASE_URL);
  if (fromEnv) return withApiV1(fromEnv);
  return KNOWN_PRODUCTION_API;
}

/**
 * Absolute API URL. Used for multipart uploads from Vercel so the file
 * does not pass through the SPA rewrite (which can strip the boundary).
 */
export function getDirectApiBaseUrl() {
  const fromEnv = normalizeAbsoluteUrl(import.meta.env.VITE_API_BASE_URL);
  if (fromEnv) return withApiV1(fromEnv);
  return KNOWN_PRODUCTION_API;
}

/** Origin of the API host (no `/api/v1`), used for `/uploads` and sockets. */
export function getApiOrigin() {
  if (shouldUseSameOriginProxy() && typeof window !== 'undefined') {
    return window.location.origin;
  }
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

apiClient.interceptors.request.use((config) => {
  const token = readSessionToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Let the browser set multipart boundary. A bare multipart Content-Type
  // (or the default application/json) makes Multer fail with a 500.
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    if (typeof config.headers?.delete === 'function') {
      config.headers.delete('Content-Type');
    } else if (config.headers) {
      delete config.headers['Content-Type'];
      delete config.headers['content-type'];
    }
    if (typeof window !== 'undefined' && window.location.hostname.endsWith('.vercel.app')) {
      config.baseURL = getDirectApiBaseUrl();
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    persistSessionToken(response.data?.data?.sessionToken);
    return response;
  },
  async (error) => {
    const data = error.response?.data;
    if (typeof Blob !== 'undefined' && data instanceof Blob) {
      try {
        const parsed = JSON.parse(await data.text());
        error.response.data = parsed;
      } catch {
        // Keep the original blob when the body is not JSON.
      }
    }
    return Promise.reject(normalizeApiError(error));
  },
);
