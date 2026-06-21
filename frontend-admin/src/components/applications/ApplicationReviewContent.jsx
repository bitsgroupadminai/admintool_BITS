import { useState } from 'react';
import { Download, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SlaBreachActions } from '@/components/applications/SlaBreachActions';
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

function formatHandlerLabel(handledBy) {
  if (!handledBy) return 'Staff';
  if (handledBy.type === 'ai') return `AI · ${handledBy.assignee?.replace(/_/g, ' ') ?? 'automation'}`;
  if (handledBy.type === 'student') return 'Student';
  return `Staff · ${handledBy.assignee?.replace(/_/g, ' ') ?? 'general'}`;
}

export function ApplicationReviewContent({
  application,
  updating,
  onStatusUpdate,
  onWorkflowAction,
  onPreview,
  onDownload,
  assignSection = null,
  onSlaAction = null,
  slaActionLoading = false,
}) {
  const [note, setNote] = useState('');
  const [selectedCorrectionDocs, setSelectedCorrectionDocs] = useState([]);
  const uploadedMap = new Map(
    (application?.documents ?? []).map((document) => [document.requirementId, document]),
  );
  const workflow = application?.workflow;
  const workflowActions = workflow?.availableActions ?? [];
  const legacyActions = workflowActions.length ? [] : getApplicationStatusActions(application?.status);

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

  return (
    <>
      <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#10B981]">
            Request review
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#052E1C]">
            {application.applicantName}
          </h1>
          <p className="mt-2 text-sm text-[#4B6358]">{application.applicantEmail}</p>
          {application.applicantDetails?.length > 0 ? (
            <dl className="mt-4 grid gap-2 sm:grid-cols-2">
              {application.applicantDetails.map((item) => (
                <div
                  key={item.fieldKey}
                  className="rounded-xl border border-[#E2EEE8] bg-white px-3 py-2 text-sm"
                >
                  <dt className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                    {item.label}
                  </dt>
                  <dd className="mt-1 font-medium text-[#052E1C]">{String(item.value ?? '—')}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2 text-sm text-[#4B6358]">
            <span className="rounded-xl border border-[#E2EEE8] bg-white px-3 py-2">
              <span className="font-semibold text-[#052E1C]">Service:</span> {application.serviceName}
            </span>
            <span className="rounded-xl border border-[#E2EEE8] bg-white px-3 py-2">
              <span className="font-semibold text-[#052E1C]">Option:</span> {application.offeringName}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-[#C4E8D4] bg-white/85 p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#10B981]">Status</p>
          <div className="mt-3">
            <Badge variant={APPLICATION_STATUS_BADGE_VARIANT[application.status] ?? 'default'}>
              {APPLICATION_STATUS_LABELS[application.status] ?? application.status}
            </Badge>
          </div>
          {workflow?.currentStep ? (
            <p className="mt-3 text-xs text-[#4B6358]">
              Current step:{' '}
              <span className="font-semibold text-[#052E1C]">{workflow.currentStep.name}</span>
            </p>
          ) : null}
          <p className="mt-3 text-xs text-[#4B6358]">
            Updated {new Date(application.updatedAt).toLocaleString()}
          </p>
          {application.assignedTo ? (
            <p className="mt-3 text-xs text-[#4B6358]">
              Assigned to <span className="font-semibold text-[#052E1C]">{application.assignedTo.name}</span>
            </p>
          ) : null}
          {application.currentStepDueAt ? (
            <p className={`mt-3 text-xs ${application.slaBreached || application.slaOverdue ? 'font-semibold text-[#B91C1C]' : 'text-[#4B6358]'}`}>
              SLA due {new Date(application.currentStepDueAt).toLocaleString()}
              {application.slaBreached || application.slaOverdue ? ' · overdue' : ''}
            </p>
          ) : null}

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
                      <p className="text-xs font-bold text-[#052E1C]">
                        Which documents need fixing?
                      </p>
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
        </div>
      </div>

      {assignSection}

      {workflow?.steps?.length ? (
        <section className="mt-8 rounded-2xl border border-[#E2EEE8] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#052E1C]">Workflow progress</h2>
          <p className="mt-1 text-sm text-[#4B6358]">
            Actions follow the configured workflow for this service option.
          </p>
          <ol className="mt-5 space-y-3">
            {workflow.steps.map((step) => (
              <li
                key={step.stepId}
                className={`rounded-xl border p-4 ${
                  step.state === 'current'
                    ? 'border-[#6EE7B7] bg-[#F0FAF5]'
                    : step.state === 'complete'
                      ? 'border-[#C4E8D4] bg-[#F9FCFB]'
                      : 'border-[#E2EEE8] bg-white'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#10B981]">
                      Step {step.order}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#052E1C]">{step.name}</p>
                    <p className="mt-1 text-xs text-[#4B6358]">{formatHandlerLabel(step.handledBy)}</p>
                  </div>
                  <Badge variant={step.state === 'complete' ? 'active' : step.state === 'current' ? 'default' : 'draft'}>
                    {step.state === 'complete' ? 'Done' : step.state === 'current' ? 'Current' : 'Upcoming'}
                  </Badge>
                </div>
              </li>
            ))}
          </ol>

          {(workflow.history ?? []).length > 0 ? (
            <div className="mt-6 border-t border-[#E2EEE8] pt-5">
              <h3 className="text-sm font-bold text-[#052E1C]">Action history</h3>
              <ul className="mt-3 space-y-2 text-sm text-[#4B6358]">
                {workflow.history.map((entry, index) => (
                  <li key={`${entry.stepId}-${entry.createdAt}-${index}`} className="rounded-lg bg-[#F9FCFB] px-3 py-2">
                    <span className="font-semibold text-[#052E1C]">{entry.stepName}</span>
                    {' · '}
                    {entry.outcome.replace(/_/g, ' ')} by {entry.actedByName}
                    {entry.note ? ` — ${entry.note}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <section className="rounded-2xl border border-[#E2EEE8] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[#052E1C]">Uploaded documents</h2>
              <p className="mt-1 text-sm text-[#4B6358]">Review each file submitted by the student.</p>
            </div>
            <span className="rounded-full bg-[#F0FAF5] px-3 py-1 text-xs font-semibold text-[#0A6640]">
              {application.uploadedRequiredCount ?? 0} / {application.requiredDocumentCount ?? 0} required
              uploaded
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {(application.documentRequirements ?? []).map((requirement) => {
              const uploaded = uploadedMap.get(requirement.id);
              return (
                <div
                  key={requirement.id}
                  className="rounded-xl border border-[#E2EEE8] bg-[#F9FCFB] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#052E1C]">{requirement.name}</p>
                      <p className="mt-1 text-xs text-[#4B6358]">
                        {requirement.required !== false ? 'Required' : 'Optional'}
                      </p>
                      {uploaded ? (
                        <p className="mt-2 text-xs font-medium text-[#0A6640]">
                          {uploaded.originalName} ({formatFileSize(uploaded.sizeBytes)})
                        </p>
                      ) : (
                        <p className="mt-2 text-xs text-[#92400E]">Missing upload</p>
                      )}
                    </div>

                    {uploaded ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => onPreview(uploaded)}
                          className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#C4E8D4] bg-white px-3 text-xs font-semibold text-[#0A6640]"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => onDownload(uploaded)}
                          className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#C4E8D4] bg-white px-3 text-xs font-semibold text-[#0A6640]"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-[#E2EEE8] bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-[#052E1C]">Review checklist</h3>
            <ul className="mt-3 space-y-2 text-sm text-[#4B6358]">
              <li>Confirm every required document is uploaded.</li>
              <li>Open previews for PDFs and images before approving.</li>
              <li>Use workflow actions to move the request to the next step.</li>
            </ul>
          </div>

          {(application.missingRequiredDocuments ?? []).length > 0 ? (
            <div className="rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-5">
              <h3 className="text-sm font-bold text-[#92400E]">Missing required documents</h3>
              <ul className="mt-2 space-y-1 text-sm text-[#92400E]">
                {application.missingRequiredDocuments.map((item) => (
                  <li key={item.id}>{item.name}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#C4E8D4] bg-[#F0FAF5] p-5">
              <h3 className="text-sm font-bold text-[#0A6640]">Documents complete</h3>
              <p className="mt-2 text-sm text-[#4B6358]">
                All required documents were uploaded before submission.
              </p>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
