import { Clock } from 'lucide-react';
import { getHandlerLabel } from '@/utils/workflow';

const ACTION_LABELS = {
  approve: 'Approve',
  reject: 'Reject',
  request_correction: 'Request correction',
};

export function WorkflowStepPreview({ step, index }) {
  const actions = step.allowedActions?.length
    ? step.allowedActions
    : step.outcomes?.map((outcome) => outcome.route?.action).filter(Boolean) ?? [];

  return (
    <li className="relative rounded-2xl border border-[#E2EEE8] bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#D1FAE5] text-sm font-semibold text-[#0A6640]">
          {index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-[#052E1C]">{step.name}</h3>
            <span className="rounded-full bg-[#F0FAF5] px-2.5 py-0.5 text-xs font-medium text-[#4B6358]">
              {getHandlerLabel(step.handledBy)}
            </span>
          </div>
          {step.description && (
            <p className="mt-2 text-sm leading-relaxed text-[#4B6358]">{step.description}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#4B6358]">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              SLA: {step.slaValue} {step.slaUnit}
            </span>
            {actions.map((action) => (
              <span
                key={action}
                className="rounded-full bg-[#EFF6FF] px-2.5 py-0.5 font-medium text-[#1D4ED8]"
              >
                {ACTION_LABELS[action] ?? action}
              </span>
            ))}
          </div>
        </div>
      </div>
    </li>
  );
}
