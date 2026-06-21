import { Navigate, Route, Routes } from 'react-router-dom';
import { InstituteSelectPage } from '@/pages/InstituteSelectPage';
import { InstituteHomePage } from '@/pages/InstituteHomePage';
import { LoginPage } from '@/pages/LoginPage';
import { ChangePasswordPage } from '@/pages/ChangePasswordPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ServicesPage } from '@/pages/ServicesPage';
import { GuidancePage } from '@/pages/GuidancePage';
import { EnrollPage } from '@/pages/EnrollPage';
import { EnrollOfferingPage } from '@/pages/EnrollOfferingPage';
import { EnrollApplyRedirect } from '@/pages/EnrollApplyPage';
import { ServiceDetailPage } from '@/pages/ServiceDetailPage';
import { RequestHistoryPage } from '@/pages/RequestHistoryPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { GuestRoute, ProtectedRoute } from '@/routes/ProtectedRoute';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<InstituteSelectPage />} />
      <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
      <Route path="/reset-password" element={<GuestRoute><ResetPasswordPage /></GuestRoute>} />
      <Route path="/enroll" element={<Navigate to="/" replace />} />
      <Route path="/enroll/:offeringId" element={<LegacyEnrollRedirect />} />
      <Route path="/enroll/:offeringId/apply" element={<LegacyEnrollRedirect />} />

      <Route path="/:instituteId" element={<InstituteHomePage />} />
      <Route path="/:instituteId/enroll" element={<EnrollPage />} />
      <Route path="/:instituteId/enroll/:offeringId" element={<EnrollOfferingPage />} />
      <Route path="/:instituteId/enroll/:offeringId/apply" element={<EnrollApplyRedirect />} />

      <Route path="/change-password" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/requests/history" element={<ProtectedRoute><RequestHistoryPage /></ProtectedRoute>} />
      <Route path="/services" element={<ProtectedRoute><ServicesPage /></ProtectedRoute>} />
      <Route path="/guidance" element={<ProtectedRoute><GuidancePage /></ProtectedRoute>} />
      <Route path="/services/:serviceId" element={<ProtectedRoute><ServiceDetailPage /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function LegacyEnrollRedirect() {
  return <Navigate to="/" replace />;
}
