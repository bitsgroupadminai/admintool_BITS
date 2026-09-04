import { useEffect, useRef, useState } from 'react';
import { ZoomIn } from 'lucide-react';
import { isPreviewableMimeType } from '@/api/applications.api';
import { DocumentPreviewModal } from '@/components/applications/DocumentPreviewModal';
import { cn } from '@/lib/utils';

function isPdfDocument(document) {
  return (
    String(document?.mimeType ?? '').toLowerCase() === 'application/pdf' ||
    String(document?.originalName ?? '').toLowerCase().endsWith('.pdf')
  );
}

export function InlineDocumentPreview({ document, fetchBlob, onDownload }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orientation, setOrientation] = useState(null);
  const [zoomOpen, setZoomOpen] = useState(false);
  const fetchBlobRef = useRef(fetchBlob);
  const documentRef = useRef(document);
  const previewUrlRef = useRef(null);
  const documentId = document?.id;

  fetchBlobRef.current = fetchBlob;
  documentRef.current = document;

  useEffect(() => {
    if (!documentId || !fetchBlobRef.current) {
      setLoading(false);
      return undefined;
    }

    let active = true;
    let objectUrl = null;

    setLoading(true);
    setError('');
    setOrientation(null);

    const loadPreview = async () => {
      try {
        const { data } = await fetchBlobRef.current(documentRef.current);
        if (!active) return;
        objectUrl = URL.createObjectURL(data);
        if (previewUrlRef.current) {
          URL.revokeObjectURL(previewUrlRef.current);
        }
        previewUrlRef.current = objectUrl;
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
    };
  }, [documentId]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  const previewable = isPreviewableMimeType(document?.mimeType, document?.originalName);
  const isPdf = isPdfDocument(document);

  const frameClassName =
    'relative flex h-full min-h-[360px] w-full items-center justify-center overflow-hidden rounded-xl border border-[#E2EEE8] bg-[#F4F7F3]';

  const zoomButton = previewable && previewUrl ? (
    <button
      type="button"
      onClick={() => setZoomOpen(true)}
      className="absolute right-3 top-3 z-10 inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#C4E8D4] bg-white/95 px-3 text-xs font-semibold text-[#0A6640] shadow-sm hover:bg-[#F0FAF5]"
    >
      <ZoomIn className="h-3.5 w-3.5" />
      Zoom
    </button>
  ) : null;

  const modal = (
    <DocumentPreviewModal
      open={zoomOpen}
      onClose={() => setZoomOpen(false)}
      document={document}
      fetchBlob={fetchBlob}
      onDownload={onDownload}
    />
  );

  if (loading && !previewUrl) {
    return (
      <div className={frameClassName}>
        <p className="text-sm text-[#4B6358]">Loading preview...</p>
      </div>
    );
  }

  if (error && !previewUrl) {
    return (
      <p className="flex h-full min-h-[360px] items-center rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">
        {error}
      </p>
    );
  }

  if (previewable && previewUrl) {
    if (isPdf) {
      return (
        <>
          <div className={frameClassName}>
            {zoomButton}
            <iframe
              title={document.originalName}
              src={previewUrl}
              className="absolute inset-0 h-full w-full bg-white"
            />
          </div>
          {modal}
        </>
      );
    }

    return (
      <>
        <div className={frameClassName}>
          {zoomButton}
          <img
            src={previewUrl}
            alt={document.originalName}
            onLoad={(event) => {
              const { naturalWidth, naturalHeight } = event.currentTarget;
              setOrientation(naturalHeight > naturalWidth ? 'portrait' : 'landscape');
            }}
            className={cn(
              'bg-white object-contain',
              orientation === 'portrait' && 'h-full w-auto max-w-full',
              orientation === 'landscape' && 'h-auto max-h-full w-full',
              !orientation && 'max-h-full max-w-full',
            )}
          />
        </div>
        {modal}
      </>
    );
  }

  return (
    <p className="flex h-full min-h-[360px] items-center rounded-xl border border-[#E2EEE8] bg-[#F9FCFB] px-4 py-3 text-sm text-[#4B6358]">
      Preview is not available for this file type. Use download instead.
    </p>
  );
}
