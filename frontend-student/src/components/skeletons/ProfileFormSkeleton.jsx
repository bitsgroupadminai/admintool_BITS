import { Skeleton } from './Skeleton';
import { PortalCardSkeleton, SectionCardSkeleton } from './primitives';

export function ProfileFormSkeleton() {
  return (
    <div className="space-y-6">
      <SectionCardSkeleton>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-4 h-24 w-24 rounded-full" />
        <Skeleton className="mt-4 h-4 w-48" />
      </SectionCardSkeleton>
      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCardSkeleton className="space-y-3">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </SectionCardSkeleton>
        <SectionCardSkeleton className="space-y-3">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </SectionCardSkeleton>
      </div>
      <Skeleton className="h-16 w-full rounded-2xl" />
    </div>
  );
}

export function PortalCardGridSkeleton({ count = 6 }) {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <PortalCardSkeleton key={index} />
      ))}
    </div>
  );
}
