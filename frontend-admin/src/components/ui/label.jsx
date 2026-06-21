import { cn } from '@/lib/utils';

/**
 * @param {import('react').LabelHTMLAttributes<HTMLLabelElement>} props
 */
export function Label({ className, ...props }) {
  return (
    <label
      className={cn(
        'text-xs font-semibold uppercase tracking-wide text-[#4B6358]',
        className,
      )}
      {...props}
    />
  );
}
