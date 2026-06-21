import { Navigate, useParams } from 'react-router-dom';

export function EnrollApplyRedirect() {
  const { instituteId, offeringId } = useParams();
  return <Navigate to={`/${instituteId}/enroll/${offeringId}`} replace />;
}
