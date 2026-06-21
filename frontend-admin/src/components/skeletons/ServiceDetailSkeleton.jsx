import { Skeleton } from './Skeleton';
import { SectionCardSkeleton } from './primitives';

export function AdminServiceDetailSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3 w-24" />
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-9 w-56 max-w-full" />
            <Skeleton className="h-7 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-10 w-36 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      </div>

      <Skeleton className="h-24 w-full rounded-2xl" />

      {[1, 2, 3].map((step) => (
        <SectionCardSkeleton key={step} className="overflow-hidden p-0">
          <div className="flex items-center gap-3 border-b border-[#E2EEE8] px-7 py-5">
            <Skeleton className="h-7 w-7 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-full max-w-md" />
            </div>
          </div>
          <div className="space-y-4 px-7 py-6">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl border-2 border-dashed" />
          </div>
        </SectionCardSkeleton>
      ))}
    </div>
  );
}

export function OfferingConfigureSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-32" />
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((item) => (
          <Skeleton key={item} className="h-10 w-28 rounded-xl" />
        ))}
      </div>
      <SectionCardSkeleton className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-full max-w-lg" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="flex justify-end gap-2 border-t border-[#E2EEE8] pt-4">
          <Skeleton className="h-10 w-24 rounded-lg" />
          <Skeleton className="h-10 w-36 rounded-lg" />
        </div>
      </SectionCardSkeleton>
    </div>
  );
}
