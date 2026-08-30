import { useCallback, useState } from 'react';
import { Download, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DocumentPreviewModal } from '@/components/applications/DocumentPreviewModal';

/**
 * @param {{
 *   intake: { id: string, documents?: Array<any> };
 *   api: {
 *     fetchDocumentBlob: (intakeId: string, documentId: string) => Promise<{ data: Blob }>;
 *     downloadDocument: (intakeId: string, document: any) => Promise<unknown>;
 *   };
 * }} props
 */
export function IntakeDocumentsSection({ intake, api }) {
  const [previewDocument, setPreviewDocument] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchBlob = useCallback(
    (document) => api.fetchDocumentBlob(intake.id, document.id),
    [api, intake.id],
  );

  const handleDownload = async (document) => {
    setDownloadingId(document.id);
    try {
      await api.downloadDocument(intake.id, document);
    } finally {
      setDownloadingId(null);
    }
  };

  if (!intake.documents?.length) return null;

  return (
    <div className="mt-6">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#9CA3AF]">
        Uploaded documents
      </p>
      <ul className="mt-3 space-y-2">
        {intake.documents.map((document) => (
          <li
            key={document.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E2EEE8] bg-[#F9FCFB] px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium text-[#052E1C]">{document.requirementName}</p>
              <p className="mt-1 text-xs text-[#4B6358]">{document.originalName}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPreviewDocument(document)}
              >
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={downloadingId === document.id}
                onClick={() => handleDownload(document)}
              >
                <Download className="mr-2 h-4 w-4" />
                {downloadingId === document.id ? 'Downloading…' : 'Download'}
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <DocumentPreviewModal
        open={Boolean(previewDocument)}
        onClose={() => setPreviewDocument(null)}
        applicationId={intake.id}
        document={previewDocument}
        fetchBlob={fetchBlob}
        onDownload={handleDownload}
      />
    </div>
  );
}
