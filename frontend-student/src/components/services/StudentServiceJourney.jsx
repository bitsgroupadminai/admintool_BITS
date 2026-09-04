import { useEffect, useRef } from 'react';
import { Check, Circle, Clock3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildStudentServiceSteps, isDocumentPrerequisiteStep } from '@/utils/studentJourney';
import { isFeePaymentStep } from '@/utils/payment';
import { StepDocumentsAccordion } from '@/components/services/StepDocumentsAccordion';
import { PaymentPanel } from '@/components/services/PaymentPanel';

function getScrollParent(node) {
  let parent = node?.parentElement;
  while (parent) {
    const { overflowY } = window.getComputedStyle(parent);
    if (
      (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
      parent.scrollHeight > parent.clientHeight + 1
    ) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return document.scrollingElement;
}

function scrollElementToTop(element, { behavior = 'smooth' } = {}) {
  const scroller = getScrollParent(element);
  const margin = Number.parseFloat(window.getComputedStyle(element).scrollMarginTop) || 0;
  if (!scroller) {
    element.scrollIntoView({ block: 'start', behavior });
    return;
  }
  const nextTop =
    scroller.scrollTop +
    (element.getBoundingClientRect().top - scroller.getBoundingClientRect().top) -
    margin;
  scroller.scrollTo({ top: Math.max(0, nextTop), behavior });
}

const stateStyles = {
  complete: {
    circle: 'bg-[#D1FAE5] text-[#0A6640] border-[#B6DFC8]',
    title: 'text-[#052E1C]',
  },
  current: {
    circle: 'bg-[#0A6640] text-white border-[#0A6640] shadow-[0_0_0_4px_rgba(110,231,183,0.25)]',
    title: 'text-[#052E1C]',
  },
  upcoming: {
    circle: 'bg-white text-[#9CA3AF] border-[#E2EEE8]',
    title: 'text-[#6B7280]',
  },
};

export function StudentServiceJourney({
  offering,
  application,
  serviceId,
  offeringId,
  onUploadDocument,
  onRemoveDocument,
  onRefresh,
  afterDocuments,
}) {
  const hasReviewWorkflow = Boolean(
    application?.workflow?.steps?.length || offering?.workflowSteps?.length,
  );
  const steps = buildStudentServiceSteps(offering, application);
  const currentIndex = steps.findIndex((step) => step.state === 'current');
  const currentStepId = currentIndex >= 0 ? steps[currentIndex]?.id : null;
  const currentStepRef = useRef(null);

  useEffect(() => {
    if (currentIndex < 1) return undefined;

    const timer = window.setTimeout(() => {
      if (currentStepRef.current) {
        scrollElementToTop(currentStepRef.current, { behavior: 'smooth' });
      }
    }, 80);
    return () => window.clearTimeout(timer);
  }, [currentIndex, currentStepId, application?.id]);

  return (
    <ol className="space-y-4">
      {steps.map((step, index) => {
        const styles = stateStyles[step.state] ?? stateStyles.upcoming;
        const showDocuments = isDocumentPrerequisiteStep(step, index, hasReviewWorkflow);
        const showPayment = isFeePaymentStep(step, offering, application);
        const isCurrent = step.state === 'current';

        return (
          <li
            key={step.id}
            ref={isCurrent ? currentStepRef : undefined}
            id={`student-step-${step.id}`}
            aria-current={isCurrent ? 'step' : undefined}
            className={cn(
              'relative scroll-mt-4 overflow-hidden rounded-2xl border bg-white p-5 shadow-sm',
              isCurrent
                ? 'border-[#6EE7B7] bg-[#F0FAF5] shadow-[0_0_0_3px_rgba(110,231,183,0.18)]'
                : 'border-[#E2EEE8]',
            )}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute right-4 top-3 text-4xl font-bold leading-none text-[#E8F5EE]"
            >
              {String(index + 1).padStart(2, '0')}
            </span>

            <div className="relative flex items-start gap-4 pr-12">
              <div
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold',
                  styles.circle,
                )}
              >
                {step.state === 'complete' ? (
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                ) : step.state === 'current' ? (
                  <Clock3 className="h-4 w-4" strokeWidth={2.5} />
                ) : (
                  <Circle className="h-3.5 w-3.5" strokeWidth={2.5} />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#10B981]">
                    Your step {index + 1}
                  </p>
                  {isCurrent ? (
                    <span className="rounded-full bg-[#0A6640] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white">
                      You are here
                    </span>
                  ) : null}
                </div>
                <h4 className={cn('mt-1 text-base font-bold', styles.title)}>{step.title}</h4>
                {step.waitingOn ? (
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-[#0A6640]">
                    {step.waitingOn}
                  </p>
                ) : null}
                <p className="mt-2 text-sm leading-relaxed text-[#4B6358]">{step.description}</p>
                {showDocuments ? (
                  <StepDocumentsAccordion
                    offering={offering}
                    application={application}
                    serviceId={serviceId}
                    offeringId={offeringId}
                    onUpload={onUploadDocument}
                    onRemove={onRemoveDocument}
                    onRefresh={onRefresh}
                  />
                ) : null}
                {showDocuments && afterDocuments ? afterDocuments : null}
                {showPayment ? (
                  <div className="mt-4">
                    <PaymentPanel
                      serviceId={serviceId}
                      offeringId={offeringId}
                      offering={offering}
                      application={application}
                      onPaid={onRefresh}
                      embedInStep
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
