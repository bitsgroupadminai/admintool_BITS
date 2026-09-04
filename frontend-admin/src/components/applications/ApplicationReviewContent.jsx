import { useState } from 'react';
import { Download, Loader2, RefreshCw, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useConfirm } from '@/components/ui/confirm-context';
import { SlaBreachActions } from '@/components/applications/SlaBreachActions';
import { ApplicationAiDecisionsPanel } from '@/components/applications/ApplicationAiDecisionsPanel';
import { ApplicationAuditLog } from '@/components/applications/ApplicationAuditLog';
import { WorkflowFunnel } from '@/components/applications/WorkflowFunnel';
import { InlineDocumentPreview } from '@/components/applications/InlineDocumentPreview';
import { applicationLifecycleApi } from '@/api/applications.lifecycle.api';
import {
  APPLICATION_STATUS_BADGE_VARIANT,
  APPLICATION_STATUS_LABELS,
  getApplicationStatusActions,
  WORKFLOW_OUTCOME_LABELS,
} from '@/constants/applicationManagement.constants';

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
  if (['fail', 'uncertain'].includes(decision.verdict)) return true;
  if (['failed', 'returned_for_correction', 'escalated'].includes(decision.action)) return true;
  return (decision.perDocument ?? []).some(
    (item) => item.verdict === 'fail' || item.verdict === 'uncertain',
  );
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
  pass: { label: 'Passed', className: 'border-[#BBF7D0] bg-[#ECFDF5] text-[#0A6640]' },
  fail: { label: 'Failed', className: 'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]' },
  uncertain: { label: 'Uncertain', className: 'border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]' },
};

