import { useEffect, useRef, useState } from 'react';
import { isPreviewableMimeType } from '@/api/applications.api';

export function InlineDocumentPreview({ document, fetchBlob }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
  const isPdf =
    String(document?.mimeType ?? '').toLowerCase() === 'application/pdf' ||
    String(document?.originalName ?? '').toLowerCase().endsWith('.pdf');

  if (loading && !previewUrl) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-[#E2EEE8] bg-[#F9FCFB] text-sm text-[#4B6358]">
        Loading preview...
      </div>
    );
  }

  if (error && !previewUrl) {
    return (
      <p className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">
        {error}
      </p>
    );
  }

  if (previewable && previewUrl) {
    if (isPdf) {
      return (
        <iframe
          title={document.originalName}
          src={previewUrl}
          className="h-[420px] w-full rounded-xl border border-[#E2EEE8] bg-white"
        />
      );
    }
    return (
      <img
        src={previewUrl}
        alt={document.originalName}
        className="mx-auto max-h-[420px] w-auto max-w-full rounded-xl border border-[#E2EEE8] bg-white object-contain"
      />
    );
  }

  return (
    <p className="rounded-xl border border-[#E2EEE8] bg-[#F9FCFB] px-4 py-3 text-sm text-[#4B6358]">
      Preview is not available for this file type. Use download instead.
    </p>
  );
}
