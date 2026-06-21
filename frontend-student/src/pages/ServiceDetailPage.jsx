import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, CreditCard, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import { StudentLayout } from '@/components/StudentLayout';
import { ServiceRequestPanel } from '@/components/services/ServiceRequestPanel';
import { EligibilityPreview } from '@/components/eligibility/EligibilityPreview';
import { QueueAppointmentPanel } from '@/components/services/QueueAppointmentPanel';
import { StudentServiceJourney } from '@/components/services/StudentServiceJourney';
import { EmptyState, PageShell } from '@/components/ui/PortalCard';
import { ServiceDetailSkeleton } from '@/components/skeletons';
import { studentApi } from '@/api/student.api';
import { applicantDetailsToMap } from '@/utils/applicantDetails';
import {
  serializeApplicantDetailsForSubmit,
  validateApplicantPhoneFields,
} from '@/utils/phone';
import { formatEligibilityRule } from '@/utils/eligibility';
import { formatOfferingWindow, formatVisitAccessLabel } from '@/utils/offering';
import { useSocketEvent } from '@/contexts/SocketContext';
import { WS_EVENTS } from '@/lib/socket';

export function ServiceDetailPage() {
  const { serviceId } = useParams();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadService = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await studentApi.getService(serviceId);
      setService(data.data.service);
    } catch (err) {
      toast.error(err.message || 'Failed to load service');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    loadService();
  }, [loadService]);

  useSocketEvent(
    WS_EVENTS.APPLICATION_UPDATED,
    (payload) => {
      if (payload?.serviceId === serviceId) {
        loadService({ silent: true });
      }
    },
    [serviceId, loadService],
  );

  return (
    <StudentLayout>
      <PageShell>
        <Link
          to="/services"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#0A6640]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to services
        </Link>

        {loading ? (
          <ServiceDetailSkeleton />
        ) : (
          <>
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#10B981]">
                Service
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#052E1C]">
                {service?.name}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#4B6358]">
                {service?.description ||
                  'Pick an option below and follow the steps to complete your request.'}
              </p>
            </div>

            <div className="mt-8 space-y-8">
              {(service?.offerings ?? []).length === 0 ? (
                <EmptyState>
                  This service does not have any open options right now. Please check again later.
                </EmptyState>
              ) : (
                (service?.offerings ?? []).map((offering, index) => (
                  <OfferingSection
                    key={offering.id}
                    serviceId={serviceId}
                    offering={offering}
                    index={index + 1}
                    onRefresh={() => loadService({ silent: true })}
                  />
                ))
              )}
            </div>
          </>
        )}
      </PageShell>
    </StudentLayout>
  );
}

