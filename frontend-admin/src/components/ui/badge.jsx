import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide capitalize',
  {
    variants: {
      variant: {
        default: 'border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]',
        draft: 'border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]',
        active: 'border-[#C4E8D4] bg-[#F0FAF5] text-[#0A6640]',
        complete: 'border-[#BBF7D0] bg-[#ECFDF5] text-[#0A6640]',
        incomplete: 'border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]',
        disabled: 'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]',
        archived: 'border-[#E2EEE8] bg-[#F9FCFB] text-[#6B7280]',
        outline: 'border-[#C4E8D4] bg-white text-[#4B6358]',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
