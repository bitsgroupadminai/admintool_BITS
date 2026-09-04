import { useEffect, useState } from 'react';
import { Download, X, ZoomIn, ZoomOut } from 'lucide-react';
import {
  applicationsApi,
  downloadApplicationDocument,
  isPreviewableMimeType,
} from '@/api/applications.api';
import { downloadStaffApplicationDocument, staffApplicationsApi } from '@/api/staffApplications.api';
import { cn } from '@/lib/utils';

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

export function DocumentPreviewModal({
  open,
  onClose,
  applicationId,
  document,
  mode = 'admin',
  fetchBlob,
  onDownload,
}) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(1);
  const [orientation, setOrientation] = useState(null);

  useEffect(() => {
    if (!open || !document || (!fetchBlob && !applicationId)) {
      setPreviewUrl(null);
      setError('');
      setZoom(1);
      setOrientation(null);
      return undefined;
    }

    let active = true;
    let objectUrl = null;

    const loadPreview = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = fetchBlob
          ? await fetchBlob(document)
          : mode === 'staff'
            ? await staffApplicationsApi.fetchDocumentBlob(applicationId, document.id)
            : await applicationsApi.fetchDocumentBlob(applicationId, document.id);
        if (!active) return;
        objectUrl = URL.createObjectURL(data);
        setPreviewUrl(objectUrl);
      } catch (err) {
        if (active) setError(err.message || 'Could not load preview');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadPreview();

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, document, applicationId, mode, fetchBlob]);

  if (!open || !document) return null;

  const previewable = isPreviewableMimeType(document.mimeType, document.originalName);
  const isPdf =
    String(document.mimeType ?? '').toLowerCase() === 'application/pdf' ||
    String(document.originalName ?? '').toLowerCase().endsWith('.pdf');
  const handleDownload = () => {
    if (onDownload) return onDownload(document);
    return mode === 'staff'
      ? downloadStaffApplicationDocument(applicationId, document)
      : downloadApplicationDocument(applicationId, document);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[#052E1C]/45 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close preview"
      />
      <div className="relative flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[#E2EEE8] bg-white shadow-[0_24px_80px_rgba(5,46,28,0.25)]">
        <div className="flex items-center justify-between gap-3 border-b border-[#E2EEE8] px-5 py-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[#052E1C]">{document.originalName}</p>
            <p className="mt-0.5 text-xs text-[#4B6358]">{document.requirementName}</p>
          </div>
          <div className="flex items-center gap-2">
            {!isPdf && previewable ? (
              <div className="flex items-center gap-1 rounded-lg border border-[#E2EEE8] bg-[#F9FCFB] p-0.5">
                <button
                  type="button"
                  onClick={() => setZoom((value) => Math.max(MIN_ZOOM, Number((value - ZOOM_STEP).toFixed(2))))}
                  disabled={zoom <= MIN_ZOOM}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-[#0A6640] hover:bg-white disabled:opacity-40"
                  aria-label="Zoom out"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="min-w-[3rem] text-center text-xs font-semibold text-[#052E1C]">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((value) => Math.min(MAX_ZOOM, Number((value + ZOOM_STEP).toFixed(2))))}
                  disabled={zoom >= MAX_ZOOM}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-[#0A6640] hover:bg-white disabled:opacity-40"
                  aria-label="Zoom in"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
              </div>
            ) : null}
            <button
              type="button"
              onClick={handleDownload}
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

        <div className="min-h-0 flex-1 overflow-auto bg-[#F4F7F3] p-4">
          {loading ? (
            <div className="flex h-full min-h-[320px] items-center justify-center text-sm text-[#4B6358]">
              Loading preview...
            </div>
          ) : error ? (
            <p className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">
              {error}
            </p>
          ) : previewable && previewUrl ? (
            isPdf ? (
              <iframe
                title={document.originalName}
                src={previewUrl}
                className="h-full min-h-[75vh] w-full rounded-xl border border-[#E2EEE8] bg-white"
              />
            ) : (
              <div className="flex h-full min-h-full items-start justify-center overflow-auto">
                <img
                  src={previewUrl}
                  alt={document.originalName}
                  onLoad={(event) => {
                    const { naturalWidth, naturalHeight } = event.currentTarget;
                    setOrientation(naturalHeight > naturalWidth ? 'portrait' : 'landscape');
                  }}
                  className={cn(
                    'rounded-xl border border-[#E2EEE8] bg-white object-contain',
                    zoom === 1 && orientation === 'portrait' && 'h-full w-auto max-w-full',
                    zoom === 1 && orientation === 'landscape' && 'h-auto max-h-full w-full',
                    zoom === 1 && !orientation && 'max-h-full max-w-full',
                    zoom > 1 && orientation === 'portrait' && 'w-auto max-w-none',
                    zoom > 1 && orientation !== 'portrait' && 'h-auto max-h-none',
                  )}
                  style={
                    zoom > 1
                      ? orientation === 'portrait'
                        ? { height: `${zoom * 100}%` }
                        : { width: `${zoom * 100}%` }
                      : undefined
                  }
                />
              </div>
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
