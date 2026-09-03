import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ApplicationDocumentUpload } from '@/components/services/ApplicationDocumentUpload';
import { DocumentList } from '@/components/enrollment/DocumentList';
import { getDocumentProgressStats } from '@/utils/applicationDocuments';
import { hasDocumentAiFailures } from '@/utils/aiDocumentFinding';

/**
 * Compact document prerequisite for step 1. Collapsed = progress only.
 */
export function StepDocumentsAccordion({
  offering,
  application,
  serviceId,
  offeringId,
  onUpload,
  onRemove,
  onRefresh,
}) {
  const stats = getDocumentProgressStats(offering, application);
  const canEdit =
    application?.status === 'draft' || application?.status === 'needs_correction';
  const hasFailures = hasDocumentAiFailures(application);
  const shouldOpenByDefault =
    hasFailures || ((!application || canEdit) && !stats.complete);
  const [open, setOpen] = useState(shouldOpenByDefault);

  useEffect(() => {
    if (hasFailures) setOpen(true);
  }, [hasFailures]);
  const percent =
    stats.requiredCount === 0 ? 100 : Math.round((stats.uploadedCount / stats.requiredCount) * 100);
  const summaryNames =
    stats.requiredNames.length > 2
      ? `${stats.requiredNames.slice(0, 2).join(', ')} +${stats.requiredNames.length - 2} more`
      : stats.requiredNames.join(', ') || 'No required documents';

  if (!offering?.documentRequirements?.length) return null;

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-[#E2EEE8] bg-[#F9FCFB]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-[#F0FAF5]"
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <p className="text-xs font-semibold text-[#052E1C]">Documents for this step</p>
            <p className="text-[11px] font-medium text-[#4B6358]">
              {stats.requiredCount === 0
                ? 'None required'
                : `${stats.uploadedCount}/${stats.requiredCount} uploaded · ${stats.pendingCount} pending`}
            </p>
          </div>
          <p className="mt-0.5 truncate text-[11px] text-[#6B7280]">{summaryNames}</p>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#E2EEE8]">
            <div
              className={cn(
                'h-full rounded-full transition-[width]',
                stats.complete ? 'bg-[#0A6640]' : 'bg-[#D97706]',
              )}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-[#4B6358] transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open ? (
        <div className="border-t border-[#E2EEE8] bg-white px-3 py-3">
          {application ? (
            <ApplicationDocumentUpload
              compact
              serviceId={serviceId}
              offeringId={offeringId}
              offering={offering}
              application={application}
              onUpload={onUpload}
              onRemove={onRemove}
              onRefresh={onRefresh}
            />
          ) : (
            <div>
              <p className="mb-3 text-xs text-[#4B6358]">
                Start your request below so you can upload each file here, then complete your
                details and submit this step.
              </p>
              <DocumentList
                documents={offering.documentRequirements}
                eligibilityRules={offering.eligibilityRules}
              />
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
