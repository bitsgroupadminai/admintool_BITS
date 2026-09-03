import { Check, Clock3, Sparkles, Undo2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

function formatHandlerLabel(handledBy) {
  if (!handledBy) return 'Staff';
  if (handledBy.type === 'ai') return `AI · ${(handledBy.assignee ?? 'automation').replace(/_/g, ' ')}`;
  if (handledBy.type === 'student') return 'Student';
  return `Staff · ${(handledBy.assignee ?? 'general').replace(/_/g, ' ')}`;
}

export function WorkflowFunnel({
  steps = [],
  currentStepName,
  statusLabel,
  onRollbackToStep,
  rollbackLoading = false,
  children,
}) {
  if (!steps.length) return null;

  return (
    <section className="rounded-2xl border border-[#E2EEE8] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-[#052E1C]">Workflow</h2>
          <p className="mt-1 text-sm text-[#4B6358]">
            {currentStepName ? (
              <>
                Current stage:{' '}
                <span className="font-semibold text-[#052E1C]">{currentStepName}</span>
              </>
            ) : (
              'Configured steps for this service option.'
            )}
          </p>
        </div>
        {statusLabel ? (
          <Badge variant="default">{statusLabel}</Badge>
        ) : null}
      </div>

      <ol className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {steps.map((step, index) => {
          const isCurrent = step.state === 'current';
          const isComplete = step.state === 'complete';
          const canSendBack = Boolean(onRollbackToStep) && isComplete;
          return (
            <li
              key={step.stepId}
              className={cn(
                'relative min-w-[160px] flex-1 rounded-xl border px-4 py-3',
                isCurrent && 'border-[#6EE7B7] bg-[#F0FAF5] shadow-[0_0_0_3px_rgba(110,231,183,0.18)]',
                isComplete && 'border-[#C4E8D4] bg-[#F9FCFB]',
                !isCurrent && !isComplete && 'border-[#E2EEE8] bg-white',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                    isComplete && 'bg-[#D1FAE5] text-[#0A6640]',
                    isCurrent && 'bg-[#0A6640] text-white',
                    !isCurrent && !isComplete && 'bg-[#F3F4F6] text-[#9CA3AF]',
                  )}
                >
                  {isComplete ? (
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                  ) : isCurrent ? (
                    <Clock3 className="h-3.5 w-3.5" />
                  ) : (
                    index + 1
                  )}
                </span>
                {step.handledBy?.type === 'ai' ? (
                  <Sparkles className="h-3.5 w-3.5 text-[#10B981]" />
                ) : null}
              </div>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#10B981]">
                Step {step.order}
              </p>
              <p className="mt-1 text-sm font-semibold text-[#052E1C]">{step.name}</p>
              <p className="mt-1 text-xs text-[#6B7280]">{formatHandlerLabel(step.handledBy)}</p>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-[#4B6358]">
                {isComplete ? 'Done' : isCurrent ? 'Current' : 'Upcoming'}
              </p>
              {canSendBack ? (
                <button
                  type="button"
                  disabled={rollbackLoading}
                  onClick={() => onRollbackToStep(step.stepId)}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#0A6640] hover:underline disabled:opacity-60"
                >
                  <Undo2 className="h-3 w-3" />
                  Send back here
                </button>
              ) : null}
            </li>
          );
        })}
      </ol>
      {children}
    </section>
  );
}
