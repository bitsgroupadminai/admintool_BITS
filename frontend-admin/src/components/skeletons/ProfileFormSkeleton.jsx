import { Skeleton } from './Skeleton';
import { SectionCardSkeleton, SectionHeaderSkeleton } from './primitives';

export function ProfileFormSkeleton() {
  return (
    <div className="space-y-6">
      <SectionCardSkeleton>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-4 h-24 w-24 rounded-full" />
        <Skeleton className="mt-4 h-4 w-48" />
      </SectionCardSkeleton>
      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCardSkeleton className="space-y-4">
          <SectionHeaderSkeleton />
          <div className="space-y-3">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </SectionCardSkeleton>
        <SectionCardSkeleton className="space-y-4">
          <SectionHeaderSkeleton />
          <div className="space-y-3">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </SectionCardSkeleton>
      </div>
      <Skeleton className="h-16 w-full rounded-2xl" />
    </div>
  );
}

export function SetupFormSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full rounded-xl" />
      <Skeleton className="h-10 w-full rounded-xl" />
      <Skeleton className="h-10 w-32 rounded-xl" />
    </div>
  );
}

export function SetupSummarySkeleton() {
  return (
    <div className="space-y-4 rounded-xl border border-[#E2EEE8] bg-[#F9FCFB] p-4">
      {[1, 2, 3].map((item) => (
        <div key={item} className="flex justify-between gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
      ))}
    </div>
  );
}
