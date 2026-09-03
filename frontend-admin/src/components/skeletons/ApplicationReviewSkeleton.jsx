import { Skeleton } from './Skeleton';
import { SectionCardSkeleton } from './primitives';

/**
 * @param {{ showAssignSection?: boolean }} props
 */
export function ApplicationReviewSkeleton({ showAssignSection = false }) {
  return (
    <div className="mt-5 space-y-6">
      <SectionCardSkeleton className="space-y-4">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-9 w-64 max-w-full" />
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((item) => (
            <Skeleton key={item} className="h-14 min-w-[140px] flex-1 rounded-xl" />
          ))}
        </div>
      </SectionCardSkeleton>

      <SectionCardSkeleton className="space-y-4">
        <Skeleton className="h-5 w-24" />
        <div className="flex gap-2 overflow-hidden">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-28 min-w-[160px] flex-1 rounded-xl" />
          ))}
        </div>
      </SectionCardSkeleton>

      <SectionCardSkeleton className="space-y-4">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-full max-w-md" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 w-24 rounded-xl" />
        </div>
      </SectionCardSkeleton>

      {showAssignSection ? (
        <SectionCardSkeleton className="space-y-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-full max-w-md" />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Skeleton className="h-10 min-w-0 flex-1 rounded-xl" />
            <Skeleton className="h-10 w-36 rounded-lg" />
          </div>
        </SectionCardSkeleton>
      ) : null}

      <SectionCardSkeleton className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-4 w-56 max-w-full" />
          </div>
          <Skeleton className="h-7 w-32 rounded-full" />
        </div>
        {[1, 2].map((item) => (
          <div key={item} className="rounded-2xl border border-[#E2EEE8] bg-[#F9FCFB] p-4">
            <Skeleton className="h-4 w-40" />
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <Skeleton className="h-64 rounded-xl" />
              <Skeleton className="h-40 rounded-xl" />
            </div>
          </div>
        ))}
      </SectionCardSkeleton>

      <SectionCardSkeleton className="space-y-3">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </SectionCardSkeleton>
    </div>
  );
}
