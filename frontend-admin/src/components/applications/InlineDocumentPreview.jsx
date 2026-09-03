import { useEffect, useState } from 'react';
import { isPreviewableMimeType } from '@/api/applications.api';

export function InlineDocumentPreview({ document, fetchBlob }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!document || !fetchBlob) {
      setLoading(false);
      return undefined;
    }

    let active = true;
    let objectUrl = null;

    const loadPreview = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await fetchBlob(document);
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
  }, [document, fetchBlob]);

  const previewable = isPreviewableMimeType(document?.mimeType, document?.originalName);
  const isPdf =
    String(document?.mimeType ?? '').toLowerCase() === 'application/pdf' ||
    String(document?.originalName ?? '').toLowerCase().endsWith('.pdf');

  if (loading) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-[#E2EEE8] bg-[#F9FCFB] text-sm text-[#4B6358]">
        Loading preview...
      </div>
    );
  }

  if (error) {
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
