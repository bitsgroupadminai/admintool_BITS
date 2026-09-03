import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { ApplicationReviewContent } from '@/components/applications/ApplicationReviewContent';
import { ApplicationLifecycleActions } from '@/components/applications/ApplicationLifecycleActions';
import { ApplicationPaymentsPanel } from '@/components/payments/ApplicationPaymentsPanel';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { ApplicationReviewSkeleton } from '@/components/skeletons';
import { applicationsApi, downloadApplicationDocument } from '@/api/applications.api';
import { userApi } from '@/api/user.api';
import { useAuthStore } from '@/store/auth.store';
import { useSocketEvent } from '@/contexts/SocketContext';
import { WS_EVENTS } from '@/lib/socket';

export function ApplicationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const [application, setApplication] = useState(null);
  const [staff, setStaff] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [slaActionLoading, setSlaActionLoading] = useState(false);
  const [reviewingDocumentId, setReviewingDocumentId] = useState(null);
  const [reverifyLoading, setReverifyLoading] = useState(false);

  const assigneeOptions = useMemo(() => {
    const options = [];
    if (currentUser?.id) {
      options.push({
        value: currentUser.id,
        label: `${currentUser.name} (Me — Admin)`,
      });
    }
    staff.forEach((member) => {
      if (member.id !== currentUser?.id) {
        options.push({
          value: member.id,
          label: `${member.name} (${member.email})`,
        });
      }
    });
    return options;
  }, [currentUser, staff]);

  const loadApplication = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await applicationsApi.get(id);
      setApplication(data.data.application);
      setSelectedStaffId(data.data.application.assignedTo?.id ?? '');
    } catch (err) {
      if (!silent) {
        toast.error(err.message || 'Failed to load request');
        navigate('/admin/applications');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadApplication();
  }, [loadApplication]);

  useSocketEvent(WS_EVENTS.APPLICATION_UPDATED, () => {
    loadApplication({ silent: true });
  }, [loadApplication]);

  useEffect(() => {
    if (!application?.aiVerificationPending) return undefined;
    const timer = setInterval(() => {
      loadApplication({ silent: true });
    }, 4000);
    return () => clearInterval(timer);
  }, [application?.aiVerificationPending, loadApplication]);

  useEffect(() => {
    userApi
      .listStaff()
      .then(({ data }) => setStaff(data.data.staff ?? []))
      .catch(() => {});
  }, []);

  const handleWorkflowAction = async (payload) => {
    setUpdating(true);
    try {
      const { data } = await applicationsApi.workflowAction(id, payload);
      setApplication(data.data.application);
      toast.success('Workflow updated — student will be notified by email');
    } catch (err) {
      toast.error(err.message || 'Could not apply workflow action');
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusUpdate = async (status) => {
    setUpdating(true);
    try {
      const { data } = await applicationsApi.updateStatus(id, status);
      setApplication(data.data.application);
      toast.success('Request status updated — student will be notified by email');
    } catch (err) {
      toast.error(err.message || 'Could not update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedStaffId) {
      toast.error('Select who should handle this request');
      return;
    }
    setAssigning(true);
    try {
      const { data } = await applicationsApi.assignStaff(id, selectedStaffId);
      const updated = data.data.application;
      setApplication(updated);
      setSelectedStaffId(updated.assignedTo?.id ?? selectedStaffId);
      toast.success(
        application?.assignedTo
          ? 'Request reassigned — assignee will be notified by email'
          : 'Request assigned — assignee will be notified by email',
      );
    } catch (err) {
      toast.error(err.message || 'Could not assign request');
    } finally {
      setAssigning(false);
    }
  };

  const handleSlaAction = async (action) => {
    setSlaActionLoading(true);
    try {
      const { data } = await applicationsApi.slaAction(id, action);
      setApplication(data.data.application);
      toast.success(action === 'extend' ? 'SLA deadline extended' : 'Request escalated to staff');
    } catch (err) {
      toast.error(err.message || 'Could not apply SLA action');
    } finally {
      setSlaActionLoading(false);
    }
  };

  const fetchDocumentBlob = useCallback(
    (document) => applicationsApi.fetchDocumentBlob(id, document.id),
    [id],
  );

  const handleReverifyAi = async () => {
    setReverifyLoading(true);
    try {
      const { data } = await applicationsApi.reverifyAi(id);
      setApplication(data.data.application);
      toast.success('AI is re-verifying all uploaded documents');
    } catch (err) {
      toast.error(err.message || 'Could not start AI re-verification');
    } finally {
      setReverifyLoading(false);
    }
  };

  const handleDocumentReview = async (document, payload) => {
    if (payload.status === 'needs_correction' && !payload.note?.trim()) {
      toast.error('Add a note explaining what the student should fix');
      return;
    }
    setReviewingDocumentId(document.id);
    try {
      const { data } = await applicationsApi.reviewDocument(id, document.id, payload);
      setApplication(data.data.application);
      toast.success(
        payload.status === 'needs_correction'
          ? 'Correction requested — student will be notified'
          : `Document ${payload.status === 'approved' ? 'approved' : 'rejected'}`,
      );
    } catch (err) {
      toast.error(err.message || 'Could not save document review');
    } finally {
      setReviewingDocumentId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <Link
          to="/admin/applications"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#0A6640]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to requests
        </Link>

        {loading ? (
          <ApplicationReviewSkeleton showAssignSection />
        ) : (
          <ApplicationReviewContent
            application={application}
            updating={updating}
            onStatusUpdate={handleStatusUpdate}
            onWorkflowAction={handleWorkflowAction}
            onDownload={(document) => downloadApplicationDocument(id, document)}
            fetchDocumentBlob={fetchDocumentBlob}
            onSlaAction={handleSlaAction}
            slaActionLoading={slaActionLoading}
            onDocumentReview={handleDocumentReview}
            reviewingDocumentId={reviewingDocumentId}
            onReverifyAi={handleReverifyAi}
            reverifyLoading={reverifyLoading}
            lifecycleRole="admin"
            onLifecycleUpdated={loadApplication}
            requestActions={
              application.status !== 'draft' ? (
                <ApplicationLifecycleActions
                  applicationId={id}
                  status={application.status}
                  role="admin"
                  onUpdated={loadApplication}
                  embedded
                />
              ) : null
            }
            assignmentSection={
              application.status !== 'draft' ? (
                  <div className="mt-6 rounded-2xl border border-[#E2EEE8] bg-white p-5 shadow-sm">
                  <h2 className="text-sm font-bold text-[#052E1C]">Assign to staff</h2>
                  <p className="mt-1 text-sm text-[#4B6358]">
                    Assign this request to a staff member or to yourself. The assignee handles
                    every workflow step that requires staff action and receives an email notification.
                  </p>

                  {application.assignedTo ? (
                    <div className="mt-4 rounded-xl border border-[#C4E8D4] bg-[#F0FAF5] p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#10B981]">
                        Currently assigned to
                      </p>
                      <p className="mt-2 text-base font-semibold text-[#052E1C]">
                        {application.assignedTo.name}
                        {application.assignedTo.role === 'admin' ? ' (Admin)' : ''}
                      </p>
                      <p className="mt-1 text-sm text-[#4B6358]">{application.assignedTo.email}</p>
                      {application.assignedAt ? (
                        <p className="mt-2 text-xs text-[#6B7280]">
                          Assigned {new Date(application.assignedAt).toLocaleString()}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-4 rounded-xl border border-dashed border-[#C4E8D4] bg-[#F9FCFB] px-4 py-3 text-sm text-[#4B6358]">
                      This request is not assigned yet.
                    </p>
                  )}

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Select
                      value={selectedStaffId}
                      onChange={setSelectedStaffId}
                      placeholder="Select assignee"
                      options={assigneeOptions}
                      className="min-w-0 flex-1"
                    />
                    <Button type="button" disabled={assigning || !selectedStaffId} onClick={handleAssign}>
                      {assigning
                        ? 'Saving...'
                        : application.assignedTo
                          ? 'Reassign request'
                          : 'Assign request'}
                    </Button>
                  </div>
                  </div>
              ) : null
            }
            afterDocuments={
              <div className="mt-6">
                <ApplicationPaymentsPanel applicationId={id} />
              </div>
            }
          />
        )}
      </div>
    </AdminLayout>
  );
}
