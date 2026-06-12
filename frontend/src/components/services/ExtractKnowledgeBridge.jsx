import { Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { REVIEW_PACK_SECTIONS } from "./reviewPackContents";
import { ReviewPackGrid } from "./ReviewPackList";
import { ExtractionProgress } from "./ExtractionProgress";
import { ExtractionSuccess } from "./ExtractionSuccess";
import { cn } from "@/lib/utils";

export function ExtractKnowledgeBridge({
  hasDocuments,
  extracting,
  insights,
  isStale,
  analysisWarning,
  analysisMode,
  aiEnabled,
  onExtract,
  onScrollToStep,
}) {
  const hasExtracted = Boolean(insights?.generatedAt);

  const modeBadge =
    analysisMode === "openai"
      ? { label: "AI extraction", color: "bg-[#EEF4EC] text-[#3D6B35]" }
      : analysisMode === "heuristic"
        ? { label: "Limited extraction", color: "bg-[#FDF6EC] text-[#92561A]" }
        : !analysisMode && aiEnabled && hasDocuments && !hasExtracted
          ? { label: "OpenAI ready", color: "bg-[#EEF4EC] text-[#3D6B35]" }
          : null;

  return (
    <div className="mb-6 rounded-2xl border border-[#D4E5D0] bg-[#F6FAF5] p-6 space-y-5">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#3D6B35]/10">
          <Sparkles className="h-5 w-5 text-[#3D6B35]" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-[#1A2E16] tracking-tight">
            Extract knowledge with AI
          </h2>
          <p className="mt-0.5 text-sm text-[#6B7C69] leading-relaxed">
            Builds a review pack from your uploads — you confirm before anything
            goes live.
          </p>
        </div>
      </div>

      {!hasExtracted && (
        <div className="rounded-xl border border-[#E8EDE6] bg-white p-4">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-[#9BAE99]">
            Review pack includes
          </p>
          <ReviewPackGrid items={REVIEW_PACK_SECTIONS} />
        </div>
      )}

      {!hasDocuments && (
        <div className="flex items-center gap-2.5 rounded-xl border border-[#E8EDE6] bg-white px-4 py-3">
          <AlertCircle
            className="h-4 w-4 shrink-0 text-[#9BAE99]"
            strokeWidth={2}
          />
          <p className="text-sm text-[#6B7C69]">
            Upload a PDF or DOCX in Step 1 first.
          </p>
        </div>
      )}

      {hasDocuments && isStale && !extracting && (
        <div className="flex items-start gap-2.5 rounded-xl border border-[#F5DEC2] bg-[#FDFAF6] px-4 py-3">
          <AlertCircle
            className="h-4 w-4 shrink-0 text-[#92561A] mt-0.5"
            strokeWidth={2}
          />
          <p className="text-sm text-[#92561A]">
            Documents changed — re-extract to refresh the review pack.
          </p>
        </div>
      )}

      {analysisWarning && hasExtracted && !extracting && (
        <div className="flex items-start gap-2.5 rounded-xl border border-[#F5DEC2] bg-[#FDFAF6] px-4 py-3">
          <AlertCircle
            className="h-4 w-4 shrink-0 text-[#92561A] mt-0.5"
            strokeWidth={2}
          />
          <p className="text-sm text-[#92561A]">{analysisWarning}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onExtract}
          disabled={!hasDocuments || extracting}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all duration-150",
            !hasDocuments || extracting
              ? "cursor-not-allowed bg-[#D4E5D0] text-[#9BAE99]"
              : "bg-[#3D6B35] text-white shadow-sm hover:bg-[#2D5427] active:scale-[0.98]",
          )}
        >
          {hasExtracted ? (
            <RefreshCw
              className={cn("h-4 w-4", extracting && "animate-spin")}
              strokeWidth={2}
            />
          ) : (
            <Sparkles className="h-4 w-4" strokeWidth={2} />
          )}
          {extracting
            ? "Extracting…"
            : hasExtracted
              ? "Re-extract knowledge"
              : "Extract knowledge"}
        </button>

        {modeBadge && (
          <span
            className={cn(
              "inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-semibold",
              modeBadge.color,
            )}
          >
            {modeBadge.label}
          </span>
        )}
      </div>

      <ExtractionProgress active={extracting} />

      {hasExtracted && !extracting && (
        <ExtractionSuccess
          insights={insights}
          onScrollToStep={onScrollToStep}
        />
      )}
    </div>
  );
}
