# Project Feature Gap Analysis

Generated on: 2026-06-17

This document is based on the current code in `backend`, `frontend-admin`, and `frontend-student`. It is meant as an implementation planning document: what is already present, what appears partial, and what still needs to be built for the student portal, admin dashboard, and staff section.

## Product Summary

The project is a workflow-first educational administration platform with:

- Admin and staff portal: institute setup, service configuration, offering configuration, applications, students, analytics, and staff review.
- Student portal: enrollment discovery, student login, service browsing, document upload, request tracking, queue or appointment planning, and service chat.
- Backend: Express modular API with MongoDB models, Redis/session support, queue and email workers, OpenAI-assisted extraction/chat fallback, and role-based route protection.

## Current Major Modules

### Backend

Implemented modules found in code:

- Authentication and session handling.
- Institute setup and setup completion.
- Staff user CRUD and custom staff roles.
- Student user CRUD, CSV/XLSX import, programme assignment, and password change flow.
- Service management.
- Knowledge document upload and extraction.
- Offering configuration: eligibility, documents, workflow, queue, appointment, activation, duplication, and bulk actions.
- Application/request lifecycle.
- Admin/staff application review and workflow actions.
- Queue tickets.
- Appointment booking.
- Notifications.
- Analytics.
- Student service chat.

### Frontend Admin

Implemented routes found in `frontend-admin/src/routes/AppRoutes.jsx`:

- `/login`, `/signup`
- `/setup/institute`, `/setup/staff`, `/setup/review`
- `/admin/dashboard`
- `/admin/services`
- `/admin/services/:id`
- `/admin/offerings/:id/configure`
- `/admin/applications`
- `/admin/applications/:id`
- `/admin/students`
- `/staff/dashboard`
- `/staff/applications`
- `/staff/applications/:id`

### Frontend Student

Implemented routes found in `frontend-student/src/routes/AppRoutes.jsx`:

- `/`
- `/login`
- `/change-password`
- `/dashboard`
- `/enroll`
- `/enroll/:offeringId`
- `/enroll/:offeringId/apply`
- `/services`
- `/services/:serviceId`
- `/guidance`

## Implemented Feature Inventory

### Authentication And Access

Status: mostly implemented

- Admin signup creates institute and first admin.
- Admin/staff login uses backend session cookies.
- Protected routes separate admin, staff, and student access.
- Student login and first-password-change flow exist.
- Staff cannot self-signup.
- Student accounts are created by admin.

Remaining:

- MFA, SSO, password reset, device/session management, and account lockout UI are not visible.
- Audit trail for login/security events is not visible.
- User invitation email flow is not fully productized; staff/student passwords are admin-issued.

### Admin Setup

Status: implemented

- Institute setup page.
- Staff setup page.
- Review setup page.
- Staff can be added, edited, and deactivated.
- Custom staff roles are supported.
- Setup completion gates admin access.

Remaining:

- No guided service setup during onboarding.
- No import staff from CSV/XLSX.
- No post-setup dedicated staff management page outside the setup flow, unless staff management remains intentionally inside setup/user APIs.

### Service And Knowledge Management

Status: mostly implemented

- Admin can create services.
- Service detail page handles knowledge documents and extraction.
- AI/heuristic extraction support exists.
- Service activation exists.
- Offerings can be created manually or from extracted suggestions.

Remaining:

- Service edit/delete/archive UX should be reviewed and completed if missing.
- Knowledge document diff/version history is not fully visible as a product workflow.
- Knowledge refresh impact analysis is not fully exposed to admin.
- No student-facing public knowledge base management screen.
- AI suggestions are section-based, but full governance UX such as accept/edit/reject per individual suggestion may need strengthening.

### Offering Configuration

Status: mostly implemented

- Eligibility rules.
- Document requirements.
- Workflow steps.
- Workflow handlers, including staff and AI handlers.
- Workflow outcomes.
- Queue/appointment configuration.
- Review and activate flow.
- Completeness calculation.
- Duplicate offering.
- Bulk offering actions API.

Remaining:

- Eligibility rules are displayed and saved, but automatic eligibility evaluation against actual student data appears incomplete.
- Complex eligibility logic is not implemented: OR conditions, nested rules, formulas, document-derived validations.
- Workflow versioning exists via snapshots/configuration version, but admin-facing version history and rollback are not visible.
- Existing request behavior after configuration changes should be tested and documented in UI.
- Offering deletion currently deletes directly in backend; product requirement says deletion should be blocked if historical requests exist. This should be verified and likely fixed.
- Bulk offering actions API exists, but admin UI exposure should be confirmed or added if missing.
- Expiry automation is represented in status/completeness logic, but a scheduled expiration job is not obvious.

