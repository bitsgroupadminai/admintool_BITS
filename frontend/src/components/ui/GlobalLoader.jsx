import { cn } from '@/lib/utils';

const sizeClasses = {
  sm: {
    wrapper: 'gap-2',
    mark: 'h-5 w-5 border-2',
    text: 'text-xs',
  },
  md: {
    wrapper: 'gap-3',
    mark: 'h-8 w-8 border-[3px]',
    text: 'text-sm',
  },
  lg: {
    wrapper: 'gap-3',
    mark: 'h-10 w-10 border-[3px]',
    text: 'text-base',
  },
};

const variants = {
  full: 'min-h-screen bg-background',
  page: 'min-h-56 px-6 py-10',
  inline: 'min-h-16 px-3 py-4',
};

export function GlobalLoader({
  label = 'Loading...',
  size = 'md',
  variant = 'page',
  className,
}) {
  const classes = sizeClasses[size] ?? sizeClasses.md;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-center justify-center text-muted',
        variants[variant] ?? variants.page,
        className,
      )}
    >
      <div className={cn('flex flex-col items-center text-center', classes.wrapper)}>
        <span className="relative flex items-center justify-center">
          <span
            className={cn(
              'block rounded-full border-sage-light border-t-primary animate-spin',
              classes.mark,
            )}
          />
          <span className="absolute h-2 w-2 rounded-full bg-primary/80 shadow-[0_0_10px_rgba(123,150,105,0.45)]" />
        </span>
        {label ? (
          <span className={cn('font-medium text-subtle', classes.text)}>{label}</span>
        ) : null}
      </div>
    </div>
  );
}
