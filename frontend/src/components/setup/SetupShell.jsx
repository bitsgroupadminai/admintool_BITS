import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = [
  { id: 'institute', label: 'Institute' },
  { id: 'staff', label: 'Staff' },
  { id: 'review', label: 'Review' },
];

export function SetupShell({ currentStep, children }) {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-10 space-y-2">
          <p className="text-sm font-medium text-sage">Institute setup</p>
          <h1 className="text-2xl font-semibold tracking-tight">Configure your workspace</h1>
          <p className="text-sm text-muted">
            Complete these steps before staff and students can use the system.
          </p>
        </div>

        <ol className="mb-10 flex items-center gap-2">
          {STEPS.map((step, index) => {
            const done = index < currentIndex;
            const active = index === currentIndex;
            return (
              <li key={step.id} className="flex flex-1 items-center gap-2">
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-medium',
                    done && 'border-sage bg-sage text-primary-foreground',
                    active && 'border-sage text-forest',
                    !done && !active && 'border-border text-muted',
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                <span
                  className={cn(
                    'hidden text-sm sm:inline',
                    active ? 'font-medium text-foreground' : 'text-muted',
                  )}
                >
                  {step.label}
                </span>
                {index < STEPS.length - 1 && (
                  <div className="mx-2 h-px flex-1 bg-border" />
                )}
              </li>
            );
          })}
        </ol>

        {children}
      </div>
    </div>
  );
}
