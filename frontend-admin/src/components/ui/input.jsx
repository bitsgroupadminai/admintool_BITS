import { cn } from '@/lib/utils';

/**
 * @param {import('react').InputHTMLAttributes<HTMLInputElement>} props
 */
export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        'flex h-10 w-full rounded-xl border border-[#C4E8D4] bg-[#F0FAF5] px-4 py-2 text-sm text-[#052E1C] placeholder:text-[#A8BDB5]',
        'transition-all duration-200 hover:border-[#6EE7B7] hover:bg-[#EDFAF3]',
        'focus-visible:outline-none focus-visible:border-[#6EE7B7] focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#6EE7B7]/20',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
