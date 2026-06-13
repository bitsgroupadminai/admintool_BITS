import { Navigate, useParams } from 'react-router-dom';

export function EnrollApplyRedirect() {
  const { offeringId } = useParams();
  return <Navigate to={`/enroll/${offeringId}`} replace />;
}
