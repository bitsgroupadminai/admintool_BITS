import { env } from '../../core/config/env.js';

/** Read-cache namespaces (12h TTL; flushed on DB create/update/delete). */
export const cacheNs = {
  INSTITUTE: 'read:institute',
  INSTITUTE_SETUP: 'read:institute:setup',
  SERVICES_LIST: 'read:services:list',
  SERVICE_DETAIL: 'read:service:detail',
  SERVICE_INSIGHTS: 'read:service:insights',
  OFFERINGS_LIST: 'read:offerings:list',
  OFFERING_DETAIL: 'read:offering:detail',
  OFFERING_SUGGESTIONS: 'read:offering:suggestions',
  KNOWLEDGE_DOCS: 'read:knowledge:docs',
  APPLICATIONS_LIST: 'read:applications:list',
  APPLICATIONS_ASSIGNED: 'read:applications:assigned',
  APPLICATION_DETAIL: 'read:application:detail',
  APPLICATION_ASSIGNED_DETAIL: 'read:application:assigned-detail',
  STAFF_ASSIGNMENT_SUMMARY: 'read:staff:assignment-summary',
  ANALYTICS_ADMIN: 'read:analytics:admin',
  ANALYTICS_STAFF: 'read:analytics:staff',
  ENROLLMENT_INTAKES_LIST: 'read:enrollment-intakes:list',
  ENROLLMENT_INTAKE_DETAIL: 'read:enrollment-intake:detail',
  APPOINTMENT_SLOTS: 'read:appointments:slots',
  APPOINTMENT_STUDENT: 'read:appointments:student',
  APPOINTMENT_OFFERING_LIST: 'read:appointments:offering-list',
  APPOINTMENT_OFFERINGS: 'read:appointments:offerings',
  QUEUE_STATUS: 'read:queue:status',
  QUEUE_BOARD: 'read:queue:board',
  QUEUE_OFFERINGS: 'read:queue:offerings',
  USERS_STAFF_LIST: 'read:users:staff',
  USERS_STUDENTS_LIST: 'read:users:students',
  USERS_PROGRAMMES: 'read:users:programmes',
  USERS_STAFF_ROLES: 'read:users:staff-roles',
  STUDENT_INSTITUTES: 'read:student:institutes:v3',
  STUDENT_INSTITUTE_PROFILE: 'read:student:institute-profile',
  // v3: intake dates use Asia/Kolkata calendar days
  STUDENT_OFFERINGS: 'read:student:offerings:v3',
  STUDENT_OFFERING_DETAIL: 'read:student:offering-detail:v3',
  STUDENT_INTAKE_STATUS: 'read:student:intake-status',
  STUDENT_APPLICATIONS: 'read:student:applications',
  STUDENT_SERVICES: 'read:student:services',
  STUDENT_SERVICE_DETAIL: 'read:student:service-detail',
};

export function getDefaultCacheTtl() {
  return env.CACHE_DEFAULT_TTL_HOURS * 60 * 60;
}