function OfferingSection({ serviceId, offering, index, onRefresh }) {
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resubmitting, setResubmitting] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [applicantDetails, setApplicantDetails] = useState(() =>
    applicantDetailsToMap(offering.application?.applicantDetails),
  );

  useEffect(() => {
    setApplicantDetails(applicantDetailsToMap(offering.application?.applicantDetails));
  }, [offering.application]);

  const prepareApplicantDetailsPayload = () => {
    const phoneFieldError = validateApplicantPhoneFields(
      offering?.applicantFields ?? [],
      applicantDetails,
    );
    if (phoneFieldError) {
      toast.error(phoneFieldError);
      return null;
    }

    return serializeApplicantDetailsForSubmit(offering?.applicantFields ?? [], applicantDetails);
  };

  const handleStart = async () => {
    setStarting(true);
    try {
      const payloadDetails = prepareApplicantDetailsPayload();
      if (!payloadDetails) {
        setStarting(false);
        return;
      }

      await studentApi.startServiceApplication(serviceId, offering.id, {
        applicantDetails: payloadDetails,
      });
      toast.success('Draft saved — submit when you are ready');
      await onRefresh();
    } catch (err) {
      toast.error(err.message || 'Could not start your request');
    } finally {
      setStarting(false);
    }
  };

  const handleSaveApplicantDetails = async () => {
    setSavingDetails(true);
    try {
      const payloadDetails = prepareApplicantDetailsPayload();
      if (!payloadDetails) {
        setSavingDetails(false);
        return;
      }

      await studentApi.updateServiceApplicationDetails(serviceId, offering.id, {
        applicantDetails: payloadDetails,
      });
      toast.success('Your information was saved');
      await onRefresh();
    } catch (err) {
      toast.error(err.message || 'Could not save your information');
    } finally {
      setSavingDetails(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await studentApi.submitServiceApplication(serviceId, offering.id);
      toast.success('Request submitted to the institute');
      await onRefresh();
    } catch (err) {
      toast.error(err.message || 'Could not submit your request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResubmit = async () => {
    setResubmitting(true);
    try {
      await studentApi.resubmitServiceApplication(serviceId, offering.id);
      toast.success('Updated request sent back to the institute');
      await onRefresh();
    } catch (err) {
      toast.error(err.message || 'Could not resubmit your request');
    } finally {
      setResubmitting(false);
    }
  };

  const handleUploadDocument = (requirementId, file) =>
    studentApi.uploadApplicationDocument(serviceId, offering.id, requirementId, file);

  const handleRemoveDocument = (requirementId) =>
    studentApi.removeApplicationDocument(serviceId, offering.id, requirementId);

  const handleWithdraw = async () => {
    if (!offering.application?.id) return;
    setWithdrawing(true);
    try {
      await studentApi.withdrawApplication(offering.application.id);
      toast.success('Request withdrawn');
      await onRefresh();
    } catch (err) {
      toast.error(err.message || 'Could not withdraw request');
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-[#E2EEE8] bg-white shadow-[0_4px_24px_rgba(10,102,64,0.06)]">
      <div className="border-b border-[#E2EEE8] p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="inline-flex rounded-full border border-[#B6DFC8] bg-[#F0FAF5] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#0A6640]">
              Option {String(index).padStart(2, '0')}
            </span>
            <h2 className="mt-3 text-2xl font-bold text-[#052E1C]">{offering.name}</h2>
            <p className="mt-2 text-sm text-[#4B6358]">
              Complete the steps below to finish this request.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <InfoChip icon={CalendarDays} label={formatOfferingWindow(offering)} />
          <InfoChip icon={ListChecks} label={formatVisitAccessLabel(offering, offering.application)} />
          {offering.paymentConfig?.enabled && offering.paymentConfig.amount ? (
            <InfoChip
              icon={CreditCard}
              label={`${offering.paymentConfig.label || 'Fee'}: ₹${Number(offering.paymentConfig.amount).toLocaleString('en-IN')}`}
            />
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 p-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="space-y-6">
          <SimpleList
            icon={ListChecks}
            title="Before you apply, make sure"
            items={(offering.eligibilityRules ?? []).map((rule) => formatEligibilityRule(rule))}
            empty="No special checks listed for this option."
          />

          <div>
            <h3 className="text-base font-bold text-[#052E1C]">How you complete this request</h3>
            <p className="mt-1 text-sm text-[#4B6358]">
              {offering.application?.workflow?.steps?.length
                ? 'Track where your request is in the institute review process.'
                : 'These are the steps you need to follow to complete your side of the request.'}
            </p>
            <div className="mt-5">
              <StudentServiceJourney offering={offering} application={offering.application} />
            </div>
          </div>
        </div>

        <div className="xl:sticky xl:top-24 xl:self-start space-y-6">
          <EligibilityPreview offeringId={offering.id} />
          <ServiceRequestPanel
            serviceId={serviceId}
            offeringId={offering.id}
            offering={offering}
            application={offering.application}
            applicantDetails={applicantDetails}
            onApplicantDetailChange={(fieldKey, value) =>
              setApplicantDetails((current) => ({ ...current, [fieldKey]: value }))
            }
            onSaveApplicantDetails={handleSaveApplicantDetails}
            onStart={handleStart}
            onSubmit={handleSubmit}
            onResubmit={handleResubmit}
            onUploadDocument={handleUploadDocument}
            onRemoveDocument={handleRemoveDocument}
            onRefresh={onRefresh}
            starting={starting}
            submitting={submitting}
            resubmitting={resubmitting}
            savingDetails={savingDetails}
            onWithdraw={handleWithdraw}
            withdrawing={withdrawing}
          />
          <QueueAppointmentPanel
            serviceId={serviceId}
            offering={offering}
            application={offering.application}
            onRefresh={onRefresh}
          />
        </div>
      </div>
    </section>
  );
}

function SimpleList({ icon: Icon, title, items, empty }) {
  return (
    <div className="rounded-2xl border border-[#E2EEE8] bg-[#F9FCFB] p-5">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-[#0A6640]" />
        <h3 className="text-sm font-bold text-[#052E1C]">{title}</h3>
      </div>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li
              key={item}
              className="rounded-xl border border-[#E2EEE8] bg-white px-3 py-2.5 text-sm text-[#4B6358]"
            >
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-[#4B6358]">{empty}</p>
      )}
    </div>
  );
}

function InfoChip({ icon: Icon, label }) {
  return (
    <div className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#E2EEE8] bg-[#F9FCFB] px-3 text-xs font-semibold text-[#052E1C]">
      <Icon className="h-4 w-4 shrink-0 text-[#0A6640]" />
      <span>{label}</span>
    </div>
  );
}
