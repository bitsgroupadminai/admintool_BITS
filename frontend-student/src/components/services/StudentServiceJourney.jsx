import { Check, Circle, Clock3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildStudentServiceSteps } from '@/utils/studentJourney';

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

export function StudentServiceJourney({ offering, application }) {
  const steps = buildStudentServiceSteps(offering, application);

  return (
    <ol className="space-y-4">
      {steps.map((step, index) => {
        const styles = stateStyles[step.state] ?? stateStyles.upcoming;
        return (
          <li
            key={step.id}
            className="relative overflow-hidden rounded-2xl border border-[#E2EEE8] bg-white p-5 shadow-sm"
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
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#10B981]">
                  Your step {index + 1}
                </p>
                <h4 className={cn('mt-1 text-base font-bold', styles.title)}>{step.title}</h4>
                <p className="mt-2 text-sm leading-relaxed text-[#4B6358]">{step.description}</p>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
