import { Skeleton } from './Skeleton';

export function AppointmentsScheduleSkeleton() {
  return (
    <div className="mt-8 space-y-6">
      {[1, 2].map((section) => (
        <section key={section}>
          <Skeleton className="h-4 w-32" />
          <div className="mt-3 space-y-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E2EEE8] bg-[#F9FCFB] px-4 py-3"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-44" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function QueueBoardSkeleton() {
  return (
    <div className="mt-6 space-y-3">
      {[1, 2, 3, 4].map((item) => (
        <div key={item} className="rounded-xl border border-[#E2EEE8] bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-9 w-16 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