const MANUAL_STATUS = {
  approved: { label: 'Approved', className: 'border-[#BBF7D0] bg-[#ECFDF5] text-[#0A6640]' },
  rejected: { label: 'Rejected', className: 'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]' },
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
  const aiVerdict = AI_VERDICT[aiMatch?.finding?.verdict] ?? AI_VERDICT[aiMatch?.decision?.verdict];
  const manual = MANUAL_STATUS[uploaded?.reviewStatus] ?? MANUAL_STATUS.pending;

  return (
    <div className="space-y-3">
      {usesAiVerification ? (
        <div className="rounded-xl border border-[#D4E5D0] bg-[#F6FAF5] p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[#0A6640]">AI verification</p>
          {pendingAi ? (
            <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[#1D4ED8]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verifying this document...
            </p>
          ) : aiMatch ? (
            <>
              <p className={`mt-2 inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${aiVerdict?.className ?? AI_VERDICT.uncertain.className}`}>
                {aiVerdict?.label ?? 'Checked'}
              </p>
              {aiMatch.finding?.observedContent ? (
                <p className="mt-2 text-sm text-[#334155]">
                  <span className="font-semibold text-[#052E1C]">What was uploaded: </span>
                  {aiMatch.finding.observedContent}
                </p>
              ) : null}
              {aiMatch.finding?.issue ? (
                <p className="mt-2 text-sm leading-relaxed text-[#334155]">{aiMatch.finding.issue}</p>
              ) : aiMatch.finding?.verdict === 'pass' ? (
                <p className="mt-2 text-sm text-[#4B6358]">
                  This file matches the requirement and belongs to the applicant.
                </p>
              ) : (
                <p className="mt-2 text-sm text-[#4B6358]">No issues flagged for this document.</p>
              )}
              {aiMatch.finding?.documentExcerpt ? (
                <p className="mt-2 text-xs italic text-[#4B6358]">
                  Evidence: “{aiMatch.finding.documentExcerpt}”
                </p>
              ) : null}
            </>
          ) : (
            <p className="mt-2 text-sm text-[#4B6358]">No AI result for this document yet.</p>
          )}
        </div>
      ) : null}

      {showManualReview && uploaded ? (
        <div className="rounded-xl border border-[#E2EEE8] bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-[#052E1C]">Staff review</p>
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
            <Button
              type="button"
              disabled={reviewing}
              onClick={() => onReview({ status: 'approved', note })}
            >
              Approve
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={reviewing}
              onClick={() => onReview({ status: 'rejected', note })}
            >
              Reject
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
  const [selectedCorrectionDocs, setSelectedCorrectionDocs] = useState([]);
  const [rollbackStepId, setRollbackStepId] = useState('');
  const [rollbackLoading, setRollbackLoading] = useState(false);
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
  const currentStep = workflow?.currentStep;
  const earlierSteps = steps
    .filter((step) => {
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
    ROLLBACK_STATUSES.includes(application.status);
  const rollbackDisabledReason = !showRollbackUi
    ? ''
    : TERMINAL_STATUSES.includes(application.status)
      ? 'This request is closed, so it cannot be sent back to an earlier step.'
      : !ROLLBACK_STATUSES.includes(application.status)
        ? 'Send back is available while the request is in review.'
        : earlierSteps.length === 0
          ? 'This request is still on the first step. After a later step is current, you can send it back from here.'
          : '';

  const commitRollback = async (targetStepId) => {
    const step = steps.find((item) => item.stepId === targetStepId);
    if (!step) return;
    const ok = await confirm({
      title: `Send back to “${step.name}”?`,
      description:
        'The student will be notified and asked to complete this step again. This is recorded in the activity log.',
      confirmLabel: 'Send back',
    });
    if (!ok) return;

    setRollbackLoading(true);
    try {
      await applicationLifecycleApi.rollback(
        application.id,
        { targetStepId },
        lifecycleRole,
      );
      toast.success(`Request sent back to ${step.name}`);
      setRollbackStepId('');
      onLifecycleUpdated?.();
    } catch (err) {
      toast.error(err.message || 'Could not send this request back');
    } finally {
      setRollbackLoading(false);
    }
  };

  const handleWorkflowClick = (outcome) => {
    if (outcome === 'needs_correction' && !note.trim()) {
      return;
    }
    onWorkflowAction?.({
      outcome,
      note: note.trim() || undefined,
      ...(outcome === 'needs_correction' && selectedCorrectionDocs.length
        ? { correctionRequiredDocuments: selectedCorrectionDocs }
        : {}),
    });
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

  const otherAiDecisions = (application.aiDecisions ?? []).filter(
    (decision, index, all) =>
      decision.handler !== 'document_verification' &&
      all.findIndex((item) => item.handler === decision.handler) === index,
  );
  const latestDocumentDecision = (application.aiDecisions ?? []).find(
    (decision) => decision.handler === 'document_verification',
  );

  const rollbackPanel = showRollbackUi ? (
    <div className="mt-4 rounded-xl border border-[#C4E8D4] bg-[#F9FCFB] p-4">
      <p className="text-sm font-semibold text-[#052E1C]">Send back to an earlier step</p>
      <p className="mt-1 text-xs text-[#4B6358]">
        {canRollback
          ? 'Reopen a completed stage. The student will be notified and asked to complete that step again.'
          : rollbackDisabledReason}
      </p>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <Select
            value={rollbackStepId}
            onChange={setRollbackStepId}
            placeholder={canRollback ? 'Select an earlier step' : 'No earlier step yet'}
            options={earlierSteps.map((step) => ({
              value: step.stepId,
              label: `Step ${step.order}: ${step.name}`,
            }))}
            disabled={!canRollback || rollbackLoading}
          />
        </div>
        <Button
          type="button"
          disabled={!canRollback || !rollbackStepId || rollbackLoading}
          onClick={() => commitRollback(rollbackStepId)}
        >
          <Undo2 className="mr-1.5 h-3.5 w-3.5" />
          {rollbackLoading ? 'Sending back...' : 'Send back to step'}
        </Button>
      </div>
    </div>
  ) : null;

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
          currentStepName={workflow?.currentStep?.name}
          statusLabel={APPLICATION_STATUS_LABELS[application.status]}
          onRollbackToStep={canRollback ? commitRollback : undefined}
          rollbackLoading={rollbackLoading}
        />
      </div>

      <section className="mt-6 rounded-2xl border border-[#E2EEE8] bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-[#052E1C]">Request actions</h2>
        <p className="mt-1 text-sm text-[#4B6358]">
          Move this request through its current step, or use lifecycle actions. Notes are saved to
          the activity log.
        </p>
        <p className="mt-3 text-xs text-[#4B6358]">
          Updated {new Date(application.updatedAt).toLocaleString()}
          {application.currentStepDueAt
            ? ` · SLA due ${new Date(application.currentStepDueAt).toLocaleString()}`
            : ''}
          {application.slaBreached || application.slaOverdue ? ' · overdue' : ''}
        </p>

        {onSlaAction ? (
          <SlaBreachActions
            application={application}
            loading={slaActionLoading}
            onExtend={() => onSlaAction('extend')}
            onEscalate={() => onSlaAction('escalate')}
          />
        ) : null}

        {workflowActions.length > 0 ? (
          <div className="mt-4 space-y-3">
            {workflowActions.some((action) => action.outcome === 'needs_correction') ? (
              <>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={3}
                  placeholder="Explain what the student should fix (required for correction requests)"
                  className="w-full rounded-xl border border-[#C4E8D4] bg-white px-3 py-2 text-xs text-[#052E1C] outline-none focus:border-[#6EE7B7] focus:ring-2 focus:ring-[#6EE7B7]/20"
                />
                {(application.documentRequirements ?? []).length > 0 ? (
                  <div className="rounded-xl border border-[#E2EEE8] bg-[#F9FCFB] p-3">
                    <p className="text-xs font-bold text-[#052E1C]">Which documents need fixing?</p>
                    <div className="mt-2 space-y-2">
                      {(application.documentRequirements ?? []).map((requirement) => (
                        <label
                          key={requirement.id}
                          className="flex items-center gap-2 text-xs text-[#4B6358]"
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
              </>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {workflowActions.map((action) => (
                <Button
                  key={action.outcome}
                  type="button"
                  variant={action.outcome === 'rejected' ? 'outline' : 'default'}
                  disabled={updating}
                  onClick={() => handleWorkflowClick(action.outcome)}
                >
                  {action.label ?? WORKFLOW_OUTCOME_LABELS[action.outcome] ?? action.outcome}
                </Button>
              ))}
            </div>
          </div>
        ) : legacyActions.length > 0 ? (
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

        {rollbackPanel}

        {requestActions ? <div className="mt-5 border-t border-[#E2EEE8] pt-5">{requestActions}</div> : null}
      </section>

      {assignmentSection}

      <section className="mt-6 rounded-2xl border border-[#E2EEE8] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#052E1C]">Student documents</h2>
            <p className="mt-1 text-sm text-[#4B6358]">
              Each upload is shown here with its verification status.
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

        {usesAiVerification && !pendingAi && latestDocumentDecision?.summary ? (
          <p className="mt-4 rounded-xl border border-[#D4E5D0] bg-[#F6FAF5] px-4 py-3 text-sm leading-relaxed text-[#334155]">
            <span className="font-semibold text-[#052E1C]">Overall AI review: </span>
            {latestDocumentDecision.summary}
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

                <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)]">
                  <div>
                    {uploaded ? (
                      <InlineDocumentPreview document={uploaded} fetchBlob={fetchDocumentBlob} />
                    ) : (
                      <p className="rounded-xl border border-dashed border-[#FDE68A] bg-[#FFFBEB] px-4 py-10 text-center text-sm text-[#92400E]">
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

      {otherAiDecisions.length > 0 ? (
        <ApplicationAiDecisionsPanel decisions={otherAiDecisions} />
      ) : null}

      {afterDocuments}

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