### Applications And Workflow Execution

Status: partially to mostly implemented

- Students can start, upload documents, submit, and resubmit after correction.
- Admin can list applications.
- Admin can view application details and documents.
- Admin can assign requests to staff.
- Staff can list assigned requests.
- Staff can view request details and take workflow actions.
- Workflow snapshots are taken at submission.
- AI workflow steps can auto-advance.
- Students receive status notifications/email hooks.

Remaining:

- Auto-assignment is referenced in helpers but not clearly surfaced as a complete admin configuration workflow.
- Step-level assignment to a specific user vs only role-based handling needs product completion.
- Correction flow supports notes and required documents, but UI for selecting specific correction-required documents should be verified.
- Reopen, cancel, withdraw, transfer, and escalation flows are not visible.
- SLA breach handling exists in runtime/analytics fields, but staff/admin operational actions for breached work are not fully visible.
- No full audit log UI for workflow actions.

### Queue And Appointment

Status: partially implemented

- Student can join queue.
- Student can see queue status.
- Student can view appointment slots and book appointments.
- Staff/admin APIs exist for queue board, call next, complete ticket, and appointment list.
- Admin dashboard counts waiting queue and upcoming appointments.

Remaining:

- Staff UI for queue board, call next, and complete ticket is not visible in current staff routes.
- Staff UI for appointment schedule is not visible in current staff routes.
- Admin operations screen for live queue/appointment monitoring is not visible.
- Queue capacity, operating calendar exceptions, holidays, and counter assignment are not visible.
- Appointment cancel/reschedule/no-show flows are not visible.
- Real-time queue updates use websocket backend support, but frontend live subscription should be verified.

### Notifications And Email

Status: partially implemented

- Notification model/service/router exists.
- Admin and student notification hooks/components exist.
- Application assigned/status/submit emails are hooked.
- Queue and appointment notifications are created.

Remaining:

- Email sending is environment-dependent and can be disabled.
- Notification preferences are not visible.
- Read/unread UI exists via hooks, but full notification center behavior should be tested.
- Retry/failure visibility for failed emails is not visible.

### Analytics And Dashboard

Status: partial V1 implemented

- Admin dashboard shows total requests, in review, SLA breaches, waiting queue, active services, active offerings, staff count, upcoming appointments, status chart, and recent requests.
- Staff dashboard shows assigned count, correction count, under review, SLA breaches, approved, and rejected.

Remaining:

- No deep funnel analytics by service/offering/workflow step.
- No bottleneck analysis.
- No turnaround time charts.
- No correction rate charts.
- No SLA trend over time.
- No export/reporting feature.
- No date range filters.
- No staff workload analytics.
- No queue wait-time analytics.
- No dashboard drill-down links from each chart/status segment.

### Student Portal

Status: partially implemented

- Home page.
- Student login.
- Password change/skip flow.
- Dashboard landing page.
- Enrollment offering list/detail.
- Service list/detail.
- Eligibility/document/workflow display.
- Application draft/start/submit/resubmit.
- Document upload/remove/preview.
- Queue/appointment panel.
- Service chat with OpenAI or heuristic fallback.
- Guidance page.

Remaining:

- Student dashboard is mostly a landing/navigation view; it does not show a complete request summary, active applications, deadlines, appointments, queue tickets, or notifications timeline.
- Enrollment flow creates draft enrollment applications, but full enrollment submission/document upload journey should be verified.
- Eligibility is displayed but not evaluated against student profile/application data.
- Student profile management is not visible.
- Student request history across all services is not clearly visible as a dedicated page.
- Student cannot cancel/withdraw a request.
- Student cannot cancel/reschedule appointments.
- Student cannot update personal details.
- Student chat is service-context based, but not yet a fully grounded institutional knowledge chatbot with citations or confidence/source display.

### Staff Section

Status: partially implemented

- Staff dashboard exists.
- Assigned requests list exists.
- Assigned request detail exists.
- Staff can perform workflow actions on assigned requests.
- Staff can preview/download documents.
- Staff analytics summary exists.

Remaining:

- No staff queue board UI.
- No staff appointment schedule UI.
- No staff workload/calendar view.
- No staff profile/settings page.
- No ability for staff to reassign/escalate back to admin.
- No staff-specific notification center screen is obvious.
- Staff can only see assigned requests; role-based unassigned queue claiming is not visible.
- No staff performance metrics beyond the small dashboard summary.

