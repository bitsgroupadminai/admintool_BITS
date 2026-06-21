import { Skeleton } from './Skeleton';

/**
 * @param {{ columnCount: number, rowCount?: number }} props
 */
export function AdminListTableSkeleton({ columnCount, rowCount = 6 }) {
  return Array.from({ length: rowCount }, (_, rowIndex) => (
    <tr key={rowIndex} className="animate-pulse">
      {Array.from({ length: columnCount }, (__, colIndex) => (
        <td key={colIndex} className="whitespace-nowrap px-5 py-4 sm:px-6">
          {colIndex === 0 ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-40" />
            </div>
          ) : colIndex === columnCount - 1 ? (
            <Skeleton className="ml-auto h-4 w-16" />
          ) : (
            <Skeleton className="h-4 w-24" />
          )}
        </td>
      ))}
    </tr>
  ));
}
