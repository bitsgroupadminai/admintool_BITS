export function EnrollmentProcessTimeline({ steps }) {
  if (!steps?.length) {
    return <p className="text-sm text-muted">Enrollment process details will be shared soon.</p>;
  }

  const sorted = [...steps].sort((a, b) => a.order - b.order);

  return (
    <ol className="space-y-0">
      {sorted.map((step, index) => (
        <li key={step.stepId} className="relative flex gap-4 pb-6 last:pb-0">
          {index < sorted.length - 1 && (
            <span
              className="absolute left-[15px] top-8 h-[calc(100%-1rem)] w-px bg-border"
              aria-hidden
            />
          )}
          <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E8F0ED] text-sm font-semibold text-[#1F4D3F]">
            {index + 1}
          </div>
          <div className="min-w-0 pt-0.5">
            <h3 className="text-sm font-semibold text-foreground">{step.name}</h3>
            {step.description && (
              <p className="mt-1 text-sm leading-relaxed text-muted">{step.description}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
