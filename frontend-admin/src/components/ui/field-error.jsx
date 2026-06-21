import { cn } from '@/lib/utils';

/**
 * @param {{ message?: string; className?: string }} props
 */
export function FieldError({ message, className }) {
  if (!message) return null;
  return <p className={cn('mt-1.5 text-xs text-destructive', className)}>{message}</p>;
}
