import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export function EnrollmentAccordion({ title, count, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-2xl border border-[#E2EEE8] bg-white/90 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-[#F0FAF5]"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-[#052E1C]">{title}</h2>
          {count != null && (
            <p className="mt-0.5 text-xs text-[#4B6358]">
              {count} {count === 1 ? 'item' : 'items'}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {count != null && (
            <span className="rounded-full bg-[#D1FAE5] px-2.5 py-0.5 text-xs font-semibold text-[#0A6640]">
              {count}
            </span>
          )}
          <ChevronDown
            className={cn('h-4 w-4 text-[#4B6358] transition-transform', open && 'rotate-180')}
          />
        </div>
      </button>
      {open && <div className="border-t border-[#E2EEE8] px-5 py-4">{children}</div>}
    </div>
  );
}
