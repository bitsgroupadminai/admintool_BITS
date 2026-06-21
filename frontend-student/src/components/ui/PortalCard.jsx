import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PortalCard({
  tag,
  index,
  title,
  description,
  footer,
  children,
  className,
  href,
  onClick,
  actionLabel,
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        {tag ? (
          <span className="inline-flex rounded-full border border-[#B6DFC8] bg-[#F0FAF5] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#0A6640]">
            {tag}
          </span>
        ) : (
          <span />
        )}
        {index != null && (
          <span
            aria-hidden
            className="text-5xl font-bold leading-none text-[#E8F5EE] select-none"
          >
            {String(index).padStart(2, '0')}
          </span>
        )}
      </div>

      <h3 className="mt-4 text-xl font-bold tracking-tight text-[#052E1C]">{title}</h3>
      {description && (
        <p className="mt-2 text-sm leading-relaxed text-[#4B6358]">{description}</p>
      )}
      {children}
      {footer}
      {actionLabel && (
        <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#0A6640]">
          {actionLabel}
          <ArrowRight className="h-4 w-4" />
        </span>
      )}
    </>
  );

  const cardClass = cn(
    'group relative block overflow-hidden rounded-2xl border border-[#E2EEE8] bg-white p-6 shadow-[0_4px_24px_rgba(10,102,64,0.06)] transition duration-300 hover:-translate-y-0.5 hover:border-[#C4E8D4] hover:shadow-[0_10px_40px_rgba(10,102,64,0.10)]',
    className,
  );

  if (href) {
    return (
      <Link to={href} className={cardClass}>
        {body}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(cardClass, 'w-full text-left')}>
        {body}
      </button>
    );
  }

  return <article className={cardClass}>{body}</article>;
}

export function PageShell({ children, className }) {
  return (
    <div className={cn('mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10', className)}>
      {children}
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, action, className }) {
  return (
    <div className={cn('mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between', className)}>
      <div>
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#10B981]">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#052E1C]">{title}</h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#4B6358]">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ children }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#B6DFC8] bg-white/90 p-8 text-sm leading-relaxed text-[#4B6358]">
      {children}
    </div>
  );
}
