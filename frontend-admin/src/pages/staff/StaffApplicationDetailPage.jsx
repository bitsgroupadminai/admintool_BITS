import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { ApplicationReviewContent } from '@/components/applications/ApplicationReviewContent';
import { ApplicationAuditLog } from '@/components/applications/ApplicationAuditLog';
import { ApplicationLifecycleActions } from '@/components/applications/ApplicationLifecycleActions';
import { DocumentPreviewModal } from '@/components/applications/DocumentPreviewModal';
import {
  downloadStaffApplicationDocument,
  staffApplicationsApi,
} from '@/api/staffApplications.api';
import { ApplicationReviewSkeleton } from '@/components/skeletons';

export function StaffApplicationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [slaActionLoading, setSlaActionLoading] = useState(false);
  const [previewDocument, setPreviewDocument] = useState(null);

  const loadApplication = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await staffApplicationsApi.get(id);
      setApplication(data.data.application);
    } catch (err) {
      toast.error(err.message || 'Failed to load assigned request');
      navigate('/staff/applications');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadApplication();
  }, [loadApplication]);

  const handleWorkflowAction = async (payload) => {
    setUpdating(true);
    try {
      const { data } = await staffApplicationsApi.workflowAction(id, payload);
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
      const { data } = await staffApplicationsApi.updateStatus(id, status);
      setApplication(data.data.application);
      toast.success('Request status updated — student will be notified by email');
    } catch (err) {
      toast.error(err.message || 'Could not update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleSlaAction = async (action) => {
    setSlaActionLoading(true);
    try {
      const { data } = await staffApplicationsApi.slaAction(id, action);
      setApplication(data.data.application);
      toast.success(action === 'extend' ? 'SLA deadline extended' : 'Request escalated to staff');
    } catch (err) {
      toast.error(err.message || 'Could not apply SLA action');
    } finally {
      setSlaActionLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <Link
          to="/staff/applications"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#0A6640]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to assigned requests
        </Link>

        {loading ? (
          <ApplicationReviewSkeleton />
        ) : (
          <ApplicationReviewContent
            application={application}
            updating={updating}
            onStatusUpdate={handleStatusUpdate}
            onWorkflowAction={handleWorkflowAction}
            onPreview={setPreviewDocument}
            onDownload={(document) => downloadStaffApplicationDocument(id, document)}
            onSlaAction={handleSlaAction}
            slaActionLoading={slaActionLoading}
            assignSection={
              application ? (
                <>
                  <ApplicationLifecycleActions
                    applicationId={id}
                    status={application.status}
                    role="staff"
                    workflowSteps={application.workflow?.steps}
                    currentStep={application.workflow?.currentStep}
                    onUpdated={loadApplication}
                  />
                  <div className="mt-8 rounded-2xl border border-[#E2EEE8] bg-white p-5 shadow-sm">
                    <h2 className="text-sm font-bold text-[#052E1C]">Audit log</h2>
                    <div className="mt-4">
                      <ApplicationAuditLog applicationId={id} role="staff" />
                    </div>
                  </div>
                </>
              ) : null
            }
          />
        )}

      <DocumentPreviewModal
        open={Boolean(previewDocument)}
        onClose={() => setPreviewDocument(null)}
        applicationId={id}
        document={previewDocument}
        mode="staff"
      />
    </DashboardLayout>
  );
}
