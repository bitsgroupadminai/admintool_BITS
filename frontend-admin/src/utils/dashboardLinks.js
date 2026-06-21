/**
 * Build filtered list URLs for dashboard drill-down navigation.
 * @param {'admin' | 'staff'} scope
 * @param {Record<string, string | undefined>} baseFilters
 * @param {Record<string, string | undefined>} [extra]
 */
export function buildApplicationsLink(scope, baseFilters = {}, extra = {}) {
  const prefix = scope === 'admin' ? '/admin/applications' : '/staff/applications';
  const params = new URLSearchParams();

  const merged = { ...baseFilters, ...extra };
  Object.entries(merged).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });

  const query = params.toString();
  return query ? `${prefix}?${query}` : prefix;
}

export function buildEnrollmentIntakesLink(extra = {}) {
  const params = new URLSearchParams();
  Object.entries(extra).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const query = params.toString();
  return query ? `/admin/enrollment-intakes?${query}` : '/admin/enrollment-intakes';
}

export function buildQueueLink(scope = 'staff') {
  return scope === 'admin' ? '/admin/queue' : '/staff/queue';
}

export function buildAppointmentsLink(scope = 'staff') {
  return scope === 'admin' ? '/admin/appointments' : '/staff/appointments';
}

export function mergeDashboardFilters(filters, extra = {}) {
  return {
    from: filters.from,
    to: filters.to,
    serviceId: filters.serviceId,
    offeringId: filters.offeringId,
    status: filters.status,
    staffId: filters.staffId,
    ...extra,
  };
}
