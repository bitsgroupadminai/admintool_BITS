import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { GlobalLoader } from '@/components/ui/GlobalLoader';
import { fetchStudentDocumentBlob, isPreviewableMimeType } from '@/utils/documentFile';

export function DocumentPreviewModal({
  open,
  onClose,
  document,
  serviceId,
  offeringId,
  onDownload,
}) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !document) {
      setPreviewUrl(null);
      setError('');
      return undefined;
    }

    let active = true;
    let objectUrl = null;

    const loadPreview = async () => {
      setLoading(true);
      setError('');
      try {
        const blob = await fetchStudentDocumentBlob(serviceId, offeringId, document.id);
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
      } catch (err) {
        if (active) {
          setError(err.message || 'Could not load preview');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadPreview();

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, document, serviceId, offeringId]);

  if (!open || !document) return null;

  const previewable = isPreviewableMimeType(document.mimeType);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[#052E1C]/45 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close preview"
      />
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#E2EEE8] bg-white shadow-[0_24px_80px_rgba(5,46,28,0.25)]">
        <div className="flex items-center justify-between gap-3 border-b border-[#E2EEE8] px-5 py-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[#052E1C]">{document.originalName}</p>
            <p className="mt-0.5 text-xs text-[#4B6358]">{document.requirementName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onDownload?.(document)}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#C4E8D4] bg-[#F0FAF5] px-3 text-xs font-semibold text-[#0A6640]"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E2EEE8] text-[#4B6358] hover:bg-[#F9FCFB]"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-[320px] flex-1 overflow-auto bg-[#F9FCFB] p-4">
          {loading ? (
            <GlobalLoader label="Loading preview..." variant="inline" />
          ) : error ? (
            <p className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">
              {error}
            </p>
          ) : previewable && previewUrl ? (
            document.mimeType === 'application/pdf' ? (
              <iframe
                title={document.originalName}
                src={previewUrl}
                className="h-[70vh] w-full rounded-xl border border-[#E2EEE8] bg-white"
              />
            ) : (
              <img
                src={previewUrl}
                alt={document.originalName}
                className="mx-auto max-h-[70vh] rounded-xl border border-[#E2EEE8] bg-white object-contain"
              />
            )
          ) : (
            <p className="rounded-xl border border-[#E2EEE8] bg-white px-4 py-3 text-sm text-[#4B6358]">
              Preview is not available for this file type. Use download instead.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
