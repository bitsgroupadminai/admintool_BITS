import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize',
  {
    variants: {
      variant: {
        default: 'border-border bg-surface text-foreground',
        draft: 'border-sage-light bg-warning-surface text-warning',
        active: 'border-sage bg-sage/15 text-forest',
        complete: 'border-slate/40 bg-sage-light/30 text-forest',
        incomplete: 'border-slate bg-mist text-slate',
        disabled: 'border-border bg-mist/50 text-muted',
        archived: 'border-border bg-accent/20 text-muted',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
