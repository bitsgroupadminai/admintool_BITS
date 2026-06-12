import { ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function ReviewPackList({
  items,
  onScrollToStep,
  showGo = false,
  dense = false,
}) {
  return (
    <ul className={cn("space-y-1", dense && "space-y-0.5")}>
      {items.map((item) => {
        const Icon = item.Icon;
        const canGo = showGo && onScrollToStep && typeof item.step === "number";

        return (
          <li
            key={item.id}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors duration-100",
              canGo && "hover:bg-[#F4F7F3] cursor-pointer",
            )}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#E8EDE6] bg-[#F7F8F6] text-base leading-none">
              {item.emoji}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-sm font-semibold text-[#1A2E16]">
                  {item.shortTitle}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#9BAE99]">
                  {item.whenShort}
                </span>
              </div>
              <p className="text-xs text-[#6B7C69] leading-snug">
                {item.tagline}
              </p>
            </div>

            {canGo ? (
              <button
                type="button"
                className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-[#D4E5D0] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#3D6B35] transition-all duration-150 hover:border-[#3D6B35] hover:bg-[#EEF4EC]"
                onClick={() => onScrollToStep(item.step)}
              >
                Go
                <ArrowDown className="h-3 w-3" strokeWidth={2.5} />
              </button>
            ) : (
              Icon && (
                <Icon
                  className="h-4 w-4 shrink-0 text-[#C4D4C2]"
                  strokeWidth={2}
                  aria-hidden
                />
              )
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function ReviewPackGrid({ items }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-3 rounded-xl border border-[#E8EDE6] bg-[#F7F8F6] px-3 py-2.5 transition-colors duration-100 hover:border-[#D4E5D0] hover:bg-[#F4F7F3]"
        >
          <span className="shrink-0 text-lg leading-none">{item.emoji}</span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#1A2E16]">
              {item.shortTitle}
            </p>
            <p className="text-[11px] text-[#6B7C69] leading-snug">
              {item.tagline}
            </p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-[#9BAE99]">
              {item.whenShort}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
