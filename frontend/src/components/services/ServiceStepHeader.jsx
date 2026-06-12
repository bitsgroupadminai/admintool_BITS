import { cn } from "@/lib/utils";

export function ServiceStepHeader({ step, title, description, className }) {
  return (
    <div className={cn("flex items-start gap-4", className)}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#3D6B35] text-[13px] font-bold text-white shadow-sm shadow-[#3D6B35]/20">
        {step}
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <h2 className="text-base font-bold tracking-tight text-[#1A2E16]">
          {title}
        </h2>
        {description && (
          <p className="mt-0.5 text-sm text-[#6B7C69] leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
