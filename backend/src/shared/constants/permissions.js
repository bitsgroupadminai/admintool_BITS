import { ROLES } from './roles.js';

export const PERMISSIONS = {
  MANAGE_SERVICES: 'manage_services',
  MANAGE_WORKFLOWS: 'manage_workflows',
  MANAGE_USERS: 'manage_users',
  VIEW_ANALYTICS: 'view_analytics',
  VIEW_ALL_REQUESTS: 'view_all_requests',
  ACT_ON_ASSIGNED_REQUESTS: 'act_on_assigned_requests',
};

export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: Object.values(PERMISSIONS),
  [ROLES.STAFF]: [PERMISSIONS.ACT_ON_ASSIGNED_REQUESTS],
};
