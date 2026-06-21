import { Send, Sparkles } from 'lucide-react';
import {
  areAllRequiredDocumentsUploaded,
  getDocumentProgressLabel,
  getMissingRequiredDocuments,
  getRequiredDocuments,
} from '@/utils/applicationDocuments';
import {
  areApplicantDetailsComplete,
  getMissingApplicantFields,
} from '@/utils/applicantDetails';
import { getApplicationStatusLabel, getPrimaryAction } from '@/utils/studentJourney';
import { ApplicationDocumentUpload } from '@/components/services/ApplicationDocumentUpload';
import { DocumentList } from '@/components/enrollment/DocumentList';
import { ApplicantDetailsForm } from '@/components/enrollment/ApplicantDetailsForm';
import { PaymentPanel } from '@/components/services/PaymentPanel';
import { isPaymentPending } from '@/utils/payment';
import { formatPhoneForDisplay } from '@/utils/phone';

export function ServiceRequestPanel({
  serviceId,
  offeringId,
  offering,
  application,
  applicantDetails,
  onApplicantDetailChange,
  onSaveApplicantDetails,
  onStart,
  onSubmit,
  onResubmit,
  onUploadDocument,
  onRemoveDocument,
  onRefresh,
  starting,
  submitting,
  resubmitting,
  savingDetails,
  onWithdraw,
  withdrawing,
}) {
  const action = getPrimaryAction(application, offering, applicantDetails);
  const statusLabel = getApplicationStatusLabel(application?.status);
  const requiredDocuments = getRequiredDocuments(offering?.documentRequirements ?? []);
  const documentsComplete = areAllRequiredDocumentsUploaded(offering, application);
  const missingRequired = getMissingRequiredDocuments(offering, application);
  const applicantFields = offering?.applicantFields ?? [];
  const hasApplicantFields = applicantFields.length > 0;
  const detailsComplete = areApplicantDetailsComplete(offering, applicantDetails);
  const missingApplicantFields = getMissingApplicantFields(offering, applicantDetails);
  const canEditDocuments =
    application?.status === 'draft' || application?.status === 'needs_correction';
  const paymentPending = isPaymentPending(application);
  const showUploadPanel = Boolean(application) && requiredDocuments.length > 0 && canEditDocuments;
  const showApplicantForm =
    hasApplicantFields && (!application || canEditDocuments);
  const showSavedApplicantSummary =
    hasApplicantFields && application && !canEditDocuments;

  const handleAction = () => {
    if (action?.type === 'start') return onStart?.();
    if (action?.type === 'submit') return onSubmit?.();
    if (action?.type === 'resubmit') return onResubmit?.();
    return undefined;
  };

  const isBusy = starting || submitting || resubmitting || savingDetails;

  return (
    <div className="rounded-2xl border border-[#C4E8D4] bg-gradient-to-br from-[#F0FAF5] to-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#10B981]">
            Your request
          </p>
          <h3 className="mt-1 text-lg font-bold text-[#052E1C]">Complete this service</h3>
          <p className="mt-1 text-sm text-[#4B6358]">
            {application?.status === 'draft'
              ? 'Upload required documents, then submit when everything is ready.'
              : application?.status === 'needs_correction'
                ? 'Update the requested items, then resubmit for review.'
                : 'Follow the steps below, then start and submit when you are ready.'}
          </p>
        </div>
        <span
          className={
            application?.status === 'draft'
              ? 'rounded-full bg-[#FEF3C7] px-3 py-1 text-xs font-semibold text-[#92400E]'
              : application?.status === 'needs_correction'
                ? 'rounded-full bg-[#FEE2E2] px-3 py-1 text-xs font-semibold text-[#B91C1C]'
                : application
                  ? 'rounded-full bg-[#ECFDF5] px-3 py-1 text-xs font-semibold text-[#0A6640]'
                  : 'rounded-full bg-[#F3F4F6] px-3 py-1 text-xs font-semibold text-[#6B7280]'
          }
        >
          {statusLabel}
        </span>
      </div>

      {application?.status === 'needs_correction' && application?.correctionNote ? (
        <div className="mt-5 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-4">
          <p className="text-sm font-semibold text-[#991B1B]">Correction requested</p>
          <p className="mt-2 text-sm text-[#7F1D1D]">{application.correctionNote}</p>
          {(application.correctionRequiredDocuments ?? []).length > 0 ? (
            <p className="mt-2 text-xs text-[#7F1D1D]">
              Update: {application.correctionRequiredDocuments.join(', ')}
            </p>
          ) : null}
        </div>
      ) : null}

      {showApplicantForm ? (
        <div className="mt-5 rounded-xl border border-[#E2EEE8] bg-white p-4">
          <p className="text-sm font-semibold text-[#052E1C]">Your information</p>
          <p className="mt-1 text-xs text-[#4B6358]">
            {application
              ? 'Update these details before you submit your request.'
              : 'Complete these details before starting your request.'}
          </p>
          <div className="mt-4">
            <ApplicantDetailsForm
              fields={applicantFields}
              values={applicantDetails ?? {}}
              onChange={onApplicantDetailChange}
            />
          </div>
          {application && canEditDocuments && onSaveApplicantDetails ? (
            <button
              type="button"
              onClick={onSaveApplicantDetails}
              disabled={isBusy || !detailsComplete}
              className="mt-4 rounded-xl border border-[#C4E8D4] bg-[#F0FAF5] px-4 py-2 text-sm font-semibold text-[#0A6640] hover:bg-[#E6F7EF] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingDetails ? 'Saving...' : 'Save details'}
            </button>
          ) : null}
          {!detailsComplete && missingApplicantFields.length > 0 ? (
            <p className="mt-3 text-xs text-[#92400E]">
              Required: {missingApplicantFields.map((field) => field.label).join(', ')}
            </p>
          ) : null}
        </div>
      ) : null}

      {showSavedApplicantSummary ? (
        <div className="mt-5 rounded-xl border border-[#E2EEE8] bg-white p-4">
          <p className="text-sm font-semibold text-[#052E1C]">Your information</p>
          <dl className="mt-3 space-y-2">
            {(application.applicantDetails ?? []).map((item) => (
              <div key={item.fieldKey} className="flex gap-3 text-sm">
                <dt className="min-w-[120px] font-medium text-[#4B6358]">{item.label}</dt>
                <dd className="text-[#052E1C]">
                  {typeof item.value === 'string' && item.value.startsWith('+')
                    ? formatPhoneForDisplay(item.value)
                    : String(item.value ?? '—')}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      {!application && (offering?.documentRequirements?.length ?? 0) > 0 ? (
        <div className="mt-5 rounded-xl border border-[#E2EEE8] bg-white p-4">
          <p className="text-sm font-semibold text-[#052E1C]">Documents you will need</p>
          <p className="mt-1 text-xs text-[#4B6358]">
            Start your request first, then upload each required file here.
          </p>
          <div className="mt-3">
            <DocumentList documents={offering.documentRequirements} />
          </div>
        </div>
      ) : null}

      {showUploadPanel ? (
        <div className="mt-5 rounded-xl border border-[#E2EEE8] bg-white p-4">
          <ApplicationDocumentUpload
            serviceId={serviceId}
            offeringId={offeringId}
            offering={offering}
            application={application}
            onUpload={onUploadDocument}
            onRemove={onRemoveDocument}
            onRefresh={onRefresh}
          />
        </div>
      ) : null}

      {(offering?.paymentConfig?.enabled || application?.payment?.required) ? (
        <div className="mt-5">
          <PaymentPanel
            serviceId={serviceId}
            offeringId={offeringId}
            offering={offering}
            application={application}
            onPaid={onRefresh}
          />
        </div>
      ) : null}

      {canEditDocuments && requiredDocuments.length > 0 ? (
        <p className="mt-4 text-xs font-medium text-[#4B6358]">
          {getDocumentProgressLabel(offering, application)}
        </p>
      ) : null}

      {action ? (
        <button
          type="button"
          onClick={handleAction}
          disabled={isBusy || (action.type !== 'start' && !documentsComplete) || paymentPending}
          className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0A6640] text-sm font-semibold text-white hover:bg-[#084F31] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-6"
        >
          {action.type === 'start' ? (
            <Sparkles className="h-4 w-4" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {starting
            ? 'Starting...'
            : submitting
              ? 'Submitting...'
              : resubmitting
                ? 'Resubmitting...'
                : action.label}
        </button>
      ) : canEditDocuments && paymentPending ? (
        <p className="mt-5 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3 text-sm text-[#1E40AF]">
          Complete the fee payment above before submitting your request.
        </p>
      ) : canEditDocuments && !documentsComplete ? (
        <p className="mt-5 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-sm text-[#92400E]">
          Upload all required documents before submitting
          {missingRequired.length > 0 ? `: ${missingRequired.map((item) => item.name).join(', ')}` : '.'}
        </p>
      ) : canEditDocuments && hasApplicantFields && !detailsComplete ? (
        <p className="mt-5 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-sm text-[#92400E]">
          Complete your information before submitting
          {missingApplicantFields.length > 0
            ? `: ${missingApplicantFields.map((field) => field.label).join(', ')}`
            : '.'}
        </p>
      ) : (
        <p className="mt-5 rounded-xl border border-[#E2EEE8] bg-white px-4 py-3 text-sm text-[#4B6358]">
          {application?.status === 'submitted' || application?.status === 'in_review'
            ? 'Your request is with the institute. You will be notified when there is an update.'
            : application?.status === 'needs_correction'
              ? 'Update the requested documents, then resubmit when everything is ready.'
              : application?.status === 'admitted'
                ? 'This request has been approved. Contact your institute if you need anything else.'
                : application?.status === 'rejected'
                  ? 'This request was not approved. Contact your institute office if you need help.'
                  : 'Your request is in progress.'}
        </p>
      )}

      {application?.id &&
      ['draft', 'submitted', 'in_review', 'needs_correction'].includes(application.status) &&
      onWithdraw ? (
        <button
          type="button"
          onClick={onWithdraw}
          disabled={withdrawing}
          className="mt-4 text-sm font-semibold text-[#B91C1C] hover:underline disabled:opacity-60"
        >
          {withdrawing ? 'Withdrawing...' : 'Withdraw this request'}
        </button>
      ) : null}
    </div>
  );
}