## Priority Implementation Backlog

### Priority 1: Core Workflow Correctness

- Add request audit log UI for admin and staff.
- Verify and enforce offering delete rules: block deletion when applications/history exist.
- Complete eligibility evaluation against student/application data.
- Add UI for correction-specific document selection.
- Add clear workflow version history and display which version each request is using.
- Add request cancel/withdraw/resubmit edge-case handling.

### Priority 2: Student Dashboard And Request Visibility

- Replace the current student dashboard landing content with active request cards.
- Show request status, current workflow step, missing documents, correction notes, appointment, queue ticket, and next action.
- Add request history page or dashboard section.
- Add notification timeline for each student.
- Add appointment cancel/reschedule if appointment booking is in scope.
- Add request withdrawal/cancel flow if allowed by institution.

### Priority 3: Staff Operations

- Build staff queue board screen using existing queue APIs.
- Build staff appointment schedule screen using existing appointment APIs.
- Add staff notification center or improve current notification bell coverage.
- Add staff workload summary by status, due soon, breached SLA, and upcoming appointments.
- Add role-based request claiming if staff should pull from a queue instead of only admin assignment.

### Priority 4: Admin Dashboard And Analytics

- Add filters: date range, service, offering, status, staff member.
- Add service/offering drill-down analytics.
- Add workflow step bottleneck chart.
- Add turnaround time and SLA trend charts.
- Add correction rate and rejection reason analytics.
- Add queue wait-time and appointment utilization analytics.
- Add CSV/PDF export for dashboard data.

### Priority 5: Admin Configuration Management

- Add full staff management page outside onboarding.
- Add service edit/archive/delete controls if not already complete in UI.
- Add bulk offering actions UI if not already exposed.
- Add knowledge document version history and configuration diff review.
- Add manual override controls for AI suggestions at individual suggestion level.
- Add scheduled offering expiry handling and UI messaging.

### Priority 6: Product Hardening

- Add backend tests for auth, offering activation, application submission, workflow actions, queue, appointments, and student import.
- Add frontend smoke tests for admin, staff, and student critical flows.
- Add validation tests for file upload types/sizes.
- Add email failure/retry visibility.
- Add audit/security log surface.
- Add password reset and invitation flows.

## Suggested Implementation Order

1. Finish request lifecycle correctness: eligibility evaluation, delete/history rules, audit log, correction document selection.
2. Improve student dashboard so students can observe all active work in one place.
3. Build staff queue and appointment operation screens because backend APIs already exist.
4. Expand admin analytics from summary cards to operational insight.
5. Add configuration history/diff/version screens.
6. Add tests and hardening around the completed flows.

## Files And Areas To Start From

Backend:

- `backend/src/modules/student/student.service.js`
- `backend/src/modules/applications/application.service.js`
- `backend/src/modules/offerings/offering.service.js`
- `backend/src/modules/queue/queue.service.js`
- `backend/src/modules/appointments/appointment.service.js`
- `backend/src/modules/analytics/analytics.service.js`
- `backend/src/shared/helpers/workflowExecution.helper.js`
- `backend/src/shared/helpers/offeringCompleteness.helper.js`

Admin frontend:

- `frontend-admin/src/pages/admin/AdminDashboardPage.jsx`
- `frontend-admin/src/pages/admin/ApplicationsListPage.jsx`
- `frontend-admin/src/pages/admin/ApplicationDetailPage.jsx`
- `frontend-admin/src/pages/admin/StudentsListPage.jsx`
- `frontend-admin/src/pages/admin/services/ServiceDetailPage.jsx`
- `frontend-admin/src/pages/admin/offerings/OfferingConfigurePage.jsx`
- `frontend-admin/src/pages/staff/StaffDashboardPage.jsx`
- `frontend-admin/src/pages/staff/StaffApplicationsListPage.jsx`
- `frontend-admin/src/pages/staff/StaffApplicationDetailPage.jsx`

Student frontend:

- `frontend-student/src/pages/DashboardPage.jsx`
- `frontend-student/src/pages/ServicesPage.jsx`
- `frontend-student/src/pages/ServiceDetailPage.jsx`
- `frontend-student/src/pages/EnrollPage.jsx`
- `frontend-student/src/pages/EnrollOfferingPage.jsx`
- `frontend-student/src/components/services/ServiceRequestPanel.jsx`
- `frontend-student/src/components/services/QueueAppointmentPanel.jsx`
- `frontend-student/src/components/services/ServiceChatPanel.jsx`
