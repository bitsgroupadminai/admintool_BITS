import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { EXTRACTION_PROGRESS_STEPS } from "./reviewPackContents";
import { cn } from "@/lib/utils";

export function ExtractionProgress({ active }) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setStepIndex(0);
      return undefined;
    }
    const id = setInterval(() => {
      setStepIndex((i) =>
        i < EXTRACTION_PROGRESS_STEPS.length - 1 ? i + 1 : i,
      );
    }, 2200);
    return () => clearInterval(id);
  }, [active]);

  if (!active) return null;

  return (
    <div className="rounded-xl border border-[#D4E5D0] bg-white p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#3D6B35]/10">
          <Loader2
            className="h-3.5 w-3.5 animate-spin text-[#3D6B35]"
            strokeWidth={2}
          />
        </div>
        <p className="text-sm font-semibold text-[#1A2E16]">
          Building your review pack…
        </p>
      </div>
      <ul className="space-y-2.5">
        {EXTRACTION_PROGRESS_STEPS.map((label, i) => {
          const done = i < stepIndex;
          const current = i === stepIndex;
          return (
            <li
              key={label}
              className={cn(
                "flex items-center gap-3 text-sm transition-all duration-300",
                current
                  ? "text-[#1A2E16]"
                  : done
                    ? "text-[#9BAE99]"
                    : "text-[#C4D4C2]",
              )}
            >
              <div
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all duration-300",
                  current && "border border-[#3D6B35] bg-white",
                  done && "bg-[#3D6B35]",
                  !current && !done && "border border-[#E8EDE6] bg-[#F7F8F6]",
                )}
              >
                {current && (
                  <Loader2
                    className="h-3 w-3 animate-spin text-[#3D6B35]"
                    strokeWidth={2.5}
                  />
                )}
                {done && (
                  <Check className="h-3 w-3 text-white" strokeWidth={3} />
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-medium",
                  current && "font-semibold",
                )}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
