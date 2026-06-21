import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, ClipboardCheck, Clock3, ListChecks, MapPinned } from 'lucide-react';
import { toast } from 'sonner';
import { PublicLayout } from '@/components/StudentLayout';
import { EnrollmentOfferingSkeleton } from '@/components/skeletons';
import { EnrollmentAccordion } from '@/components/enrollment/EnrollmentAccordion';
import { EligibilityList } from '@/components/enrollment/EligibilityList';
import { DocumentList } from '@/components/enrollment/DocumentList';
import { EnrollmentProcessTimeline } from '@/components/enrollment/EnrollmentProcessTimeline';
import { ApplicationPanel } from '@/components/enrollment/ApplicationPanel';
import {
  createEmptyPhoneValue,
  serializeApplicantDetailsForSubmit,
  validateApplicantPhoneFields,
  validatePhoneInput,
} from '@/utils/phone';
import { studentApi } from '@/api/student.api';
import {
  formatOfferingWindow,
  formatQueueMode,
  getOfferingStats,
  getTotalSlaLabel,
} from '@/utils/offering';
import { formatOperatingHoursRange } from '@/utils/operatingHours';

export function EnrollOfferingPage() {
  const { instituteId, offeringId } = useParams();
  const navigate = useNavigate();
  const [institute, setInstitute] = useState(null);
  const [offering, setOffering] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [applicantName, setApplicantName] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [applicantMobile, setApplicantMobile] = useState(createEmptyPhoneValue);
  const [intakeDocumentFile, setIntakeDocumentFile] = useState(null);
  const [applicantDetails, setApplicantDetails] = useState({});
  const [intakeStatus, setIntakeStatus] = useState(null);
  const [checkingIntake, setCheckingIntake] = useState(false);

  useEffect(() => {
    Promise.all([
      studentApi.getInstitute(instituteId),
      studentApi.getEnrollmentOffering(instituteId, offeringId),
    ])
      .then(([instituteRes, offeringRes]) => {
        setInstitute(instituteRes.data.data.institute);
        setOffering(offeringRes.data.data.offering);
      })
      .catch((err) => {
        toast.error(err.message || 'Failed to load programme');
        navigate(`/${instituteId}/enroll`, { replace: true });
      })
      .finally(() => setLoading(false));
  }, [instituteId, offeringId, navigate]);

  useEffect(() => {
    const email = applicantEmail.trim();
    if (!email || !email.includes('@')) {
      setIntakeStatus(null);
      return undefined;
    }

    setCheckingIntake(true);
    const timer = window.setTimeout(() => {
      studentApi
        .getEnrollmentIntakeStatus(instituteId, offeringId, email)
        .then(({ data }) => setIntakeStatus(data.data.intake ?? null))
        .catch(() => setIntakeStatus(null))
        .finally(() => setCheckingIntake(false));
    }, 400);

    return () => window.clearTimeout(timer);
  }, [applicantEmail, instituteId, offeringId]);

  const onSubmit = async (event) => {
    event.preventDefault();
    if (intakeStatus?.canSubmit === false) {
      toast.error(intakeStatus.message || 'You cannot submit another request right now.');
      return;
    }

    const mobileResult = validatePhoneInput(applicantMobile);
    if (!mobileResult.valid) {
      toast.error(mobileResult.error || 'Enter a valid mobile number');
      return;
    }

    const phoneFieldError = validateApplicantPhoneFields(
      offering?.applicantFields ?? [],
      applicantDetails,
    );
    if (phoneFieldError) {
      toast.error(phoneFieldError);
      return;
    }

    const intakeDocument = offering?.intakeDocument;
    if (intakeDocument?.label && intakeDocument.required !== false && !intakeDocumentFile) {
      toast.error(`Please upload your ${intakeDocument.label}`);
      return;
    }

    setSubmitting(true);
    try {
      await studentApi.createApplication(
        instituteId,
        {
          offeringId,
          applicantName,
          applicantEmail,
          applicantMobile: mobileResult.e164,
          applicantDetails: serializeApplicantDetailsForSubmit(
            offering?.applicantFields ?? [],
            applicantDetails,
          ),
        },
        intakeDocumentFile,
      );
      toast.success('Request submitted. Your institute will review authorization before you can sign in.');
      setApplicantName('');
      setApplicantEmail('');
      setApplicantMobile(createEmptyPhoneValue());
      setIntakeDocumentFile(null);
      setApplicantDetails({});
      setIntakeStatus(null);
    } catch (err) {
      toast.error(err.message || 'Failed to start application');
    } finally {
      setSubmitting(false);
    }
  };

  const eligibilityCount = offering?.eligibilityRules?.length ?? 0;
  const documentCount = offering?.documentRequirements?.length ?? 0;
  const processCount = offering?.workflowSteps?.length ?? 0;

  if (loading) {
    return (
      <PublicLayout instituteName={institute?.name} instituteId={instituteId}>
        <EnrollmentOfferingSkeleton />
      </PublicLayout>
    );
  }

  return (
    <PublicLayout instituteName={institute?.name} instituteId={instituteId}>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <Link
          to={`/${instituteId}/enroll`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#0A6640]"
        >
          <ArrowLeft className="h-4 w-4" />
          All programmes
        </Link>

        <div className="mt-5 rounded-xl border border-[#D1EEE0] bg-white/90 p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#10B981]">
                Programme details
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#052E1C]">
                {offering?.name ?? 'Programme details'}
              </h1>
              {offering?.description && (
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#4B6358]">
                  {offering.description}
                </p>
              )}
              {!institute?.name ? null : (
                <p className="mt-2 text-xs font-medium text-[#6B7280]">{institute.name}</p>
              )}
              {offering?.visitLocation ? (
                <p className="mt-3 inline-flex items-start gap-2 rounded-lg border border-[#E2EEE8] bg-[#F9FCFB] px-3 py-2 text-xs font-medium text-[#052E1C]">
                  <MapPinned className="mt-0.5 h-4 w-4 shrink-0 text-[#0A6640]" />
                  <span>
                    {offering.visitLocation}
                    {offering.visitInstructions ? (
                      <span className="mt-1 block font-normal text-[#4B6358]">
                        {offering.visitInstructions}
                      </span>
                    ) : null}
                  </span>
                </p>
              ) : null}
            </div>
            <div className="grid gap-2 text-sm sm:grid-cols-2 lg:w-80 lg:grid-cols-1">
              <MetaPill icon={CalendarDays} label={formatOfferingWindow(offering)} />
              <MetaPill icon={MapPinned} label={formatQueueMode(offering.queueMode)} />
              <MetaPill icon={Clock3} label={getTotalSlaLabel(offering.workflowSteps)} />
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {getOfferingStats(offering).map((stat) => (
                <div key={stat.label} className="rounded-xl border border-[#E2EEE8] bg-[#F9FCFB] p-4">
                  <p className="text-2xl font-bold text-[#052E1C]">{stat.value}</p>
                  <p className="mt-1 text-xs font-semibold text-[#4B6358]">{stat.label}</p>
                </div>
              ))}
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.75fr)] lg:items-start">
          <div className="space-y-4">
            <EnrollmentAccordion
              title="Am I eligible?"
              count={eligibilityCount}
              defaultOpen
            >
              <EligibilityList rules={offering?.eligibilityRules} />
            </EnrollmentAccordion>

            <EnrollmentAccordion title="Documents you'll need" count={documentCount}>
              <DocumentList documents={offering?.documentRequirements} />
            </EnrollmentAccordion>

            <EnrollmentAccordion title="Enrollment process" count={processCount}>
              <EnrollmentProcessTimeline steps={offering?.workflowSteps} />
            </EnrollmentAccordion>

            <EnrollmentAccordion title="Queue or appointment access" count={offering?.queueMode ? 1 : 0}>
              <AccessModePanel offering={offering} />
            </EnrollmentAccordion>
          </div>

          <div className="lg:sticky lg:top-24">
            <ApplicationPanel
              visible
              offering={offering}
              applicantName={applicantName}
              applicantEmail={applicantEmail}
              applicantMobile={applicantMobile}
              intakeDocumentFile={intakeDocumentFile}
              applicantDetails={applicantDetails}
              onNameChange={setApplicantName}
              onEmailChange={setApplicantEmail}
              onMobileChange={setApplicantMobile}
              onIntakeDocumentChange={setIntakeDocumentFile}
              onApplicantDetailChange={(fieldKey, value) =>
                setApplicantDetails((current) => ({ ...current, [fieldKey]: value }))
              }
              onSubmit={onSubmit}
              submitting={submitting}
              intakeStatus={intakeStatus}
              checkingIntake={checkingIntake}
            />
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

function MetaPill({ icon: Icon, label }) {
  return (
    <span className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#E2EEE8] bg-[#F9FCFB] px-3 text-xs font-semibold text-[#052E1C]">
      <Icon className="h-4 w-4 shrink-0 text-[#0A6640]" />
      {label}
    </span>
  );
}

function AccessModePanel({ offering }) {
  const hasQueue = offering.queueMode === 'queue_only' || offering.queueMode === 'hybrid';
  const hasAppointment = offering.queueMode === 'appointment_only' || offering.queueMode === 'hybrid';

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#4B6358]">
        For this programme you can{' '}
        <span className="font-semibold text-[#052E1C]">{formatQueueMode(offering.queueMode).toLowerCase()}</span>.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {hasQueue && (
          <div className="rounded-xl border border-[#E2EEE8] bg-[#F9FCFB] p-4">
            <ListChecks className="h-4 w-4 text-[#0A6640]" />
            <p className="mt-2 text-sm font-semibold text-[#052E1C]">Walk-in queue</p>
            <p className="mt-1 text-xs text-[#4B6358]">
              Join the queue when you visit. About{' '}
              {offering.queueConfig?.capacity ?? 'limited'} students can wait at a time.
            </p>
          </div>
        )}
        {hasAppointment && (
          <div className="rounded-xl border border-[#E2EEE8] bg-[#F9FCFB] p-4">
            <ClipboardCheck className="h-4 w-4 text-[#0A6640]" />
            <p className="mt-2 text-sm font-semibold text-[#052E1C]">Book a time slot</p>
            <p className="mt-1 text-xs text-[#4B6358]">
              {offering.appointmentConfig?.slotDurationMinutes ?? 'Flexible'}-minute slots between{' '}
              {formatOperatingHoursRange(
                offering.appointmentConfig?.operatingHoursStart ?? '09:00',
                offering.appointmentConfig?.operatingHoursEnd ?? '17:00',
              )}
              .
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
