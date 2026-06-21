import { Skeleton } from './Skeleton';
import {
  PortalCardSkeleton,
  RequestCardSkeleton,
  SectionCardSkeleton,
  StatCardSkeleton,
} from './primitives';

export function DashboardSkeleton() {
  return (
    <>
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <StatCardSkeleton key={item} />
        ))}
      </div>

      <SectionCardSkeleton className="mb-8 p-5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-2 h-5 w-48" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-24 rounded-xl" />
          ))}
        </div>
      </SectionCardSkeleton>

      <SectionCardSkeleton className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {[1, 2, 3, 4].map((item) => (
            <RequestCardSkeleton key={item} />
          ))}
        </div>
      </SectionCardSkeleton>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
    </>
  );
}

export function InstituteHomeSkeleton() {
  return (
    <>
      <section className="border-b border-[#E2EEE8] bg-gradient-to-b from-white/80 to-[#F4FAF7]">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16">
          <Skeleton className="h-7 w-40 rounded-full" />
          <Skeleton className="mt-5 h-12 w-80 max-w-full" />
          <Skeleton className="mt-4 h-4 w-full max-w-2xl" />
          <Skeleton className="mt-2 h-4 w-4/5 max-w-xl" />
          <div className="mt-7 flex flex-wrap gap-3">
            <Skeleton className="h-11 w-40 rounded-xl" />
            <Skeleton className="h-11 w-36 rounded-xl" />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-2 h-8 w-56" />
        <Skeleton className="mt-2 h-4 w-72 max-w-full" />
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <PortalCardSkeleton key={item} />
          ))}
        </div>
      </div>
    </>
  );
}

export function InstituteSelectSkeleton() {
  return (
    <div className="min-h-screen bg-[#F4FAF7]">
      <header className="border-b border-[#E2EEE8]/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-36" />
            </div>
          </div>
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
      </header>

      <section className="border-b border-[#E2EEE8] bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
          <div className="mx-auto max-w-2xl text-center">
            <Skeleton className="mx-auto h-7 w-36 rounded-full" />
            <Skeleton className="mx-auto mt-4 h-10 w-72 max-w-full" />
            <Skeleton className="mx-auto mt-3 h-4 w-full max-w-lg" />
          </div>
          <Skeleton className="mx-auto mt-8 h-12 w-full max-w-xl rounded-2xl" />
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <PortalCardSkeleton key={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
