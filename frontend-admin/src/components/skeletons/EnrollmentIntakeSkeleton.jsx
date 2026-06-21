import { Skeleton } from './Skeleton';
import { SectionCardSkeleton, SectionHeaderSkeleton } from './primitives';

export function AdminEnrollmentIntakeSkeleton() {
  return (
    <div className="mt-8 space-y-6">
      <SectionCardSkeleton className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-8 w-52 max-w-full" />
            <Skeleton className="h-4 w-44 max-w-full" />
          </div>
          <Skeleton className="h-7 w-40 rounded-full" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-14 rounded-xl" />
          <Skeleton className="h-14 rounded-xl" />
          <Skeleton className="h-14 rounded-xl" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      </SectionCardSkeleton>

      <SectionCardSkeleton className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full max-w-lg" />
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-10 w-40 rounded-lg" />
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>
      </SectionCardSkeleton>
    </div>
  );
}

export function IntakeDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#E2EEE8] bg-gradient-to-br from-white to-[#F9FCFB] p-5 shadow-sm sm:p-6 lg:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <Skeleton className="h-16 w-16 shrink-0 rounded-2xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-8 w-56 max-w-full" />
              <Skeleton className="h-4 w-44 max-w-full" />
            </div>
          </div>
          <Skeleton className="h-7 w-36 rounded-full" />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <SectionCardSkeleton className="space-y-5">
          <SectionHeaderSkeleton />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
          <Skeleton className="h-16 w-full rounded-xl" />
        </SectionCardSkeleton>

        <SectionCardSkeleton className="space-y-5">
          <SectionHeaderSkeleton />
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
        </SectionCardSkeleton>
      </div>
    </div>
  );
}
