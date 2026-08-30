import {
  CheckCircle2,
  HelpCircle,
  Layers,
  AlertTriangle,
  ArrowDown,
} from "lucide-react";
import { SERVICE_PAGE_PACK, CONFIGURE_PACK } from "./reviewPackContents";
import { ReviewPackList } from "./ReviewPackList";

export function ExtractionSuccess({ insights, onScrollToStep }) {
  const offeringCount =
    insights?.suggestedOfferings?.filter((s) => s.status === "pending")
      ?.length ?? 0;
  const questionCount = insights?.chatbotCanAnswer?.length ?? 0;
  const gapCount = insights?.gaps?.length ?? 0;

  const stats = [
    questionCount > 0 && {
      icon: HelpCircle,
      label: `${questionCount} questions`,
      color: "text-[#3D6B35]",
    },
    offeringCount > 0 && {
      icon: Layers,
      label: `${offeringCount} offerings`,
      color: "text-[#3D6B35]",
    },
    gapCount > 0 && {
      icon: AlertTriangle,
      label: `${gapCount} gaps`,
      color: "text-[#92561A]",
    },
  ].filter(Boolean);

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 rounded-xl border border-[#D4E5D0] bg-[#F6FAF5] px-4 py-3.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EEF4EC]">
          <CheckCircle2
            className="h-4.5 w-4.5 text-[#3D6B35]"
            strokeWidth={2}
          />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-semibold text-[#1A2E16]">
            Review pack ready
          </p>
          <p className="text-xs text-[#6B7C69] leading-relaxed">
            Student chat indexing is queued. Confirm the pack below — nothing
            goes live until you activate offerings.
          </p>
          {stats.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {stats.map(({ icon: Icon, label, color }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#E8EDE6] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#1A2E16]"
                >
                  <Icon
                    className={`h-3 w-3 shrink-0 ${color}`}
                    strokeWidth={2}
                  />
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-[#E8EDE6] bg-white">
        <div className="flex items-center gap-2.5 border-b border-[#E8EDE6] px-4 py-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#EEF4EC]">
            <Layers className="h-3.5 w-3.5 text-[#3D6B35]" strokeWidth={2} />
          </div>
          <p className="text-sm font-semibold text-[#1A2E16]">What to review</p>
        </div>

        <div className="px-4 py-3 space-y-4">
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#9BAE99]">
              On this page
            </p>
            <ReviewPackList
              items={SERVICE_PAGE_PACK}
              onScrollToStep={onScrollToStep}
              showGo
              dense
            />
          </div>

          <div className="border-t border-[#F4F7F3] pt-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#9BAE99]">
              Later — per offering configure
            </p>
            <ReviewPackList items={CONFIGURE_PACK} dense />
          </div>
        </div>
      </div>
    </div>
  );
}
