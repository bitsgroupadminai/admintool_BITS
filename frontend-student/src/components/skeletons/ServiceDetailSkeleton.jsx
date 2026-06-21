import { Skeleton } from './Skeleton';
import { SectionCardSkeleton } from './primitives';

export function ServiceDetailSkeleton() {
  return (
    <div className="mt-5 space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="h-4 w-full max-w-2xl" />
        <Skeleton className="mt-1 h-4 w-4/5 max-w-xl" />
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#E2EEE8] bg-white shadow-[0_4px_24px_rgba(10,102,64,0.06)]">
        <div className="border-b border-[#E2EEE8] p-6">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="mt-3 h-8 w-56 max-w-full" />
          <Skeleton className="mt-2 h-4 w-72 max-w-full" />
          <div className="mt-5 flex flex-wrap gap-2">
            <Skeleton className="h-10 w-40 rounded-xl" />
            <Skeleton className="h-10 w-36 rounded-xl" />
          </div>
        </div>

        <div className="grid gap-6 p-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-[#E2EEE8] bg-[#F9FCFB] p-5">
              <Skeleton className="h-5 w-48" />
              <div className="mt-3 space-y-2">
                <Skeleton className="h-11 w-full rounded-xl" />
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-5 w-56" />
              <Skeleton className="h-4 w-full max-w-md" />
              <div className="mt-5 space-y-3">
                {[1, 2, 3].map((item) => (
                  <Skeleton key={item} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <SectionCardSkeleton className="space-y-4">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </SectionCardSkeleton>
            <SectionCardSkeleton className="space-y-3">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </SectionCardSkeleton>
          </div>
        </div>
      </section>
    </div>
  );
}

export function EnrollmentOfferingSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <Skeleton className="h-4 w-32" />

      <div className="mt-5 rounded-xl border border-[#D1EEE0] bg-white/90 p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-9 w-72 max-w-full" />
            <Skeleton className="h-4 w-full max-w-2xl" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-2 h-14 w-full max-w-lg rounded-lg" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:w-80 lg:grid-cols-1">
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="rounded-xl border border-[#E2EEE8] bg-[#F9FCFB] p-4">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="mt-2 h-3 w-24" />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.75fr)] lg:items-start">
        <div className="space-y-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="overflow-hidden rounded-xl border border-[#E2EEE8] bg-white shadow-sm"
            >
              <div className="flex items-center justify-between gap-3 border-b border-[#E2EEE8] px-5 py-4">
                <Skeleton className="h-5 w-44" />
                <Skeleton className="h-6 w-8 rounded-full" />
              </div>
              <div className="space-y-2 p-5">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-[#E2EEE8] bg-white p-6 shadow-sm">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-full mt-2" />
          <div className="mt-5 space-y-3">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
          <Skeleton className="mt-5 h-11 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
