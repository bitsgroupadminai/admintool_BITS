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

export function SectionHeaderSkeleton() {
  return (
    <div className="flex items-start gap-3">
      <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-full max-w-sm" />
      </div>
    </div>
  );
}

export function StatCardSkeleton({ className }) {
  return (
    <div className={cn('relative overflow-hidden rounded-2xl border border-[#E2EEE8] p-5', className)}>
      <Skeleton className="absolute right-4 top-3 h-10 w-12 rounded-lg opacity-40" />
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-9 w-16" />
      <Skeleton className="mt-2 h-3 w-32" />
      <div className="mt-4 flex justify-end">
        <Skeleton className="h-11 w-11 rounded-xl" />
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
      <Skeleton className="mt-5 h-4 w-28" />
    </div>
  );
}

export function ServiceListItemSkeleton() {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-[#C4E8D4] bg-white/85 p-4 shadow-sm sm:gap-4 sm:p-5">
      <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-5 w-48 max-w-full" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="hidden h-9 w-9 rounded-lg sm:block" />
    </div>
  );
}
