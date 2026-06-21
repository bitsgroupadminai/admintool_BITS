import { Clock3, UserRoundCheck } from 'lucide-react';
import { formatStepTiming } from '@/utils/offering';
import { getHandlerLabel } from '@/utils/workflow';

export function EnrollmentProcessTimeline({ steps }) {
  if (!steps?.length) {
    return <p className="text-sm text-[#4B6358]">Enrollment process details will be shared soon.</p>;
  }

  const sorted = [...steps].sort((a, b) => a.order - b.order);

  return (
    <ol className="space-y-0">
      {sorted.map((step, index) => (
        <li key={step.stepId} className="relative flex gap-4 pb-6 last:pb-0">
          {index < sorted.length - 1 && (
            <span
              className="absolute left-[15px] top-8 h-[calc(100%-1rem)] w-px bg-[#E2EEE8]"
              aria-hidden
            />
          )}
          <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#D1FAE5] text-sm font-semibold text-[#0A6640]">
            {index + 1}
          </div>
          <div className="min-w-0 pt-0.5">
            <h3 className="text-sm font-semibold text-[#052E1C]">{step.name}</h3>
            {step.description && (
              <p className="mt-1 text-sm leading-relaxed text-[#4B6358]">{step.description}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#4B6358]">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#F0FAF5] px-2.5 py-1 font-medium">
                <UserRoundCheck className="h-3 w-3 text-[#0A6640]" />
                {getHandlerLabel(step.handledBy)}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#F9FCFB] px-2.5 py-1 font-medium">
                <Clock3 className="h-3 w-3 text-[#0A6640]" />
                {formatStepTiming(step)}
              </span>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
