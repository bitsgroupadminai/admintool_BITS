import { CheckCircle2 } from 'lucide-react';
import { formatEligibilityRule } from '@/utils/eligibility';

export function EligibilityList({ rules }) {
  if (!rules?.length) {
    return <p className="text-sm text-[#4B6358]">Eligibility details will be shared soon.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-[#4B6358]">All of the following must be met to apply.</p>
      <ul className="space-y-3">
        {rules.map((rule) => (
          <li key={`${rule.field}-${rule.operator}-${rule.value}`} className="flex gap-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0A6640]" />
            <span className="text-sm leading-relaxed text-[#052E1C]">
              {formatEligibilityRule(rule)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
