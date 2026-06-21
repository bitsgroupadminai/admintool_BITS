import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from '@/pages/auth/LoginPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { SignupPage } from '@/pages/auth/SignupPage';
import { InstituteSetupPage } from '@/pages/setup/InstituteSetupPage';
import { StaffSetupPage } from '@/pages/setup/StaffSetupPage';
import { ReviewSetupPage } from '@/pages/setup/ReviewSetupPage';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { ServicesListPage } from '@/pages/admin/services/ServicesListPage';
import { ServiceDetailPage } from '@/pages/admin/services/ServiceDetailPage';
import { OfferingConfigurePage } from '@/pages/admin/offerings/OfferingConfigurePage';
import { StudentsListPage } from '@/pages/admin/StudentsListPage';
import { StaffListPage } from '@/pages/admin/StaffListPage';
import { InstituteSettingsPage } from '@/pages/admin/InstituteSettingsPage';
import { NotificationsCenterPage } from '@/pages/admin/NotificationsCenterPage';
import { ApplicationsListPage } from '@/pages/admin/ApplicationsListPage';
import { ApplicationDetailPage } from '@/pages/admin/ApplicationDetailPage';
import { EnrollmentIntakesListPage } from '@/pages/admin/EnrollmentIntakesListPage';
import { EnrollmentIntakeDetailPage } from '@/pages/admin/EnrollmentIntakeDetailPage';
import { StaffEnrollmentIntakesListPage } from '@/pages/staff/StaffEnrollmentIntakesListPage';
import { StaffEnrollmentIntakeDetailPage } from '@/pages/staff/StaffEnrollmentIntakeDetailPage';
import { StaffDashboardPage } from '@/pages/staff/StaffDashboardPage';
import { StaffApplicationsListPage } from '@/pages/staff/StaffApplicationsListPage';
import { StaffApplicationDetailPage } from '@/pages/staff/StaffApplicationDetailPage';
import { StaffQueueBoardPage } from '@/pages/staff/StaffQueueBoardPage';
import { StaffAppointmentsPage } from '@/pages/staff/StaffAppointmentsPage';
import { AdminQueueBoardPage } from '@/pages/admin/AdminQueueBoardPage';
import { AdminAppointmentsPage } from '@/pages/admin/AdminAppointmentsPage';
import { PaymentsPage } from '@/pages/admin/PaymentsPage';
import { AdminProfilePage } from '@/pages/profile/AdminProfilePage';
import { StaffProfilePage } from '@/pages/profile/StaffProfilePage';
import { StaffWorkloadPage } from '@/pages/staff/StaffWorkloadPage';
import { StaffNotificationsCenterPage } from '@/pages/staff/StaffNotificationsCenterPage';
import { StaffUnassignedPoolPage } from '@/pages/staff/StaffUnassignedPoolPage';
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
        path="/forgot-password"
        element={
          <GuestRoute>
            <ForgotPasswordPage />
          </GuestRoute>
        }
      />
      <Route
        path="/reset-password"
        element={
          <GuestRoute>
            <ResetPasswordPage />
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
        path="/admin/applications"
        element={
          <ProtectedRoute roles={['admin']}>
            <RequireSetupComplete>
              <ApplicationsListPage />
            </RequireSetupComplete>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/applications/:id"
        element={
          <ProtectedRoute roles={['admin']}>
            <RequireSetupComplete>
              <ApplicationDetailPage />
            </RequireSetupComplete>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/enrollment-intakes"
        element={
          <ProtectedRoute roles={['admin']}>
            <RequireSetupComplete>
              <EnrollmentIntakesListPage />
            </RequireSetupComplete>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/enrollment-intakes/:id"
        element={
          <ProtectedRoute roles={['admin']}>
            <RequireSetupComplete>
              <EnrollmentIntakeDetailPage />
            </RequireSetupComplete>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/payments"
        element={
          <ProtectedRoute roles={['admin']}>
            <RequireSetupComplete>
              <PaymentsPage />
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
        path="/admin/staff"
        element={
          <ProtectedRoute roles={['admin']}>
            <RequireSetupComplete>
              <StaffListPage />
            </RequireSetupComplete>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute roles={['admin']}>
            <RequireSetupComplete>
              <InstituteSettingsPage />
            </RequireSetupComplete>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/notifications"
        element={
          <ProtectedRoute roles={['admin']}>
            <RequireSetupComplete>
              <NotificationsCenterPage />
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
        path="/admin/queue"
        element={
          <ProtectedRoute roles={['admin']}>
            <RequireSetupComplete>
              <AdminQueueBoardPage />
            </RequireSetupComplete>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/appointments"
        element={
          <ProtectedRoute roles={['admin']}>
            <RequireSetupComplete>
              <AdminAppointmentsPage />
            </RequireSetupComplete>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/profile"
        element={
          <ProtectedRoute roles={['admin']}>
            <RequireSetupComplete>
              <AdminProfilePage />
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
      <Route
        path="/staff/applications"
        element={
          <ProtectedRoute roles={['staff']}>
            <StaffApplicationsListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/applications/:id"
        element={
          <ProtectedRoute roles={['staff']}>
            <StaffApplicationDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/enrollment-intakes"
        element={
          <ProtectedRoute roles={['staff']}>
            <StaffEnrollmentIntakesListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/enrollment-intakes/:id"
        element={
          <ProtectedRoute roles={['staff']}>
            <StaffEnrollmentIntakeDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/queue"
        element={
          <ProtectedRoute roles={['staff']}>
            <StaffQueueBoardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/appointments"
        element={
          <ProtectedRoute roles={['staff']}>
            <StaffAppointmentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/profile"
        element={
          <ProtectedRoute roles={['staff']}>
            <StaffProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/workload"
        element={
          <ProtectedRoute roles={['staff']}>
            <StaffWorkloadPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/notifications"
        element={
          <ProtectedRoute roles={['staff']}>
            <StaffNotificationsCenterPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/unassigned"
        element={
          <ProtectedRoute roles={['staff']}>
            <StaffUnassignedPoolPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
