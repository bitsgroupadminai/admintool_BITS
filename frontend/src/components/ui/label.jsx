import { cn } from '@/lib/utils';

/**
 * @param {import('react').LabelHTMLAttributes<HTMLLabelElement>} props
 */
export function Label({ className, ...props }) {
  return (
    <label
      className={cn('text-sm font-medium leading-none text-foreground', className)}
      {...props}
    />
  );
}
