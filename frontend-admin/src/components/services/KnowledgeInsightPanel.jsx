import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";

export function KnowledgeInsightPanel({
  children,
  className,
  suggested = false,
}) {
  return (
    <div
      className={cn(
        "relative rounded-xl border border-[#E8EDE6] bg-white p-4 transition-all duration-150",
        suggested && "border-[#D4E5D0] bg-[#FAFCF9]",
        className,
      )}
    >
      {suggested && (
        <span
          className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-md bg-[#EEF4EC] px-2 py-1 text-[10px] font-semibold text-[#3D6B35]"
          title="Suggested from your uploaded documents"
        >
          <Bot className="h-3 w-3" strokeWidth={2} aria-hidden />
          Suggested
        </span>
      )}
      <div className={cn(suggested && "pr-20")}>{children}</div>
    </div>
  );
}
