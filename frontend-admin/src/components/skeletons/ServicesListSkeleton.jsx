import { ServiceListItemSkeleton } from './primitives';

export function ServicesListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((item) => (
        <ServiceListItemSkeleton key={item} />
      ))}
    </div>
  );
}
