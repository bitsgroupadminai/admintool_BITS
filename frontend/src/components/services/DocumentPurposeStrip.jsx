import { FileText, Sparkles, ClipboardCheck, ArrowRight } from "lucide-react";

const STEPS = [
  {
    icon: FileText,
    label: "Upload",
    detail: "PDF or DOCX source files",
    color: "text-[#4A6448]",
    bg: "bg-[#F6FAF5]",
    border: "border-[#D4E5D0]",
  },
  {
    icon: Sparkles,
    label: "Extract",
    detail: "AI-powered review pack",
    color: "text-[#4A6448]",
    bg: "bg-[#F6FAF5]",
    border: "border-[#D4E5D0]",
  },
  {
    icon: ClipboardCheck,
    label: "Review",
    detail: "Confirm & configure",
    color: "text-[#4A6448]",
    bg: "bg-[#F6FAF5]",
    border: "border-[#D4E5D0]",
  },
];

export function DocumentPurposeStrip() {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-3">
      {STEPS.map((step, i) => (
        <div key={step.label} className="flex flex-1 items-center gap-2">
          <div
            className={`flex flex-1 items-center gap-3 rounded-xl border ${step.border} ${step.bg} px-4 py-3 transition-all duration-150`}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white border border-[#D4E5D0]">
              <step.icon className={`h-4 w-4 ${step.color}`} strokeWidth={2} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1A2E16]">
                {step.label}
              </p>
              <p className="text-xs text-[#6B7C69]">{step.detail}</p>
            </div>
          </div>
          {i < STEPS.length - 1 && (
            <ArrowRight
              className="hidden h-4 w-4 shrink-0 text-[#B8D4B2] sm:block"
              strokeWidth={2}
            />
          )}
        </div>
      ))}
    </div>
  );
}
