import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { ApplicationReviewContent } from '@/components/applications/ApplicationReviewContent';
import { ApplicationAuditLog } from '@/components/applications/ApplicationAuditLog';
import { ApplicationLifecycleActions } from '@/components/applications/ApplicationLifecycleActions';
import { ApplicationPaymentsPanel } from '@/components/payments/ApplicationPaymentsPanel';
import { DocumentPreviewModal } from '@/components/applications/DocumentPreviewModal';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { ApplicationReviewSkeleton } from '@/components/skeletons';
import { applicationsApi, downloadApplicationDocument } from '@/api/applications.api';
import { userApi } from '@/api/user.api';

export function ApplicationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [staff, setStaff] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [slaActionLoading, setSlaActionLoading] = useState(false);
  const [previewDocument, setPreviewDocument] = useState(null);

  const loadApplication = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await applicationsApi.get(id);
      setApplication(data.data.application);
      setSelectedStaffId(data.data.application.assignedTo?.id ?? '');
    } catch (err) {
      toast.error(err.message || 'Failed to load request');
      navigate('/admin/applications');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadApplication();
  }, [loadApplication]);

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
      toast.error('Select a staff member first');
      return;
    }
    setAssigning(true);
    try {
      const { data } = await applicationsApi.assignStaff(id, selectedStaffId);
      setApplication(data.data.application);
      toast.success('Request assigned — staff member will be notified by email');
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
            onPreview={setPreviewDocument}
            onDownload={(document) => downloadApplicationDocument(id, document)}
            onSlaAction={handleSlaAction}
            slaActionLoading={slaActionLoading}
            assignSection={
              application.status !== 'draft' ? (
                <>
                  <ApplicationLifecycleActions
                    applicationId={id}
                    status={application.status}
                    role="admin"
                    workflowSteps={application.workflow?.steps}
                    currentStep={application.workflow?.currentStep}
                    onUpdated={loadApplication}
                  />
                  <div className="mt-8 rounded-2xl border border-[#E2EEE8] bg-white p-5 shadow-sm">
                  <h2 className="text-sm font-bold text-[#052E1C]">Assign to staff</h2>
                  <p className="mt-1 text-sm text-[#4B6358]">
                    Choose a staff member to review this request. They will receive an email
                    notification.
                  </p>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Select
                      value={selectedStaffId}
                      onChange={setSelectedStaffId}
                      placeholder="Select staff member"
                      options={staff.map((member) => ({
                        value: member.id,
                        label: `${member.name} (${member.email})`,
                      }))}
                      className="min-w-0 flex-1"
                    />
                    <Button type="button" disabled={assigning} onClick={handleAssign}>
                      {assigning ? 'Assigning...' : 'Assign request'}
                    </Button>
                  </div>
                  </div>
                  <div className="mt-8 rounded-2xl border border-[#E2EEE8] bg-white p-5 shadow-sm">
                    <h2 className="text-sm font-bold text-[#052E1C]">Audit log</h2>
                    <p className="mt-1 text-sm text-[#4B6358]">
                      Who did what and when on this request.
                    </p>
                    <div className="mt-4">
                      <ApplicationAuditLog applicationId={id} />
                    </div>
                  </div>
                </>
              ) : null
            }
          />
        )}
        {!loading && application ? (
          <div className="mt-8">
            <ApplicationPaymentsPanel applicationId={id} />
          </div>
        ) : null}
      </div>

      <DocumentPreviewModal
        open={Boolean(previewDocument)}
        onClose={() => setPreviewDocument(null)}
        applicationId={id}
        document={previewDocument}
        mode="admin"
      />
    </AdminLayout>
  );
}
