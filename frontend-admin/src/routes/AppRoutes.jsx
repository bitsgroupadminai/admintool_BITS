import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from '@/pages/auth/LoginPage';
import { SignupPage } from '@/pages/auth/SignupPage';
import { InstituteSetupPage } from '@/pages/setup/InstituteSetupPage';
import { StaffSetupPage } from '@/pages/setup/StaffSetupPage';
import { ReviewSetupPage } from '@/pages/setup/ReviewSetupPage';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { ServicesListPage } from '@/pages/admin/services/ServicesListPage';
import { ServiceDetailPage } from '@/pages/admin/services/ServiceDetailPage';
import { OfferingConfigurePage } from '@/pages/admin/offerings/OfferingConfigurePage';
import { StudentsListPage } from '@/pages/admin/StudentsListPage';
import { StaffDashboardPage } from '@/pages/staff/StaffDashboardPage';
import {
  AdminSetupRoute,
  ProtectedRoute,
  RequireSetupComplete,
} from '@/routes/ProtectedRoute';
import { GuestRoute } from '@/routes/GuestRoute';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route
        path="/login"
        element={
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <GuestRoute>
            <SignupPage />
          </GuestRoute>
        }
      />

      <Route
        path="/setup/institute"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminSetupRoute>
              <InstituteSetupPage />
            </AdminSetupRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/setup/staff"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminSetupRoute>
              <StaffSetupPage />
            </AdminSetupRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/setup/review"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminSetupRoute>
              <ReviewSetupPage />
            </AdminSetupRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute roles={['admin']}>
            <RequireSetupComplete>
              <AdminDashboardPage />
            </RequireSetupComplete>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/services"
        element={
          <ProtectedRoute roles={['admin']}>
            <RequireSetupComplete>
              <ServicesListPage />
            </RequireSetupComplete>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/services/:id"
        element={
          <ProtectedRoute roles={['admin']}>
            <RequireSetupComplete>
              <ServiceDetailPage />
            </RequireSetupComplete>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/students"
        element={
          <ProtectedRoute roles={['admin']}>
            <RequireSetupComplete>
              <StudentsListPage />
            </RequireSetupComplete>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/offerings/:id/configure"
        element={
          <ProtectedRoute roles={['admin']}>
            <RequireSetupComplete>
              <OfferingConfigurePage />
            </RequireSetupComplete>
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/dashboard"
        element={
          <ProtectedRoute roles={['staff']}>
            <StaffDashboardPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
