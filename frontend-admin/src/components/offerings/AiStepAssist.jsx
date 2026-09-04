import { Sparkles, BookOpen, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function AiStepAssist({
  section,
  aiSuggestions,
  generating,
  onGenerate,
  canGenerate = true,
}) {
  return (
    <div className="rounded-xl border border-[#D4E5D0] bg-[#F6FAF5] p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#3D6B35]/10">
              <Sparkles
                className="h-3.5 w-3.5 text-[#3D6B35]"
                strokeWidth={2}
              />
            </div>
            <p className="text-sm font-semibold text-[#1A2E16]">
              AI assistance
            </p>
          </div>
          <p className="text-xs leading-relaxed text-[#6B7C69] max-w-sm">
            {section === "workflow"
              ? "Extracts workflow steps plus staff, admin, and student instructions from your knowledge documents."
              : "Extracts eligibility, documents, workflow, and queue settings from your knowledge documents into the fields below."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onGenerate(section)}
          disabled={generating || !canGenerate}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold tracking-wide transition-all duration-150",
            generating || !canGenerate
              ? "cursor-not-allowed border-[#D4E5D0] bg-white text-[#9BAE99]"
              : "border-[#3D6B35] bg-[#3D6B35] text-white shadow-sm hover:bg-[#2D5427] active:scale-[0.98]",
          )}
        >
          <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
          {generating ? "Extracting…" : "Extract from documents"}
        </button>
      </div>

      {aiSuggestions?.understandingSummary && (
        <div className="flex gap-3 rounded-lg border border-[#E8EDE6] bg-white px-4 py-3">
          <BookOpen
            className="h-4 w-4 shrink-0 text-[#3D6B35] mt-0.5"
            strokeWidth={2}
          />
          <p className="text-xs leading-relaxed text-[#4A6448]">
            {aiSuggestions.understandingSummary}
          </p>
        </div>
      )}

      {aiSuggestions?.gaps?.length > 0 && (
        <div className="rounded-lg border border-[#F5DEC2] bg-[#FDFAF6] px-4 py-3 space-y-1.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-[#92561A]">
            <AlertCircle className="h-3.5 w-3.5" strokeWidth={2} />
            Knowledge gaps detected
          </p>
          <ul className="space-y-1 pl-5 list-disc">
            {aiSuggestions.gaps.slice(0, 2).map((g) => (
              <li key={g} className="text-xs text-[#7A6040]">
                {g}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
