import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function DashboardPageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#10B981]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#052E1C]">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#4B6358]">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

const METRIC_VARIANTS = {
  emerald: {
    card: 'border-[#A7F3D0]/80',
    wash: 'from-[#10B981]/28 via-[#D1FAE5]/45 to-white/95',
    glow: 'bg-[#10B981]/16',
    label: 'text-[#047857]',
    iconWrap: 'border-[#6EE7B7]/60 bg-[#ECFDF5]/90 text-[#0A6640]',
    watermark: 'text-[#10B981]/14',
  },
  blue: {
    card: 'border-[#BFDBFE]/80',
    wash: 'from-[#3B82F6]/24 via-[#DBEAFE]/50 to-white/95',
    glow: 'bg-[#3B82F6]/14',
    label: 'text-[#1D4ED8]',
    iconWrap: 'border-[#93C5FD]/60 bg-[#EFF6FF]/90 text-[#1D4ED8]',
    watermark: 'text-[#3B82F6]/14',
  },
  amber: {
    card: 'border-[#FDE68A]/90',
    wash: 'from-[#F59E0B]/26 via-[#FEF3C7]/55 to-white/95',
    glow: 'bg-[#F59E0B]/14',
    label: 'text-[#B45309]',
    iconWrap: 'border-[#FCD34D]/70 bg-[#FFFBEB]/90 text-[#B45309]',
    watermark: 'text-[#F59E0B]/14',
  },
  rose: {
    card: 'border-[#FECACA]/90',
    wash: 'from-[#EF4444]/22 via-[#FEE2E2]/50 to-white/95',
    glow: 'bg-[#EF4444]/12',
    label: 'text-[#B91C1C]',
    iconWrap: 'border-[#FCA5A5]/70 bg-[#FEF2F2]/90 text-[#B91C1C]',
    watermark: 'text-[#EF4444]/14',
  },
  teal: {
    card: 'border-[#99F6E4]/80',
    wash: 'from-[#14B8A6]/24 via-[#CCFBF1]/50 to-white/95',
    glow: 'bg-[#14B8A6]/14',
    label: 'text-[#0F766E]',
    iconWrap: 'border-[#5EEAD4]/60 bg-[#F0FDFA]/90 text-[#0F766E]',
    watermark: 'text-[#14B8A6]/14',
  },
  violet: {
    card: 'border-[#DDD6FE]/80',
    wash: 'from-[#8B5CF6]/22 via-[#EDE9FE]/50 to-white/95',
    glow: 'bg-[#8B5CF6]/12',
    label: 'text-[#6D28D9]',
    iconWrap: 'border-[#C4B5FD]/60 bg-[#F5F3FF]/90 text-[#6D28D9]',
    watermark: 'text-[#8B5CF6]/14',
  },
  /** @deprecated use named variants */
  default: null,
  accent: null,
  warning: null,
  danger: null,
};

METRIC_VARIANTS.default = METRIC_VARIANTS.emerald;
METRIC_VARIANTS.accent = METRIC_VARIANTS.emerald;
METRIC_VARIANTS.warning = METRIC_VARIANTS.amber;
METRIC_VARIANTS.danger = METRIC_VARIANTS.rose;

