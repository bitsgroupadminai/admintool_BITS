import { Sparkles, BookOpen, AlertCircle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function AiStepAssist({
  section,
  sectionLabel,
  aiSuggestions,
  generating,
  onGenerate,
  onApply,
  onDismiss,
  canGenerate = true,
}) {
  const diff = aiSuggestions?.diff?.filter((d) => {
    const map = {
      eligibility: "eligibilityRules",
      documents: "documentRequirements",
      workflow: "workflowSteps",
      queue: "queue",
    };
    return d.key === map[section];
  });

  const payloadKey =
    section === "eligibility"
      ? "eligibilityRules"
      : section === "documents"
        ? "documentRequirements"
        : section === "workflow"
          ? "workflowSteps"
          : "queueMode";

  const hasPayload = Boolean(
    section === "queue"
      ? aiSuggestions?.payload?.queueMode
      : aiSuggestions?.payload?.[payloadKey]?.length,
  );

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
            Extracts eligibility, documents, workflow, and queue settings from
            your knowledge documents. Nothing applies without your confirmation.
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

      {hasPayload && diff?.length > 0 && (
        <div className="space-y-3">
          {diff.map((item) => (
            <div
              key={item.key}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#D4E5D0] bg-white px-4 py-3"
            >
              <div className="flex items-center gap-2.5">
                <div className="h-2 w-2 rounded-full bg-[#3D6B35]" />
                <span className="text-sm font-medium text-[#1A2E16]">{item.label}</span>
                <span
                  className={cn(
                    'inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                    item.status === 'new'
                      ? 'bg-[#EEF4EC] text-[#3D6B35]'
                      : item.status === 'updated'
                        ? 'bg-[#FEF3C7] text-[#92400E]'
                        : 'bg-[#FEE2E2] text-[#991B1B]',
                  )}
                >
                  {item.status === 'new' ? 'New' : item.status === 'updated' ? 'Updated' : item.status}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onApply(section)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#3D6B35] px-4 py-1.5 text-xs font-semibold text-white transition-all duration-150 hover:bg-[#2D5427] active:scale-[0.98]"
                >
                  Confirm
                  <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  onClick={onDismiss}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-[#6B7C69] transition-all duration-150 hover:bg-[#F4F7F3] hover:text-[#2D5427]"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
