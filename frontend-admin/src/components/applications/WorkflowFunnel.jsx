import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Clock3, Info, Sparkles, Undo2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function formatHandlerLabel(handledBy) {
  if (!handledBy) return 'Staff';
  if (handledBy.type === 'ai') return `AI · ${(handledBy.assignee ?? 'automation').replace(/_/g, ' ')}`;
  if (handledBy.type === 'student') return 'Student';
  return `Staff · ${(handledBy.assignee ?? 'general').replace(/_/g, ' ')}`;
}

function StepInfoTip({ stepName, description, guidance }) {
  const details = [
    description?.trim() ? { heading: 'About this step', text: description.trim() } : null,
    guidance?.trim() && guidance.trim() !== description?.trim()
      ? { heading: 'What you do', text: guidance.trim() }
      : null,
  ].filter(Boolean);

  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [coords, setCoords] = useState(null);
  const buttonRef = useRef(null);
  const hideTimer = useRef(null);
  const panelId = useId();

  const place = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 260;
    const left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12);
    setCoords({ top: rect.bottom + 8, left, width });
  };

  const show = () => {
    window.clearTimeout(hideTimer.current);
    place();
    setOpen(true);
  };

  const hide = () => {
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (!pinned) setOpen(false);
    }, 120);
  };

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => {
      if (buttonRef.current?.contains(event.target)) return;
      const panel = document.getElementById(panelId);
      if (panel?.contains(event.target)) return;
      setPinned(false);
      setOpen(false);
    };
    window.addEventListener('pointerdown', onPointer);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, panelId]);

  if (!details.length) return null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`About ${stepName}`}
        aria-expanded={open}
        aria-controls={panelId}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (open && pinned) {
            setPinned(false);
            setOpen(false);
            return;
          }
          setPinned(true);
          show();
        }}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[#6B7280] hover:bg-[#E8F5EE] hover:text-[#0A6640]"
      >
        <Info className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
      {open && coords
        ? createPortal(
            <div
              id={panelId}
              role="tooltip"
              onMouseEnter={show}
              onMouseLeave={hide}
              style={{ top: coords.top, left: coords.left, width: coords.width }}
              className="fixed z-[80] rounded-xl border border-[#C4E8D4] bg-white p-3 text-left shadow-[0_8px_24px_rgba(5,46,28,0.12)]"
            >
              <p className="text-xs font-semibold text-[#052E1C]">{stepName}</p>
              {details.map((item) => (
                <div key={item.heading} className="mt-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#0A6640]">
                    {item.heading}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-[#4B6358]">{item.text}</p>
                </div>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export function WorkflowFunnel({
  steps = [],
  currentStepName,
  statusLabel,
  onRollbackToStep,
  rollbackLoading = false,
  currentStepAction = null,
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
          const guidance = isCurrent
            ? currentStepAction?.guidance
            : step.staffInstructions || step.adminInstructions || '';
          return (
            <li
              key={step.stepId}
              className={cn(
                'relative flex min-w-[160px] flex-1 flex-col rounded-xl border px-4 py-3',
                isCurrent &&
                  'min-w-[260px] flex-[1.45] border-[#6EE7B7] bg-[#F0FAF5] shadow-[0_0_0_3px_rgba(110,231,183,0.18)]',
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
                <div className="flex items-center gap-0.5">
                  {step.handledBy?.type === 'ai' ? (
                    <Sparkles className="h-3.5 w-3.5 text-[#10B981]" />
                  ) : null}
                  <StepInfoTip
                    stepName={step.name}
                    description={step.description}
                    guidance={guidance}
                  />
                </div>
              </div>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#10B981]">
                Step {step.order}
              </p>
              <p className="mt-1 text-sm font-semibold leading-snug text-[#052E1C]">{step.name}</p>
              <p className="mt-1 text-xs text-[#6B7280]">{formatHandlerLabel(step.handledBy)}</p>
              {isCurrent && currentStepAction?.approveLabel ? (
                <div className="mt-3 space-y-2">
                  <Button
                    type="button"
                    size="sm"
                    className="h-auto min-h-9 w-full whitespace-normal py-2 text-left"
                    disabled={currentStepAction.updating}
                    onClick={currentStepAction.onApprove}
                  >
                    {currentStepAction.approveLabel}
                  </Button>
                  {currentStepAction.rejectLabel ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-auto min-h-9 w-full whitespace-normal py-2"
                      disabled={currentStepAction.updating}
                      onClick={currentStepAction.onReject}
                    >
                      {currentStepAction.rejectLabel}
                    </Button>
                  ) : null}
                </div>
              ) : null}
              <div className="mt-auto pt-3">
                {isComplete ? (
                  <p className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0A6640]">
                    <Check className="h-3 w-3" strokeWidth={2.5} />
                    Completed
                  </p>
                ) : null}
                {canSendBack ? (
                  <button
                    type="button"
                    disabled={rollbackLoading}
                    onClick={() => onRollbackToStep(step.stepId)}
                    className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#0A6640] hover:underline disabled:opacity-60"
                  >
                    <Undo2 className="h-3 w-3" />
                    Send back here
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      {children}
    </section>
  );
}
