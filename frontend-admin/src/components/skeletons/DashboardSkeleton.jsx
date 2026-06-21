import { Skeleton } from './Skeleton';

export function AdminDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <Skeleton key={item} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-20 w-full rounded-2xl" />
      <div className="grid gap-4 xl:grid-cols-12">
        <Skeleton className="h-72 rounded-2xl xl:col-span-8" />
        <Skeleton className="h-72 rounded-2xl xl:col-span-4" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-64 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-64 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-12">
        <Skeleton className="h-64 rounded-2xl xl:col-span-7" />
        <Skeleton className="h-64 rounded-2xl xl:col-span-5" />
      </div>
    </div>
  );
}

export function StaffDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <Skeleton key={item} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-20 w-full rounded-2xl" />
      <div className="grid gap-4 xl:grid-cols-12">
        <Skeleton className="h-72 rounded-2xl xl:col-span-8" />
        <Skeleton className="h-72 rounded-2xl xl:col-span-4" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <Skeleton key={item} className="h-64 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-64 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