export function DashboardMetricCard({
  index,
  label,
  value,
  hint,
  icon: Icon,
  variant = 'emerald',
  className,
  href,
  onClick,
}) {
  const tone = METRIC_VARIANTS[variant] ?? METRIC_VARIANTS.emerald;
  const interactive = Boolean(href || onClick);

  const content = (
    <>
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0 bg-gradient-to-br',
          tone.wash,
        )}
      />
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute -left-10 -top-10 h-36 w-44 rounded-full blur-2xl',
          tone.glow,
        )}
      />
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute bottom-0 right-0 h-28 w-32 rounded-full blur-2xl opacity-80',
          tone.glow,
        )}
      />

      {index != null ? (
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute right-4 top-3 text-5xl font-bold leading-none select-none',
            tone.watermark,
          )}
        >
          {String(index).padStart(2, '0')}
        </span>
      ) : null}

      <div className="relative flex min-h-[118px] flex-col">
        <div className="min-w-0 flex-1 pr-8">
          <p className={cn('text-[10px] font-bold uppercase tracking-[0.14em]', tone.label)}>
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-[#052E1C]">{value}</p>
          {hint ? <p className="mt-1.5 text-xs leading-relaxed text-[#4B6358]">{hint}</p> : null}
        </div>

        {Icon ? (
          <div className="mt-4 flex justify-end">
            <div
              className={cn(
                'flex h-11 w-11 items-center justify-center rounded-xl border',
                tone.iconWrap,
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={2} />
            </div>
          </div>
        ) : null}
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        to={href}
        className={cn(
          'relative block overflow-hidden rounded-2xl border p-5 transition hover:-translate-y-0.5 hover:shadow-md',
          tone.card,
          className,
        )}
      >
        {content}
      </Link>
    );
  }

  return (
    <article
      className={cn(
        'relative overflow-hidden rounded-2xl border p-5',
        tone.card,
        interactive ? 'cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md' : '',
        className,
      )}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {content}
    </article>
  );
}

export function DashboardChartCard({ title, description, children, className, action, compact }) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl border border-[#E2EEE8] bg-gradient-to-br from-white via-[#FAFCFB] to-[#F6FAF5]',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-[#E2EEE8]/80 px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-[#052E1C]">{title}</h3>
          {description ? (
            <p className="mt-1 text-xs leading-relaxed text-[#4B6358]">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className={cn(compact ? 'p-4 sm:p-5' : 'p-4 sm:p-5', compact ? '' : '')}>
        {children}
      </div>
    </section>
  );
}

export function DashboardInsightBanner({ title, description, action, tone = 'default' }) {
  const tones = {
    default: 'border-[#C4E8D4] from-[#F0FAF5] to-[#ECFDF5]',
    warning: 'border-[#FDE68A] from-[#FFFBEB] to-[#FEF3C7]',
  };

  return (
    <div
      className={cn(
        'rounded-2xl border bg-gradient-to-r px-5 py-4 sm:px-6',
        tones[tone] ?? tones.default,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#052E1C]">{title}</p>
          {description ? <p className="mt-1 text-sm text-[#4B6358]">{description}</p> : null}
        </div>
        {action}
      </div>
    </div>
  );
}

export function DashboardListCard({ title, action, children, emptyMessage }) {
  const isEmpty = !children;

  return (
    <section className="overflow-hidden rounded-2xl border border-[#E2EEE8] bg-gradient-to-br from-white via-[#FAFCFB] to-[#F6FAF5]">
      <div className="flex items-center justify-between gap-3 border-b border-[#E2EEE8]/80 px-5 py-4 sm:px-6">
        <h3 className="text-sm font-bold text-[#052E1C]">{title}</h3>
        {action}
      </div>
      <div className="p-4 sm:p-5">
        {isEmpty ? (
          <p className="rounded-xl border border-dashed border-[#C4E8D4] bg-[#F9FCFB] px-4 py-8 text-center text-sm text-[#4B6358]">
            {emptyMessage}
          </p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

export function DashboardSnapshotCard({ title, items }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#E2EEE8] bg-gradient-to-br from-[#F6FAF5] via-white to-[#FAFCFB]">
      <div className="border-b border-[#E2EEE8]/80 px-5 py-4 sm:px-6">
        <h3 className="text-sm font-bold text-[#052E1C]">{title}</h3>
      </div>
      <ul className="divide-y divide-[#E2EEE8]/80 px-5 py-2 sm:px-6">
        {(items ?? []).map((item) => (
          <li key={item.label} className="flex items-center justify-between gap-3 py-3 text-sm">
            <span className="text-[#4B6358]">{item.label}</span>
            <span className="font-semibold tabular-nums text-[#052E1C]">{item.value}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DashboardEmptyChart({ message = 'No data yet for this chart.' }) {
  return (
    <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-[#C4E8D4] bg-[#F9FCFB]/80 px-4 text-center text-sm text-[#4B6358]">
      {message}
    </div>
  );
}
