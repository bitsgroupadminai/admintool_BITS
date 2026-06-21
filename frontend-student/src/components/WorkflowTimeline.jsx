import { Clock, UserRound } from 'lucide-react';
import { formatStepTiming } from '@/utils/offering';
import { getHandlerLabel } from '@/utils/workflow';

export function WorkflowTimeline({ steps }) {
  if (!steps?.length) {
    return <p className="text-sm text-[#4B6358]">The institute has not shared the steps yet.</p>;
  }

  return (
    <ol className="space-y-4">
      {steps.map((step, index) => (
        <WorkflowStepPreview key={step.stepId ?? index} step={step} index={index} />
      ))}
    </ol>
  );
}

function WorkflowStepPreview({ step, index }) {
  return (
    <li className="relative overflow-hidden rounded-2xl border border-[#E2EEE8] bg-white p-5 shadow-sm">
      <span
        aria-hidden
        className="pointer-events-none absolute right-4 top-3 text-4xl font-bold leading-none text-[#E8F5EE]"
      >
        {String(index + 1).padStart(2, '0')}
      </span>

      <div className="relative flex items-start gap-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#D1FAE5] text-sm font-bold text-[#0A6640]">
          {index + 1}
        </div>
        <div className="min-w-0 flex-1 pr-10">
          <h3 className="text-base font-bold text-[#052E1C]">{step.name}</h3>
          {step.description && (
            <p className="mt-2 text-sm leading-relaxed text-[#4B6358]">{step.description}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#4B6358]">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#F0FAF5] px-2.5 py-1 font-medium text-[#0A6640]">
              <UserRound className="h-3.5 w-3.5" />
              {getHandlerLabel(step.handledBy)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#F9FCFB] px-2.5 py-1 font-medium">
              <Clock className="h-3.5 w-3.5 text-[#0A6640]" />
              {formatStepTiming(step)}
            </span>
          </div>
        </div>
      </div>
    </li>
  );
}
