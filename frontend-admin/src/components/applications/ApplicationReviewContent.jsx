import { useState } from 'react';
import { ArrowUpRight, Download, Loader2, RefreshCw, Undo2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { useConfirm } from '@/components/ui/confirm-context';
import { SlaBreachActions } from '@/components/applications/SlaBreachActions';
import {
  DocumentEligibilityDetails,
  displayEligibilityVerdict,
  eligibilityBadgeMeta,
} from '@/components/applications/DocumentEligibilityReview';
import { rulesFromDocumentEligibility } from '@/utils/documentEligibility';
import { ApplicationAuditLog } from '@/components/applications/ApplicationAuditLog';
import { WorkflowFunnel } from '@/components/applications/WorkflowFunnel';
import { InlineDocumentPreview } from '@/components/applications/InlineDocumentPreview';
import { applicationLifecycleApi } from '@/api/applications.lifecycle.api';
import {
  APPLICATION_STATUS_BADGE_VARIANT,
  APPLICATION_STATUS_LABELS,
  getApplicationStatusActions,
} from '@/constants/applicationManagement.constants';
import {
  getStaffApproveConfirm,
  getStaffApproveLabel,
  getStaffRejectLabel,
  getReviewerStepGuidance,
} from '@/utils/workflowStepGuidance';

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isDocumentAiStep(step) {
  if (!step) return false;
  if (step.handledBy?.type !== 'ai') return false;
  const assignee = step.handledBy?.assignee ?? '';
  return assignee === 'document_verification' || /document/i.test(step.name ?? '');
}

function isNegativeAiDecision(decision) {
  if (!decision) return false;
  if (['fail', 'uncertain', 'ineligible'].includes(decision.verdict)) return true;
  if (['failed', 'returned_for_correction', 'escalated'].includes(decision.action)) return true;
  return (decision.perDocument ?? []).some((item) => {
    const verdict = item.eligibilityVerdict || item.verdict;
    return verdict === 'fail' || verdict === 'uncertain' || verdict === 'ineligible';
  });
}

function hasNegativeAiReview(decisions) {
  const latestByHandler = new Map();
  for (const decision of decisions ?? []) {
    if (!latestByHandler.has(decision.handler)) {
      latestByHandler.set(decision.handler, decision);
    }
  }
  return [...latestByHandler.values()].some(isNegativeAiDecision);
}

function findAiFinding(decisions, requirementName) {
  const matchName = String(requirementName ?? '').trim().toLowerCase();
  for (const decision of decisions ?? []) {
    if (decision.handler !== 'document_verification') continue;
    const finding = (decision.perDocument ?? []).find(
      (item) => String(item.requirementName ?? '').trim().toLowerCase() === matchName,
    );
    if (finding) return { finding, decision };
    if (!(decision.perDocument ?? []).length) {
      return { finding: null, decision };
    }
  }
  return null;
}

const AI_VERDICT = {
  eligible: { label: 'Eligible', className: 'border-[#BBF7D0] bg-[#ECFDF5] text-[#0A6640]' },
  ineligible: { label: 'Ineligible', className: 'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]' },
};

const MANUAL_STATUS = {
  approved: { label: 'Eligible', className: 'border-[#BBF7D0] bg-[#ECFDF5] text-[#0A6640]' },
  rejected: { label: 'Ineligible', className: 'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]' },
  needs_correction: { label: 'Needs correction', className: 'border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]' },
  pending: { label: 'Not reviewed', className: 'border-[#E2EEE8] bg-[#F9FCFB] text-[#4B6358]' },
};

const ROLLBACK_STATUSES = ['in_review', 'needs_correction', 'pending_ai_review'];
const TERMINAL_STATUSES = ['admitted', 'rejected', 'withdrawn', 'cancelled'];

function DetailChip({ label, value }) {
  return (
    <div className="min-w-[140px] flex-1 rounded-xl border border-[#E2EEE8] bg-white px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6B7280]">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-[#052E1C]">{value || '—'}</p>
    </div>
  );
}

function DocumentVerificationPanel({
  requirement,
  uploaded,
  application,
  usesAiVerification,
  pendingAi,
  showManualReview,
  reviewing,
  onReview,
}) {
  const [note, setNote] = useState(uploaded?.reviewNote ?? '');
  const aiMatch = findAiFinding(application.aiDecisions, requirement.name);
  const eligibilityVerdict = displayEligibilityVerdict(aiMatch?.finding) ?? displayEligibilityVerdict(aiMatch?.decision);
  const aiVerdict = eligibilityBadgeMeta(eligibilityVerdict) ?? AI_VERDICT[eligibilityVerdict];
  const manual = MANUAL_STATUS[uploaded?.reviewStatus] ?? MANUAL_STATUS.pending;
  const eligibilityRules = application.eligibilityRules ?? [];
  const documentRules = rulesFromDocumentEligibility(requirement?.eligibility);
  const hasEligibility = documentRules.length > 0 || eligibilityRules.length > 0;
  const staffOverrodeNegative =
    uploaded?.reviewStatus === 'rejected' || uploaded?.reviewStatus === 'needs_correction';
  const showMarkEligible =
    staffOverrodeNegative ||
    !(usesAiVerification && !pendingAi && eligibilityVerdict === 'eligible');

  return (
    <div className="flex h-full flex-col space-y-3">
      {usesAiVerification ? (
        <div className="rounded-xl border border-[#D4E5D0] bg-[#F6FAF5] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-[#0A6640]">Eligibility</p>
            {pendingAi ? null : eligibilityVerdict && aiVerdict ? (
              <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${aiVerdict.className}`}>
                {aiVerdict.label}
              </span>
            ) : null}
          </div>
          {pendingAi ? (
            <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[#1D4ED8]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking this document against eligibility rules...
            </p>
          ) : aiMatch ? (
            <>
              <div className="mt-3">
                <DocumentEligibilityDetails
                  requirement={requirement}
                  finding={aiMatch.finding}
                  eligibilityRules={eligibilityRules}
                />
              </div>
              {aiMatch.finding?.observedContent ? (
                <p className="mt-3 text-sm text-[#334155]">
                  <span className="font-semibold text-[#052E1C]">What was uploaded: </span>
                  {aiMatch.finding.observedContent}
                </p>
              ) : null}
              {aiMatch.finding?.issue ? (
                <p className="mt-2 text-sm leading-relaxed text-[#334155]">{aiMatch.finding.issue}</p>
              ) : eligibilityVerdict === 'eligible' ? (
                <p className="mt-2 text-sm text-[#4B6358]">
                  This file is valid and meets the eligibility requirement for this document.
                </p>
              ) : null}
            </>
          ) : (
            <div className="mt-3">
              <DocumentEligibilityDetails
                requirement={requirement}
                finding={null}
                eligibilityRules={eligibilityRules}
              />
              <p className="mt-2 text-sm text-[#4B6358]">No AI result for this document yet.</p>
            </div>
          )}
        </div>
      ) : hasEligibility ? (
        <div className="rounded-xl border border-[#D4E5D0] bg-[#F6FAF5] p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[#0A6640]">Eligibility</p>
          <div className="mt-3">
            <DocumentEligibilityDetails
              requirement={requirement}
              finding={null}
              eligibilityRules={eligibilityRules}
            />
          </div>
        </div>
      ) : null}

      {showManualReview && uploaded ? (
        <div className="rounded-xl border border-[#E2EEE8] bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-[#052E1C]">Staff decision</p>
            <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${manual.className}`}>
              {manual.label}
            </span>
          </div>
          {uploaded.reviewedByName ? (
            <p className="mt-1 text-xs text-[#6B7280]">
              Last reviewed by {uploaded.reviewedByName}
              {uploaded.reviewedAt ? ` · ${new Date(uploaded.reviewedAt).toLocaleString()}` : ''}
            </p>
          ) : null}
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            placeholder="Notes for the student (required when requesting a correction)"
            className="mt-3 w-full rounded-xl border border-[#C4E8D4] bg-[#F9FCFB] px-3 py-2 text-xs text-[#052E1C] outline-none focus:border-[#6EE7B7] focus:bg-white focus:ring-2 focus:ring-[#6EE7B7]/20"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {showMarkEligible ? (
              <Button
                type="button"
                disabled={reviewing}
                onClick={() => onReview({ status: 'approved', note })}
              >
                Mark eligible
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              disabled={reviewing}
              onClick={() => onReview({ status: 'rejected', note })}
            >
              Mark ineligible
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={reviewing}
              onClick={() => onReview({ status: 'needs_correction', note })}
            >
              Needs correction
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ApplicationReviewContent({
  application,
  updating,
  onStatusUpdate,
  onWorkflowAction,
  onDownload,
  fetchDocumentBlob,
  requestActions = null,
  assignmentSection = null,
  afterDocuments = null,
  onSlaAction = null,
  slaActionLoading = false,
  onDocumentReview = null,
  reviewingDocumentId = null,
  onReverifyAi = null,
  reverifyLoading = false,
  lifecycleRole = null,
  onLifecycleUpdated = null,
}) {
  const confirm = useConfirm();
  const [note, setNote] = useState('');
  const [auditNote, setAuditNote] = useState('');
  const [escalateNote, setEscalateNote] = useState('');
  const [selectedCorrectionDocs, setSelectedCorrectionDocs] = useState([]);
  const [sendBackStepId, setSendBackStepId] = useState('');
  const [sendBackMode, setSendBackMode] = useState(null);
  const [rollbackLoading, setRollbackLoading] = useState(false);
  const [escalateLoading, setEscalateLoading] = useState(false);
  const [escalateOpen, setEscalateOpen] = useState(false);
  const uploadedMap = new Map(
    (application?.documents ?? []).map((document) => [document.requirementId, document]),
  );
  const workflow = application?.workflow;
  const workflowActions = workflow?.availableActions ?? [];
  const legacyActions = workflowActions.length ? [] : getApplicationStatusActions(application?.status);
  const steps = workflow?.steps ?? [];
  const usesAiVerification = steps.some(isDocumentAiStep);
  const pendingAi = Boolean(application?.aiVerificationPending);
  const canReverifyAi =
    Boolean(onReverifyAi) &&
    usesAiVerification &&
    (hasNegativeAiReview(application?.aiDecisions) || application?.status === 'pending_ai_review');
  const showManualReview =
    Boolean(onDocumentReview) &&
    (!usesAiVerification || pendingAi || workflowActions.length > 0);
  const lastStep = steps.length
    ? [...steps].sort((a, b) => Number(a.order) - Number(b.order)).at(-1)
    : null;
  const currentStep =
    steps.find((step) => step.state === 'current') ??
    workflow?.currentStep ??
    (application?.status === 'admitted' ? lastStep : null);
  const currentStepIndex = steps.findIndex((step) => step.stepId === currentStep?.stepId);
  const nextStep = currentStepIndex >= 0 ? steps[currentStepIndex + 1] : null;
  const approveAction = workflowActions.find((action) => action.outcome === 'approved');
  const rejectAction = workflowActions.find((action) => action.outcome === 'rejected');
  const correctionAction = workflowActions.find((action) => action.outcome === 'needs_correction');
  const earlierSteps = steps
    .filter((step) => {
      if (step.stepId === currentStep?.stepId) return false;
      if (step.state === 'complete') return true;
      const currentOrder = Number(currentStep?.order);
      const stepOrder = Number(step.order);
      return Number.isFinite(currentOrder) && Number.isFinite(stepOrder) && stepOrder < currentOrder;
    })
    .sort((a, b) => Number(a.order) - Number(b.order));
  const showRollbackUi =
    Boolean(lifecycleRole && onLifecycleUpdated) &&
    Boolean(application?.status) &&
    application.status !== 'draft';
  const canRollback =
    showRollbackUi &&
    earlierSteps.length > 0 &&
    (ROLLBACK_STATUSES.includes(application.status) ||
      (lifecycleRole === 'admin' && application.status === 'admitted'));

  const canEscalate =
    Boolean(lifecycleRole && onLifecycleUpdated) &&
    Boolean(application?.status) &&
    application.status !== 'draft' &&
    !TERMINAL_STATUSES.includes(application.status);

  const resetSendBackForm = () => {
    setNote('');
    setAuditNote('');
    setSelectedCorrectionDocs([]);
    setSendBackStepId('');
    setSendBackMode(null);
  };

  const openSendBack = (targetStepId, mode = 'rollback') => {
    setSendBackStepId(targetStepId);
    setSendBackMode(mode);
    setNote('');
    setAuditNote('');
    setSelectedCorrectionDocs([]);
  };

  const closeSendBack = () => {
    if (rollbackLoading || escalateOpen) return;
    resetSendBackForm();
  };

  const commitRollback = async () => {
    const step = steps.find((item) => item.stepId === sendBackStepId);
    if (!step) return;
    if (!note.trim()) {
      toast.error('Explain what the student should fix before sending the request back.');
      return;
    }

    setRollbackLoading(true);
    try {
      await applicationLifecycleApi.rollback(
        application.id,
        {
          targetStepId: sendBackStepId,
          note: note.trim(),
          ...(auditNote.trim() ? { auditNote: auditNote.trim() } : {}),
          ...(selectedCorrectionDocs.length
            ? { correctionRequiredDocuments: selectedCorrectionDocs }
            : {}),
        },
        lifecycleRole,
      );
      toast.success(`Request sent back to ${step.name}`);
      resetSendBackForm();
      onLifecycleUpdated?.();
    } catch (err) {
      toast.error(err.message || 'Could not send this request back');
    } finally {
      setRollbackLoading(false);
    }
  };

  const openEscalate = () => {
    setEscalateNote(auditNote);
    setEscalateOpen(true);
  };

  const closeEscalate = () => {
    if (escalateLoading) return;
    setEscalateOpen(false);
    setEscalateNote('');
  };

  const commitEscalate = async () => {
    setEscalateLoading(true);
    try {
      await applicationLifecycleApi.escalate(
        application.id,
        { note: escalateNote.trim() || undefined },
        lifecycleRole,
      );
      toast.success('Request escalated');
      setEscalateOpen(false);
      setEscalateNote('');
      resetSendBackForm();
      onLifecycleUpdated?.();
    } catch (err) {
      toast.error(err.message || 'Could not escalate this request');
    } finally {
      setEscalateLoading(false);
    }
  };

  const handleWorkflowClick = async (outcome) => {
    if (outcome === 'needs_correction' && !note.trim()) {
      toast.error('Explain what the student should fix.');
      return false;
    }
    if (outcome === 'approved') {
      const ok = await confirm({
        title: getStaffApproveLabel(currentStep, nextStep?.name),
        description: getStaffApproveConfirm(currentStep, nextStep?.name),
        confirmLabel: 'Continue',
      });
      if (!ok) return false;
    }
    if (outcome === 'rejected') {
      const ok = await confirm({
        title: getStaffRejectLabel(currentStep),
        description: 'This closes the request. The student will be notified.',
        confirmLabel: 'Reject request',
        variant: 'danger',
      });
      if (!ok) return false;
    }
    const applied = await onWorkflowAction?.({
      outcome,
      note: note.trim() || undefined,
      ...(outcome === 'needs_correction' && auditNote.trim() ? { auditNote: auditNote.trim() } : {}),
      ...(outcome === 'needs_correction' && selectedCorrectionDocs.length
        ? { correctionRequiredDocuments: selectedCorrectionDocs }
        : {}),
    });
    return applied !== false;
  };

  const commitCorrection = async () => {
    setRollbackLoading(true);
    try {
      const ok = await handleWorkflowClick('needs_correction');
      if (ok) resetSendBackForm();
    } finally {
      setRollbackLoading(false);
    }
  };

  const toggleCorrectionDoc = (name) => {
    setSelectedCorrectionDocs((current) =>
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name],
    );
  };

  const activityEntries = (workflow?.history ?? []).map((entry, index) => ({
    id: `${entry.stepId}-${entry.createdAt}-${index}`,
    stepName: entry.stepName,
    outcome: entry.outcome,
    actedByName: entry.actedByName,
    actedByRole: entry.actedByRole,
    note: entry.note,
    createdAt: entry.createdAt,
  }));

  const latestDocumentDecision = (application.aiDecisions ?? []).find(
    (decision) => decision.handler === 'document_verification' || decision.eligibilityResult,
  );

  const showCorrectionOnCurrentStep = Boolean(correctionAction) && !canRollback;
  const sendBackStep = steps.find((step) => step.stepId === sendBackStepId);
  const sendBackOpen = Boolean(sendBackMode && sendBackStepId);
  const documentFixFields = (
    <>
      <div>
        <label htmlFor="student-fix-note" className="text-xs font-bold text-[#052E1C]">
          What the student should fix
        </label>
        <textarea
          id="student-fix-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="Explain what the student should fix"
          className="mt-1.5 w-full rounded-xl border border-[#C4E8D4] bg-white px-3 py-2 text-sm text-[#052E1C] outline-none focus:border-[#6EE7B7] focus:ring-2 focus:ring-[#6EE7B7]/20"
        />
      </div>
      {(application.documentRequirements ?? []).length > 0 ? (
        <div className="rounded-xl border border-[#E2EEE8] bg-[#F9FCFB] p-3">
          <p className="text-xs font-bold text-[#052E1C]">Which documents need fixing?</p>
          <div className="mt-2 space-y-2">
            {(application.documentRequirements ?? []).map((requirement) => (
              <label
                key={requirement.id}
                className="flex items-center gap-2 text-sm text-[#4B6358]"
              >
                <input
                  type="checkbox"
                  checked={selectedCorrectionDocs.includes(requirement.name)}
                  onChange={() => toggleCorrectionDoc(requirement.name)}
                  className="rounded border-[#C4E8D4]"
                />
                {requirement.name}
              </label>
            ))}
          </div>
        </div>
      ) : null}
      <div>
        <label htmlFor="send-back-audit-note" className="text-xs font-bold text-[#052E1C]">
          Optional note for the audit log
        </label>
        <textarea
          id="send-back-audit-note"
          value={auditNote}
          onChange={(event) => setAuditNote(event.target.value)}
          rows={2}
          maxLength={500}
          placeholder="Internal note — not shown to the student"
          className="mt-1.5 w-full rounded-xl border border-[#C4E8D4] bg-[#F0FAF5] px-3 py-2 text-sm text-[#052E1C] outline-none focus:border-[#6EE7B7] focus:ring-2 focus:ring-[#6EE7B7]/20"
        />
      </div>
    </>
  );

  const reviewerGuidance = getReviewerStepGuidance(currentStep, lifecycleRole);
  const currentStepAction =
    currentStep && (approveAction || rejectAction || reviewerGuidance)
      ? {
          guidance: pendingAi
            ? 'AI is reviewing this step. Staff actions appear here if it needs a human decision.'
            : reviewerGuidance,
          approveLabel: approveAction
            ? getStaffApproveLabel(currentStep, nextStep?.name)
            : null,
          rejectLabel: rejectAction ? getStaffRejectLabel(currentStep) : null,
          updating,
          onApprove: () => handleWorkflowClick('approved'),
          onReject: () => handleWorkflowClick('rejected'),
        }
      : null;

  const sendBackFooter = (
    <div className="flex w-full flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={rollbackLoading} onClick={closeSendBack}>
          <XCircle className="h-3.5 w-3.5" />
          Cancel
        </Button>
        {canEscalate ? (
          <Button type="button" variant="outline" disabled={rollbackLoading} onClick={openEscalate}>
            <ArrowUpRight className="h-3.5 w-3.5" />
            Escalate
          </Button>
        ) : null}
      </div>
      <Button
        type="button"
        disabled={rollbackLoading || updating}
        onClick={sendBackMode === 'correction' ? commitCorrection : commitRollback}
      >
        <Undo2 className="h-3.5 w-3.5" />
        {rollbackLoading ? 'Sending back...' : 'Send back'}
      </Button>
    </div>
  );

  return (
    <>
      <section className="mt-5 rounded-2xl border border-[#E2EEE8] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#10B981]">
              Request review
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#052E1C]">
              {application.applicantName}
            </h1>
          </div>
          <Badge variant={APPLICATION_STATUS_BADGE_VARIANT[application.status] ?? 'default'}>
            {APPLICATION_STATUS_LABELS[application.status] ?? application.status}
          </Badge>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <DetailChip label="Email" value={application.applicantEmail} />
          {application.applicantMobile ? (
            <DetailChip label="Mobile" value={application.applicantMobile} />
          ) : null}
          {(application.applicantDetails ?? []).map((item) => (
            <DetailChip
              key={item.fieldKey}
              label={item.label}
              value={String(item.value ?? '—')}
            />
          ))}
          <DetailChip label="Service" value={application.serviceName} />
          <DetailChip label="Option" value={application.offeringName} />
          {application.assignedTo ? (
            <DetailChip
              label="Assigned to"
              value={`${application.assignedTo.name}${application.assignedTo.role === 'admin' ? ' (Admin)' : ''}`}
            />
          ) : (
            <DetailChip label="Assigned to" value="Unassigned" />
          )}
        </div>
      </section>

      <div className="mt-6">
        <WorkflowFunnel
          steps={steps}
          currentStepName={currentStep?.name}
          statusLabel={APPLICATION_STATUS_LABELS[application.status]}
          onRollbackToStep={canRollback ? (stepId) => openSendBack(stepId, 'rollback') : undefined}
          onSendBackCurrent={
            showCorrectionOnCurrentStep
              ? () => openSendBack(currentStep.stepId, 'correction')
              : undefined
          }
          rollbackLoading={rollbackLoading}
          currentStepAction={currentStepAction}
          onEscalate={canEscalate ? openEscalate : undefined}
          escalateLoading={escalateLoading}
        />
        <p className="mt-2 px-1 text-xs text-[#4B6358]">
          Updated {new Date(application.updatedAt).toLocaleString()}
          {application.currentStepDueAt
            ? ` · SLA due ${new Date(application.currentStepDueAt).toLocaleString()}`
            : ''}
          {application.slaBreached || application.slaOverdue ? ' · overdue' : ''}
          {canRollback && application.status === 'admitted'
            ? ' · Send back here on an earlier step to reopen this delivered request'
            : ''}
        </p>
        {onSlaAction ? (
          <SlaBreachActions
            application={application}
            loading={slaActionLoading}
            onExtend={() => onSlaAction('extend')}
            showEscalate={false}
          />
        ) : null}
        {workflowActions.length === 0 && legacyActions.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {legacyActions.map((action) => (
              <Button
                key={action.status}
                type="button"
                variant={action.status === 'rejected' ? 'outline' : 'default'}
                disabled={updating}
                onClick={() => onStatusUpdate(action.status)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        ) : null}
      </div>

      <Dialog
        open={sendBackOpen}
        title={
          sendBackStep
            ? `Send back to “${sendBackStep.name}”`
            : 'Send back'
        }
        description="The student will be notified and must complete this step again. Tell them what to change."
        onClose={closeSendBack}
        footer={sendBackFooter}
      >
        {documentFixFields}
      </Dialog>

      <Dialog
        open={escalateOpen}
        nested={sendBackOpen}
        title="Escalate this request"
        description="Add an optional note for the audit log, then escalate. The note is not shown to the student."
        onClose={closeEscalate}
        footer={
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="outline" disabled={escalateLoading} onClick={closeEscalate}>
              Cancel
            </Button>
            <Button type="button" disabled={escalateLoading} onClick={commitEscalate}>
              <ArrowUpRight className="h-3.5 w-3.5" />
              {escalateLoading ? 'Escalating...' : 'Escalate'}
            </Button>
          </div>
        }
      >
        <div>
          <label htmlFor="escalate-audit-note" className="text-xs font-bold text-[#052E1C]">
            Optional note for the audit log
          </label>
          <textarea
            id="escalate-audit-note"
            value={escalateNote}
            onChange={(event) => setEscalateNote(event.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Why this request needs another reviewer"
            className="mt-1.5 w-full rounded-xl border border-[#C4E8D4] bg-[#F0FAF5] px-3 py-2 text-sm text-[#052E1C] outline-none focus:border-[#6EE7B7] focus:ring-2 focus:ring-[#6EE7B7]/20"
          />
        </div>
      </Dialog>

      {assignmentSection}

      <section className="mt-6 rounded-2xl border border-[#E2EEE8] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#052E1C]">Student documents</h2>
            <p className="mt-1 text-sm text-[#4B6358]">
              {usesAiVerification
                ? 'Documents for this request. AI has already judged eligibility. Override a file only if it should not continue.'
                : 'Review each upload against the eligibility requirement, then mark it eligible or ineligible.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canReverifyAi ? (
              <Button
                type="button"
                variant="outline"
                disabled={reverifyLoading || application.aiVerificationPending}
                onClick={onReverifyAi}
              >
                {reverifyLoading || application.aiVerificationPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                {reverifyLoading || application.aiVerificationPending
                  ? 'Re-verifying with AI...'
                  : 'Re-verify with AI'}
              </Button>
            ) : null}
            <span className="rounded-full bg-[#F0FAF5] px-3 py-1 text-xs font-semibold text-[#0A6640]">
              {application.uploadedRequiredCount ?? 0} / {application.requiredDocumentCount ?? 0} required
              uploaded
            </span>
          </div>
        </div>

        {(application.missingRequiredDocuments ?? []).length > 0 ? (
          <p className="mt-4 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-sm text-[#92400E]">
            Missing: {application.missingRequiredDocuments.map((item) => item.name).join(', ')}
          </p>
        ) : null}

        {usesAiVerification && !pendingAi && latestDocumentDecision ? (
          <p className="mt-4 rounded-xl border border-[#D4E5D0] bg-[#F6FAF5] px-4 py-3 text-sm leading-relaxed text-[#334155]">
            <span className="font-semibold text-[#052E1C]">Overall eligibility: </span>
            {displayEligibilityVerdict(latestDocumentDecision) === 'eligible' ? 'Eligible' : 'Ineligible'}
            {latestDocumentDecision.summary ? ` — ${latestDocumentDecision.summary}` : ''}
            {latestDocumentDecision.confidence != null
              ? ` (${Math.round(latestDocumentDecision.confidence * 100)}% confidence)`
              : ''}
          </p>
        ) : null}

        <div className="mt-5 space-y-6">
          {(application.documentRequirements ?? []).map((requirement) => {
            const uploaded = uploadedMap.get(requirement.id);
            return (
              <div key={requirement.id} className="rounded-2xl border border-[#E2EEE8] bg-[#F9FCFB] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#052E1C]">{requirement.name}</p>
                    <p className="mt-1 text-xs text-[#4B6358]">
                      {requirement.required !== false ? 'Required' : 'Optional'}
                      {uploaded
                        ? ` · ${uploaded.originalName} (${formatFileSize(uploaded.sizeBytes)})`
                        : ''}
                    </p>
                  </div>
                  {uploaded ? (
                    <button
                      type="button"
                      onClick={() => onDownload(uploaded)}
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#C4E8D4] bg-white px-3 text-xs font-semibold text-[#0A6640]"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </button>
                  ) : null}
                </div>

                <div className="mt-4 grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)]">
                  <div className="relative min-h-[360px]">
                    {uploaded ? (
                      <div className="h-full min-h-[360px] lg:absolute lg:inset-0 lg:min-h-0">
                        <InlineDocumentPreview
                          document={uploaded}
                          fetchBlob={fetchDocumentBlob}
                          onDownload={() => onDownload(uploaded)}
                        />
                      </div>
                    ) : (
                      <p className="flex h-full min-h-[360px] items-center justify-center rounded-xl border border-dashed border-[#FDE68A] bg-[#FFFBEB] px-4 text-center text-sm text-[#92400E] lg:absolute lg:inset-0">
                        This document has not been uploaded.
                      </p>
                    )}
                  </div>
                  <DocumentVerificationPanel
                    requirement={requirement}
                    uploaded={uploaded}
                    application={application}
                    usesAiVerification={usesAiVerification}
                    pendingAi={pendingAi}
                    showManualReview={showManualReview}
                    reviewing={reviewingDocumentId === uploaded?.id}
                    onReview={(payload) => onDocumentReview?.(uploaded, payload)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {afterDocuments}

      {requestActions ? (
        <section className="mt-6 rounded-2xl border border-[#E2EEE8] bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-[#052E1C]">More actions</h2>
          <p className="mt-1 text-sm text-[#4B6358]">
            Cancel, reopen, or transfer this request. Notes are saved to the activity log.
          </p>
          <div className="mt-4">{requestActions}</div>
        </section>
      ) : null}

      <section className="mt-6 rounded-2xl border border-[#E2EEE8] bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-[#052E1C]">Activity log</h2>
        <p className="mt-1 text-sm text-[#4B6358]">
          Workflow actions, document reviews, and lifecycle events in one place.
        </p>
        <div className="mt-4">
          <ApplicationAuditLog
            entries={activityEntries}
            configurationVersion={workflow?.configurationVersion ?? null}
          />
        </div>
      </section>
    </>
  );
}
