import { Clock } from 'lucide-react';
import { getHandlerLabel } from '@/utils/workflow';

export function WorkflowStepPreview({ step, index }) {
  return (
    <li className="relative rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E8F0ED] text-sm font-semibold text-[#1F4D3F]">
          {index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">{step.name}</h3>
            <span className="rounded-full bg-[#F3F6F5] px-2.5 py-0.5 text-xs font-medium text-muted">
              {getHandlerLabel(step.handledBy)}
            </span>
          </div>
          {step.description && (
            <p className="mt-2 text-sm leading-relaxed text-muted">{step.description}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              SLA: {step.slaValue} {step.slaUnit}
            </span>
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 font-medium text-amber-800">
              Coming soon
            </span>
          </div>
        </div>
      </div>
    </li>
  );
}
