import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { ApplicationReviewContent } from '@/components/applications/ApplicationReviewContent';
import { ApplicationLifecycleActions } from '@/components/applications/ApplicationLifecycleActions';
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
  const [reviewingDocumentId, setReviewingDocumentId] = useState(null);

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

  const handleDocumentReview = async (document, payload) => {
    if (payload.status === 'needs_correction' && !payload.note?.trim()) {
      toast.error('Add a note explaining what the student should fix');
      return;
    }
    setReviewingDocumentId(document.id);
    try {
      const { data } = await staffApplicationsApi.reviewDocument(id, document.id, payload);
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
            onDownload={(document) => downloadStaffApplicationDocument(id, document)}
            fetchDocumentBlob={(document) => staffApplicationsApi.fetchDocumentBlob(id, document.id)}
            onSlaAction={handleSlaAction}
            slaActionLoading={slaActionLoading}
            onDocumentReview={handleDocumentReview}
            reviewingDocumentId={reviewingDocumentId}
            requestActions={
              application ? (
                <ApplicationLifecycleActions
                  applicationId={id}
                  status={application.status}
                  role="staff"
                  workflowSteps={application.workflow?.steps}
                  currentStep={application.workflow?.currentStep}
                  onUpdated={loadApplication}
                  embedded
                />
              ) : null
            }
          />
        )}
    </DashboardLayout>
  );
}
