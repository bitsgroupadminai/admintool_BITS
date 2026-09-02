import { useRef, useState } from 'react';
import { CheckCircle2, Download, Eye, FileUp, Trash2, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { DocumentPreviewModal } from '@/components/services/DocumentPreviewModal';
import {
  buildAcceptAttribute,
  formatFileSize,
  getDocumentProgressLabel,
  getMissingRequiredDocuments,
  getUploadedDocumentMap,
  validateFileForRequirement,
} from '@/utils/applicationDocuments';
import { downloadStudentDocument, isPreviewableMimeType } from '@/utils/documentFile';
import { groupEligibilityNotesByDocument, documentEligibilityKey } from '@/utils/eligibility';

function DocumentUploadRow({
  requirement,
  uploadedDocument,
  canEdit,
  uploading,
  onUpload,
  onRemove,
  onPreview,
  onDownload,
  eligibilityNotes = [],
}) {
  const inputRef = useRef(null);
  const [selectedName, setSelectedName] = useState('');

  const handleChoose = () => {
    inputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const validationError = validateFileForRequirement(file, requirement);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSelectedName(file.name);
    try {
      await onUpload(requirement.id, file);
      setSelectedName('');
    } catch {
      setSelectedName('');
    }
  };

  const isUploaded = Boolean(uploadedDocument);

  return (
    <div className="rounded-xl border border-[#E2EEE8] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {isUploaded ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#0A6640]" />
          ) : (
            <FileUp className="h-4 w-4 shrink-0 text-[#9CA3AF]" />
          )}
          <p className="truncate text-sm font-semibold text-[#052E1C]">{requirement.name}</p>
          {requirement.required !== false ? (
            <span className="shrink-0 rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#92400E]">
              Required
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">
              Optional
            </span>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          {isUploaded ? (
            <>
              {isPreviewableMimeType(uploadedDocument.mimeType) ? (
                <button
                  type="button"
                  onClick={() => onPreview(uploadedDocument)}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#C4E8D4] bg-white px-3 text-xs font-semibold text-[#0A6640] hover:bg-[#F0FAF5]"
                >
                  <Eye className="h-3.5 w-3.5" />
                  View
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => onDownload(uploadedDocument)}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#C4E8D4] bg-white px-3 text-xs font-semibold text-[#0A6640] hover:bg-[#F0FAF5]"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </button>
            </>
          ) : null}

          {canEdit ? (
            <>
              <button
                type="button"
                onClick={handleChoose}
                disabled={uploading}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#C4E8D4] bg-[#F0FAF5] px-3 text-xs font-semibold text-[#0A6640] hover:bg-[#E3F5EC] disabled:opacity-60"
              >
                <UploadCloud className="h-3.5 w-3.5" />
                {isUploaded ? 'Replace' : 'Upload'}
              </button>
              {isUploaded ? (
                <button
                  type="button"
                  onClick={() => onRemove(requirement.id)}
                  disabled={uploading}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 text-xs font-semibold text-[#B91C1C] hover:bg-[#FEE2E2] disabled:opacity-60"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              ) : null}
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept={buildAcceptAttribute(requirement.allowedTypes)}
                onChange={handleFileChange}
              />
            </>
          ) : null}
        </div>
      </div>

      {eligibilityNotes.length > 0 ? (
        <div className="mt-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#0A6640]">
            This file should confirm
          </p>
          <ul className="mt-1 space-y-0.5">
            {eligibilityNotes.map((note) => (
              <li key={note} className="text-[11px] leading-snug text-[#4B6358]">
                {note}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-2 text-xs text-[#4B6358]">
        Accepted: {(requirement.allowedTypes ?? ['pdf']).map((type) => type.toUpperCase()).join(', ')}
        {' · '}
        Max {requirement.maxSizeMb ?? 5} MB
      </p>

      {isUploaded ? (
        <p className="mt-2 break-words text-xs font-medium text-[#0A6640]">
          Uploaded: {uploadedDocument.originalName} ({formatFileSize(uploadedDocument.sizeBytes)})
        </p>
      ) : selectedName ? (
        <p className="mt-2 break-words text-xs text-[#4B6358]">Selected: {selectedName}</p>
      ) : (
        <p className="mt-2 text-xs text-[#92400E]">Not uploaded yet</p>
      )}
    </div>
  );
}

export function ApplicationDocumentUpload({
  serviceId,
  offeringId,
  offering,
  application,
  onUpload,
  onRemove,
  onRefresh,
  compact = false,
}) {
  const [uploadingId, setUploadingId] = useState(null);
  const [previewDocument, setPreviewDocument] = useState(null);
  const requirements = offering?.documentRequirements ?? [];
  const uploadedMap = getUploadedDocumentMap(application);
  const eligibilityNotesByDocument = groupEligibilityNotesByDocument(
    requirements,
    offering?.eligibilityRules,
  );
  const canEdit =
    application?.status === 'draft' || application?.status === 'needs_correction';
  const missingRequired = getMissingRequiredDocuments(offering, application);
  const progressLabel = getDocumentProgressLabel(offering, application);

  if (!requirements.length) {
    return (
      <div className="rounded-xl border border-[#E2EEE8] bg-white px-4 py-3 text-sm text-[#4B6358]">
        No documents are required for this request.
      </div>
    );
  }

  const handleUpload = async (requirementId, file) => {
    setUploadingId(requirementId);
    try {
      await onUpload(requirementId, file);
      toast.success('Document uploaded');
      await onRefresh?.();
    } catch (err) {
      toast.error(err.message || 'Could not upload document');
      throw err;
    } finally {
      setUploadingId(null);
    }
  };

  const handleRemove = async (requirementId) => {
    setUploadingId(requirementId);
    try {
      await onRemove(requirementId);
      toast.success('Document removed');
      await onRefresh?.();
    } catch (err) {
      toast.error(err.message || 'Could not remove document');
    } finally {
      setUploadingId(null);
    }
  };

  const handleDownload = async (document) => {
    try {
      await downloadStudentDocument(serviceId, offeringId, document, true);
    } catch (err) {
      toast.error(err.message || 'Could not download document');
    }
  };

  return (
    <>
      <div className="space-y-4">
        {compact ? null : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-[#052E1C]">Upload your documents</p>
              <p className="mt-1 text-xs text-[#4B6358]">
                {canEdit
                  ? 'Upload every required document before you submit your request.'
                  : 'View or download the documents attached to your submitted request.'}
              </p>
            </div>
            <span
              className={
                missingRequired.length === 0
                  ? 'rounded-full bg-[#ECFDF5] px-3 py-1 text-xs font-semibold text-[#0A6640]'
                  : 'rounded-full bg-[#FEF3C7] px-3 py-1 text-xs font-semibold text-[#92400E]'
              }
            >
              {progressLabel}
            </span>
          </div>
        )}

        <div className="space-y-3">
          {requirements.map((requirement) => (
            <DocumentUploadRow
              key={requirement.id}
              requirement={requirement}
              uploadedDocument={uploadedMap.get(requirement.id)}
              canEdit={canEdit}
              uploading={uploadingId === requirement.id}
              onUpload={handleUpload}
              onRemove={handleRemove}
              onPreview={setPreviewDocument}
              onDownload={handleDownload}
              eligibilityNotes={eligibilityNotesByDocument.get(documentEligibilityKey(requirement)) ?? []}
            />
          ))}
        </div>

        {canEdit && missingRequired.length > 0 ? (
          <p className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-xs text-[#92400E]">
            Still needed: {missingRequired.map((item) => item.name).join(', ')}
          </p>
        ) : null}
      </div>

      <DocumentPreviewModal
        open={Boolean(previewDocument)}
        onClose={() => setPreviewDocument(null)}
        document={previewDocument}
        serviceId={serviceId}
        offeringId={offeringId}
        onDownload={handleDownload}
      />
    </>
  );
}
