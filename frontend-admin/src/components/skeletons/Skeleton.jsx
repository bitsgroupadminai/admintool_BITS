import { cn } from '@/lib/utils';

/**
 * @param {{ className?: string }} props
 */
export function Skeleton({ className }) {
  return <div className={cn('animate-pulse rounded-lg bg-[#E8F0EC]/80', className)} />;
}
