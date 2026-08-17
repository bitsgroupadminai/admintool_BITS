import { env } from '../../core/config/env.js';

export const PRODUCTION_STUDENT_PORTAL = 'https://campusflow-student-smoky.vercel.app';
export const PRODUCTION_ADMIN_PORTAL = 'https://campusflow-admin-flame.vercel.app';

const LEGACY_STUDENT_HOSTS = new Set([
  'eduportal-student.vercel.app',
  'eduportal-student-smoky.vercel.app',
]);

const LEGACY_ADMIN_HOSTS = new Set([
  'eduportal-admin.vercel.app',
  'eduportal-admin-flame.vercel.app',
]);

function stripTrailingSlash(url) {
  return String(url ?? '').trim().replace(/\/$/, '');
}

function hostnameOf(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

/**
 * @param {string | undefined} configured
 * @param {'student' | 'admin'} kind
 */
export function resolvePortalUrl(configured, kind) {
  const trimmed = stripTrailingSlash(configured);
  const fallback = kind === 'admin' ? PRODUCTION_ADMIN_PORTAL : PRODUCTION_STUDENT_PORTAL;
  const legacy = kind === 'admin' ? LEGACY_ADMIN_HOSTS : LEGACY_STUDENT_HOSTS;
  if (!trimmed || legacy.has(hostnameOf(trimmed))) {
    return fallback;
  }
  return trimmed;
}

export function getStudentPortalUrl() {
  return resolvePortalUrl(env.STUDENT_CLIENT_URL, 'student');
}

export function getAdminPortalUrl() {
  return resolvePortalUrl(env.ADMIN_CLIENT_URL, 'admin');
}
