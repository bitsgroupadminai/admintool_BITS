import { Navigate, Route, Routes } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { ChangePasswordPage } from '@/pages/ChangePasswordPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { EnrollPage } from '@/pages/EnrollPage';
import { EnrollOfferingPage } from '@/pages/EnrollOfferingPage';
import { EnrollApplyRedirect } from '@/pages/EnrollApplyPage';
import { ServiceDetailPage } from '@/pages/ServiceDetailPage';
import { GuestRoute, ProtectedRoute } from '@/routes/ProtectedRoute';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route
        path="/login"
        element={
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        }
      />
      <Route path="/enroll" element={<EnrollPage />} />
      <Route path="/enroll/:offeringId" element={<EnrollOfferingPage />} />
      <Route path="/enroll/:offeringId/apply" element={<EnrollApplyRedirect />} />

      <Route
        path="/change-password"
        element={
          <ProtectedRoute>
            <ChangePasswordPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/services/:serviceId"
        element={
          <ProtectedRoute>
            <ServiceDetailPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
