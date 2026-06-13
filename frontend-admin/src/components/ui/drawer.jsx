import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Drawer({ open, title, description, onClose, children }) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90]">
      <button
        type="button"
        className="absolute inset-0 w-full bg-[#052E1C]/35 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close drawer"
      />
      <aside
        className={cn(
          "absolute right-0 top-0 flex h-full w-full flex-col border-l border-[#D1EEE0]/80 bg-white/95 shadow-[0_20px_70px_rgba(5,46,28,0.20)] sm:max-w-xl lg:w-1/2 lg:max-w-none",
          "animate-in slide-in-from-right duration-200",
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#E2EEE8] px-6 py-5">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-[#052E1C]">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm leading-relaxed text-[#4B6358]">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[#9CA3AF] transition-colors hover:bg-[#F0FAF5] hover:text-[#0A6640]"
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        <div className="flex-1 overflow-auto px-6 py-5">{children}</div>
      </aside>
    </div>,
    document.body,
  );
}
