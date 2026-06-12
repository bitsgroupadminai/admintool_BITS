import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const WIZARD_STEPS = [
  { id: "eligibility", label: "Eligibility" },
  { id: "documents", label: "Documents" },
  { id: "workflow", label: "Workflow" },
  { id: "queue", label: "Queue" },
  { id: "review", label: "Review" },
];

export function OfferingWizardNav({ currentStep, completeness }) {
  const currentIndex = WIZARD_STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="mb-8">
      <ol className="flex items-center gap-0">
        {WIZARD_STEPS.map((step, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;
          const sectionKey = {
            eligibility: "eligibility_rules",
            documents: "document_requirements",
            workflow: "workflow",
            queue: "queue_mode",
            review: null,
          }[step.id];
          const sectionDone =
            sectionKey && completeness?.missing
              ? !completeness.missing.includes(sectionKey)
              : false;
          const completed = done || sectionDone;

          return (
            <li key={step.id} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all duration-200",
                    active &&
                      "bg-[#3D6B35] text-white shadow-sm shadow-[#3D6B35]/30",
                    completed && !active && "bg-[#EEF4EC] text-[#3D6B35]",
                    !active && !completed && "bg-[#F4F7F3] text-[#9BAE99]",
                  )}
                >
                  {completed && !active ? (
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <span
                  className={cn(
                    "whitespace-nowrap text-[11px] font-medium tracking-wide",
                    active
                      ? "text-[#2D5427]"
                      : completed
                        ? "text-[#3D6B35]"
                        : "text-[#9BAE99]",
                  )}
                >
                  {step.label}
                </span>
              </div>
              {index < WIZARD_STEPS.length - 1 && (
                <div
                  className={cn(
                    "mb-5 h-px flex-1 mx-2 transition-all duration-300",
                    completed ? "bg-[#B8D4B2]" : "bg-[#E8EDE6]",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
