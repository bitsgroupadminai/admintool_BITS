import { cn } from '@/lib/utils';

const sizeClasses = {
  sm: { wrapper: 'gap-2', mark: 'h-5 w-5 border-2', text: 'text-xs' },
  md: { wrapper: 'gap-3', mark: 'h-9 w-9 border-[3px]', text: 'text-sm' },
  lg: { wrapper: 'gap-4', mark: 'h-11 w-11 border-[3px]', text: 'text-base' },
};

const variants = {
  full: 'min-h-screen bg-[#F4FAF7]',
  page: 'min-h-56 px-6 py-12',
  inline: 'min-h-20 px-3 py-6',
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
        'flex items-center justify-center text-[#4B6358]',
        variants[variant] ?? variants.page,
        className,
      )}
    >
      <div className={cn('flex flex-col items-center text-center', classes.wrapper)}>
        <span className="relative flex items-center justify-center">
          <span
            className={cn(
              'block rounded-full border-[#C4E8D4] border-t-[#0A6640] animate-spin',
              classes.mark,
            )}
          />
          <span className="absolute h-2 w-2 rounded-full bg-[#10B981] shadow-[0_0_12px_rgba(16,185,129,0.45)]" />
        </span>
        {label ? (
          <span className={cn('font-medium text-[#4B6358]', classes.text)}>{label}</span>
        ) : null}
      </div>
    </div>
  );
}
