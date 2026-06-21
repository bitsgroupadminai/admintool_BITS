import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6EE7B7]/30 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-r from-[#0A6640] to-[#084F31] text-white shadow-[0_2px_10px_rgba(10,102,64,0.28)] hover:opacity-95',
        outline:
          'border border-[#C4E8D4] bg-white text-[#0A6640] hover:bg-[#F0FAF5]',
        ghost: 'text-[#4B6358] hover:bg-[#F0FAF5] hover:text-[#0A6640]',
        destructive:
          'border border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C] hover:bg-[#FEE2E2]',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3 text-xs',
        lg: 'h-11 px-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

/**
 * @param {import('react').ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string, size?: string }} props
 */
export function Button({ className, variant, size, ...props }) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
