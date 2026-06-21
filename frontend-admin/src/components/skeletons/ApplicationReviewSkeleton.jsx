import { Skeleton } from './Skeleton';
import { SectionCardSkeleton, SectionHeaderSkeleton } from './primitives';

/**
 * @param {{ showAssignSection?: boolean }} props
 */
export function ApplicationReviewSkeleton({ showAssignSection = false }) {
  return (
    <div className="mt-5 space-y-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-4">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-9 w-64 max-w-full" />
          <Skeleton className="h-4 w-48 max-w-full" />
          <div className="grid gap-2 sm:grid-cols-2">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-10 w-44 rounded-xl" />
            <Skeleton className="h-10 w-40 rounded-xl" />
          </div>
        </div>

        <div className="w-full rounded-2xl border border-[#C4E8D4] bg-white/85 p-5 shadow-sm lg:w-80">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="mt-3 h-7 w-28 rounded-full" />
          <Skeleton className="mt-3 h-3 w-full" />
          <Skeleton className="mt-3 h-3 w-4/5" />
          <Skeleton className="mt-3 h-3 w-3/5" />
          <div className="mt-4 flex flex-wrap gap-2">
            <Skeleton className="h-9 w-24 rounded-lg" />
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        </div>
      </div>

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
        <div className="space-y-2">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="rounded-xl border border-[#E2EEE8] bg-[#F9FCFB] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </SectionCardSkeleton>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <SectionCardSkeleton className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-6 w-44" />
              <Skeleton className="h-4 w-56 max-w-full" />
            </div>
            <Skeleton className="h-7 w-32 rounded-full" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="rounded-xl border border-[#E2EEE8] bg-[#F9FCFB] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-9 w-20 rounded-lg" />
                    <Skeleton className="h-9 w-24 rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCardSkeleton>

        <aside className="space-y-4">
          <SectionCardSkeleton className="space-y-3">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </SectionCardSkeleton>
          <div className="rounded-2xl border border-[#C4E8D4] bg-[#F0FAF5] p-5">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-3/4" />
          </div>
        </aside>
      </div>
    </div>
  );
}
