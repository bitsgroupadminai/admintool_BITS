import { cn } from '@/lib/utils';
import { Skeleton } from './Skeleton';

export function SectionCardSkeleton({ className, children }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-[#E2EEE8] bg-white p-5 shadow-sm sm:p-6',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function StatCardSkeleton({ className }) {
  return (
    <div className={cn('rounded-2xl border border-[#C4E8D4] bg-[#F0FAF5] p-5', className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-5 rounded" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-12" />
        </div>
      </div>
    </div>
  );
}

export function PortalCardSkeleton() {
  return (
    <div className="rounded-2xl border border-[#E2EEE8] bg-white p-6 shadow-[0_4px_24px_rgba(10,102,64,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-10 w-10 rounded-lg" />
      </div>
      <Skeleton className="mt-4 h-6 w-3/4" />
      <Skeleton className="mt-2 h-4 w-full" />
      <Skeleton className="mt-2 h-4 w-5/6" />
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-12 rounded-xl" />
      </div>
      <Skeleton className="mt-5 h-4 w-28" />
    </div>
  );
}

export function RequestCardSkeleton() {
  return (
    <div className="rounded-2xl border border-[#E2EEE8] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-48 max-w-full" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-4 w-28" />
    </div>
  );
}
