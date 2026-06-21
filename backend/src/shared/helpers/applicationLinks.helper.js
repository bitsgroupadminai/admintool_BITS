export function buildStudentServiceLink(serviceId) {
  if (!serviceId) return '/services';
  return `/services/${serviceId.toString()}`;
}
