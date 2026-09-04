import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, MapPin, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { OfferingWizardNav, WIZARD_STEPS } from '@/components/offerings/OfferingWizardNav';
import { ApplicantFieldBuilder } from '@/components/offerings/ApplicantFieldBuilder';
import {
  IntakeDocumentConfig,
  intakeDocumentFromOffering,
  intakeDocumentToPayload,
} from '@/components/offerings/IntakeDocumentConfig';
import { AiStepAssist } from '@/components/offerings/AiStepAssist';
import { DocumentEligibilityCard } from '@/components/offerings/DocumentEligibilityCard';
import { WorkflowTimelineBuilder } from '@/components/offerings/WorkflowTimelineBuilder';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import { FieldError } from '@/components/ui/field-error';
import { Badge } from '@/components/ui/badge';
import { OfferingConfigureSkeleton } from '@/components/skeletons';
import { cn } from '@/lib/utils';
import { offeringsApi } from '@/api/offerings.api';
import { servicesApi } from '@/api/services.api';
import { userApi } from '@/api/user.api';
import { createStep, hasAudienceInstructions, normalizeSteps, relinkStepOutcomes } from '@/utils/workflow';
import { formatOfferingMissing } from '@/constants/offeringCompleteness.constants';
import {
  normalizeOperatingHoursTime,
  validateOperatingHoursInput,
} from '@/utils/operatingHours';
import { validateOfferingDetails } from '@/utils/offeringDetails.validation';
import {
  defaultDocumentEligibility,
  documentHasEligibilityCriteria,
  eligibilityPayload,
  emptyDocumentEligibility,
  isAcademicDocumentName,
  normalizeDocumentEligibility,
  requiredSubjectsMissingThreshold,
} from '@/utils/documentEligibility';

const STAFF_ROLES_FALLBACK = [
  { value: 'document_verifier', label: 'Document Verifier' },
  { value: 'approver', label: 'Approver' },
  { value: 'counter_staff', label: 'Counter Staff' },
  { value: 'general', label: 'General Staff' },
];

const SECTION_LABELS = {
  eligibility: 'eligibility rules',
  documents: 'document requirements',
  workflow: 'workflow steps',
  queue: 'queue settings',
};

function sectionHasExtractedContent(suggestions, section) {
  const payload = suggestions?.payload;
  if (!payload) return false;
  if (section === 'eligibility') return Boolean(payload.eligibilityRules?.length);
  if (section === 'documents') return Boolean(payload.documentRequirements?.length);
  if (section === 'workflow') return Boolean(payload.workflowSteps?.length);
  if (section === 'queue') return Boolean(payload.queueMode);
  return false;
}

function toDateInput(value) {
  if (!value) return '';
  // Use India calendar day — UTC slice() shifts dates back one day for IST midnights.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}

function toInstituteIsoDateTime(dateYmd, endOfDay = false) {
  if (!dateYmd) return null;
  const time = endOfDay ? 'T23:59:59.999+05:30' : 'T00:00:00.000+05:30';
  return new Date(`${dateYmd}${time}`).toISOString();
}

function StepFooter({ onBack, onSaveDraft, onContinue, saving, continueLabel = 'Save & continue' }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
      {onBack ? (
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
      ) : (
        <div />
      )}
      <div className="flex flex-wrap gap-2">
        {onSaveDraft ? (
          <Button type="button" variant="outline" onClick={onSaveDraft} disabled={saving}>
            Save draft
          </Button>
        ) : null}
        <Button type="button" onClick={onContinue} disabled={saving}>
          {continueLabel}
        </Button>
      </div>
    </div>
  );
}

export function OfferingConfigurePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const step = searchParams.get('step') || 'details';

  const [offering, setOffering] = useState(null);
  const [service, setService] = useState(null);
  const [staffRoles, setStaffRoles] = useState(STAFF_ROLES_FALLBACK);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [generatingSection, setGeneratingSection] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dirtySteps, setDirtySteps] = useState({});
  const [showDetailsValidation, setShowDetailsValidation] = useState(false);

  const [detailsForm, setDetailsForm] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
  });
  const [applicantFields, setApplicantFields] = useState([]);
  const [intakeDocument, setIntakeDocument] = useState(intakeDocumentFromOffering());
  const [visitDetails, setVisitDetails] = useState({
    visitLocation: '',
    visitInstructions: '',
  });
  const [docs, setDocs] = useState([]);
  const [steps, setSteps] = useState([]);
  const [queueMode, setQueueMode] = useState('queue_only');
  const [queueConfig, setQueueConfig] = useState({
    capacity: 50,
    processingRatePerHour: 10,
    counters: [],
  });
  const [paymentConfig, setPaymentConfig] = useState({
    enabled: false,
    amount: '',
    label: '',
    timing: 'before_submit',
    workflowStepId: '',
  });
  const [appointmentConfig, setAppointmentConfig] = useState({
    slotDurationMinutes: 15,
    slotCapacity: 5,
    operatingHoursStart: '09:00',
    operatingHoursEnd: '17:00',
    operatingDays: [1, 2, 3, 4, 5],
    bookingHorizonDays: 14,
    virtualAppointment: {
      enabled: false,
      allowedProviders: ['google_meet', 'zoom'],
      defaultProvider: 'google_meet',
      autoGenerateLink: true,
      autoSendLinkOnConfirm: true,
      allowAdditionalRecipients: true,
      maxAdditionalRecipients: 50,
    },
  });

  const markDirty = (stepId) => {
    setDirtySteps((current) => ({ ...current, [stepId]: true }));
  };

  const clearDirty = (stepId) => {
    setDirtySteps((current) => ({ ...current, [stepId]: false }));
  };

  const goToStep = (next) => setSearchParams({ step: next });

  const navigateToStep = (next) => {
    if (next === step) return;
    if (dirtySteps[step]) {
      const shouldLeave = window.confirm(
        'You have unsaved changes on this step. Leave without saving?',
      );
      if (!shouldLeave) return;
      clearDirty(step);
    }
    goToStep(next);
  };

  const defaultDoc = () => ({
    name: 'Government ID',
    required: true,
    allowedTypes: ['pdf', 'jpg', 'jpeg', 'png'],
    maxSizeMb: 5,
    eligibility: defaultDocumentEligibility('Government ID'),
  });

  const defaultSteps = () => relinkStepOutcomes([createStep(1), createStep(2)]);

  const loadOffering = async () => {
    const { data } = await offeringsApi.get(id);
    const o = data.data.offering;
    setOffering(o);
    setDetailsForm({
      name: o.name ?? '',
      description: o.description ?? '',
      startDate: toDateInput(o.startDate),
      endDate: toDateInput(o.endDate),
    });
    setApplicantFields(o.applicantFields ?? []);
    setIntakeDocument(intakeDocumentFromOffering(o));
    setPaymentConfig({
      enabled: o.paymentConfig?.enabled ?? false,
      amount: o.paymentConfig?.amount ?? '',
      label: o.paymentConfig?.label ?? '',
      timing: o.paymentConfig?.timing ?? 'before_submit',
      workflowStepId: o.paymentConfig?.workflowStepId ?? '',
    });
    setVisitDetails({
      visitLocation: o.visitLocation ?? '',
      visitInstructions: o.visitInstructions ?? '',
    });
    setDocs(
      o.documentRequirements?.length
        ? o.documentRequirements.map((doc) => ({
            ...doc,
            eligibility: doc.eligibility
              ? normalizeDocumentEligibility(doc.eligibility, doc.name)
              : o.eligibilityRules?.length
                ? emptyDocumentEligibility()
                : defaultDocumentEligibility(doc.name),
          }))
        : [defaultDoc()],
    );
    const wf = o.workflowSteps?.length ? normalizeSteps(o.workflowSteps) : defaultSteps();
    setSteps(relinkStepOutcomes(wf));
    if (o.queueMode) setQueueMode(o.queueMode);
    if (o.queueConfig) {
      setQueueConfig({
        capacity: o.queueConfig.capacity ?? 50,
        processingRatePerHour: o.queueConfig.processingRatePerHour ?? 10,
        counters: o.queueConfig.counters ?? [],
      });
    }
    if (o.appointmentConfig) {
      setAppointmentConfig({
        slotDurationMinutes: o.appointmentConfig.slotDurationMinutes ?? 15,
        slotCapacity: o.appointmentConfig.slotCapacity ?? 5,
        operatingHoursStart: normalizeOperatingHoursTime(
          o.appointmentConfig.operatingHoursStart,
          '09:00',
        ),
        operatingHoursEnd: normalizeOperatingHoursTime(
          o.appointmentConfig.operatingHoursEnd,
          '17:00',
        ),
        operatingDays: o.appointmentConfig.operatingDays ?? [1, 2, 3, 4, 5],
        bookingHorizonDays: o.appointmentConfig.bookingHorizonDays ?? 14,
        virtualAppointment: {
          enabled: o.appointmentConfig.virtualAppointment?.enabled ?? false,
          allowedProviders: o.appointmentConfig.virtualAppointment?.allowedProviders ?? ['google_meet', 'zoom'],
          defaultProvider: o.appointmentConfig.virtualAppointment?.defaultProvider ?? 'google_meet',
          autoGenerateLink: o.appointmentConfig.virtualAppointment?.autoGenerateLink ?? true,
          autoSendLinkOnConfirm: o.appointmentConfig.virtualAppointment?.autoSendLinkOnConfirm ?? true,
          allowAdditionalRecipients: o.appointmentConfig.virtualAppointment?.allowAdditionalRecipients ?? true,
          maxAdditionalRecipients: o.appointmentConfig.virtualAppointment?.maxAdditionalRecipients ?? 50,
        },
      });
    }
    setDirtySteps({});

    const serviceRes = await servicesApi.get(o.serviceId);
    setService(serviceRes.data.data.service);

    try {
      const aiRes = await offeringsApi.getAi(id);
      setAiSuggestions(aiRes.data.data.suggestions);
    } catch {
      setAiSuggestions(null);
    }
  };

  useEffect(() => {
    userApi.getStaffRoles().then((res) => {
      setStaffRoles(res.data.data.roles);
    });
    loadOffering().catch((err) => toast.error(err.message));
  }, [id]);

  const handleGenerateAi = async (section) => {
    setGeneratingSection(section);
    try {
      const { data } = await offeringsApi.generateAi(id, { section });
      const suggestions = data.data.suggestions;
      setAiSuggestions(suggestions);
      const label = SECTION_LABELS[section];

      if (!suggestions?.sourceDocumentCount) {
        toast.warning('Upload knowledge documents on the service first, then extract again.');
        return;
      }

      if (!sectionHasExtractedContent(suggestions, section)) {
        toast.warning(
          `Nothing could be extracted for ${label} from the uploaded documents. Add them below manually, or upload a document that states them clearly.`,
        );
        return;
      }

      await offeringsApi.applyAi(id, { section });
      await loadOffering();
      toast.success(`${label.charAt(0).toUpperCase()}${label.slice(1)} have been populated below.`);
    } catch (err) {
      toast.error(err.message || 'Could not extract from documents');
    } finally {
      setGeneratingSection(null);
    }
  };

  const saveDetails = async ({ advance = false } = {}) => {
    setShowDetailsValidation(true);
    const validation = validateOfferingDetails({
      name: detailsForm.name,
      description: detailsForm.description,
      startDate: detailsForm.startDate,
      endDate: detailsForm.endDate,
      applicantFields,
      intakeDocument,
    });

    if (!validation.valid) {
      toast.error('Fix the highlighted issues before saving');
      return false;
    }

    setSaving(true);
    try {
      const { data } = await offeringsApi.updateDetails(id, {
        name: detailsForm.name.trim(),
        description: detailsForm.description.trim(),
        startDate: toInstituteIsoDateTime(detailsForm.startDate, false),
        endDate: toInstituteIsoDateTime(detailsForm.endDate, true),
        applicantFields: applicantFields.map((field, index) => ({
          ...field,
          label: field.label.trim(),
          order: index + 1,
        })),
        intakeDocument: intakeDocumentToPayload(intakeDocument),
      });
      setOffering(data.data.offering);
      clearDirty('details');
      setShowDetailsValidation(false);
      toast.success('Offering details saved');
      if (advance) goToStep('documents');
      return true;
    } catch (err) {
      toast.error(err.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveEligibility = async ({ advance = false } = {}) => {
    if (!docs.length) {
      toast.error('Add documents first, then set eligibility on each file');
      goToStep('documents');
      return false;
    }

    const incomplete = docs.filter(
      (doc) => doc.eligibility?.enabled && !documentHasEligibilityCriteria(doc.eligibility),
    );
    if (incomplete.length) {
      toast.error(
        `Add at least one criterion for ${incomplete.map((doc) => doc.name).join(', ')}, or turn eligibility off`,
      );
      return false;
    }

    const missingSubjectMins = docs.filter((doc) =>
      requiredSubjectsMissingThreshold(doc.eligibility),
    );
    if (missingSubjectMins.length) {
      toast.error(
        `Set a minimum score for required subjects on ${missingSubjectMins.map((doc) => doc.name).join(', ')}`,
      );
      return false;
    }

    setSaving(true);
    try {
      const { data } = await offeringsApi.updateEligibility(
        id,
        docs.map((doc) => ({
          name: doc.name,
          eligibility: eligibilityPayload(doc.eligibility),
        })),
      );
      setOffering(data.data.offering);
      clearDirty('eligibility');
      toast.success('Eligibility criteria saved');
      if (advance) goToStep('workflow');
      return true;
    } catch (err) {
      toast.error(err.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveDocuments = async ({ advance = false } = {}) => {
    setSaving(true);
    try {
      const { data } = await offeringsApi.updateDocuments(
        id,
        docs.map((doc) => ({
          name: doc.name,
          required: doc.required,
          allowedTypes: doc.allowedTypes,
          maxSizeMb: doc.maxSizeMb,
          eligibility: eligibilityPayload(doc.eligibility ?? defaultDocumentEligibility(doc.name)),
        })),
      );
      setOffering(data.data.offering);
      clearDirty('documents');
      toast.success('Document requirements saved');
      if (advance) goToStep('eligibility');
      return true;
    } catch (err) {
      toast.error(err.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveWorkflow = async ({ advance = false } = {}) => {
    const missing = steps.find((step) => !hasAudienceInstructions(step));
    if (missing) {
      toast.error(
        `“${missing.name || 'Untitled step'}” needs staff, admin, and student instructions. Extract from documents or enter them on the step.`,
      );
      return false;
    }

    setSaving(true);
    try {
      const { data } = await offeringsApi.updateWorkflow(id, steps);
      setOffering(data.data.offering);
      clearDirty('workflow');
      toast.success('Workflow saved');
      if (advance) goToStep('queue');
      return true;
    } catch (err) {
      toast.error(err.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const savePayment = async ({ advance = false } = {}) => {
    if (paymentConfig.enabled) {
      if (!paymentConfig.label?.trim()) {
        toast.error('Enter a fee label (e.g. Admission fee)');
        return false;
      }
      if (!paymentConfig.amount || Number(paymentConfig.amount) < 1) {
        toast.error('Enter a valid fee amount');
        return false;
      }
      if (paymentConfig.timing === 'workflow_step' && !paymentConfig.workflowStepId) {
        toast.error('Select the workflow step where payment is collected');
        return false;
      }
    }

    setSaving(true);
    try {
      const payload = paymentConfig.enabled
        ? {
            enabled: true,
            amount: Number(paymentConfig.amount),
            currency: 'INR',
            label: paymentConfig.label.trim(),
            timing: paymentConfig.timing,
            workflowStepId:
              paymentConfig.timing === 'workflow_step'
                ? paymentConfig.workflowStepId || null
                : null,
          }
        : { enabled: false };

      const { data } = await offeringsApi.updatePayment(id, payload);
      setOffering(data.data.offering);
      setPaymentConfig({
        enabled: data.data.offering.paymentConfig?.enabled ?? false,
        amount: data.data.offering.paymentConfig?.amount ?? '',
        label: data.data.offering.paymentConfig?.label ?? '',
        timing: data.data.offering.paymentConfig?.timing ?? 'before_submit',
        workflowStepId: data.data.offering.paymentConfig?.workflowStepId ?? '',
      });
      clearDirty('payment');
      toast.success('Payment settings saved');
      if (advance) goToStep('review');
      return true;
    } catch (err) {
      toast.error(err.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveQueue = async ({ advance = false } = {}) => {
    const needsAppointment = queueMode === 'appointment_only' || queueMode === 'hybrid';
    let normalizedAppointment = appointmentConfig;

    if (needsAppointment) {
      const hours = validateOperatingHoursInput(
        appointmentConfig.operatingHoursStart,
        appointmentConfig.operatingHoursEnd,
      );
      if (!hours.valid) {
        toast.error(hours.message);
        return false;
      }
      normalizedAppointment = {
        ...appointmentConfig,
        operatingHoursStart: hours.start,
        operatingHoursEnd: hours.end,
      };
    }

    setSaving(true);
    try {
      const payload = { queueMode };
      if (queueMode === 'queue_only' || queueMode === 'hybrid') {
        payload.queueConfig = queueConfig;
      }
      if (needsAppointment) {
        payload.appointmentConfig = normalizedAppointment;
      }
      await offeringsApi.updateDetails(id, {
        visitLocation: visitDetails.visitLocation.trim() || null,
        visitInstructions: visitDetails.visitInstructions.trim() || null,
      });
      await offeringsApi.updateQueue(id, payload);
      const refreshed = await offeringsApi.get(id);
      setOffering(refreshed.data.data.offering);
      clearDirty('queue');
      toast.success('Queue configuration saved');
      if (advance) goToStep('payment');
      return true;
    } catch (err) {
      toast.error(err.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async () => {
    try {
      const { data } = await offeringsApi.activate(id);
      setOffering(data.data.offering);
      toast.success('Offering is now active');
      navigate('/admin/services');
    } catch (err) {
      toast.error(err.message || 'Cannot activate — complete all configuration');
    }
  };

  const detailsValidation = useMemo(
    () =>
      validateOfferingDetails({
        name: detailsForm.name,
        description: detailsForm.description,
        startDate: detailsForm.startDate,
        endDate: detailsForm.endDate,
        applicantFields,
        intakeDocument,
      }),
    [detailsForm, applicantFields, intakeDocument],
  );

  const detailsErrors = useMemo(() => {
    const errors = showDetailsValidation ? { ...detailsValidation.errors } : {};
    if (detailsValidation.errors.endDate) {
      errors.endDate = detailsValidation.errors.endDate;
    }
    if (detailsValidation.errors.description) {
      errors.description = detailsValidation.errors.description;
    }
    return errors;
  }, [showDetailsValidation, detailsValidation]);

  if (!offering) {
    return (
      <AdminLayout>
        <div className="mx-auto max-w-4xl px-6 py-8">
          <OfferingConfigureSkeleton />
        </div>
      </AdminLayout>
    );
  }

  const insights = service?.knowledgeInsights;
  const canUseAi = Boolean(
    insights?.understandingSummary ||
      insights?.chatbotReadinessSummary ||
      insights?.chatbotCanAnswer?.length ||
      insights?.generatedAt,
  );
  const appointmentHoursPreview = validateOperatingHoursInput(
    appointmentConfig.operatingHoursStart,
    appointmentConfig.operatingHoursEnd,
  );

  return (
    <AdminLayout>
      <div className="mx-auto max-w-4xl px-6 py-8">
        <Link
          to="/admin/services"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to services
        </Link>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{detailsForm.name || offering.name}</h1>
            <p className="text-sm text-muted">Configure offering · {service?.name}</p>
          </div>
          <Badge variant={offering.status}>{offering.status}</Badge>
        </div>

        {dirtySteps[step] ? (
          <p className="mb-4 rounded-xl border border-[#F5DEC2] bg-[#FDFAF6] px-4 py-3 text-sm text-[#7A6040]">
            You have unsaved changes on this step. Use <strong>Save draft</strong> or{' '}
            <strong>Save &amp; continue</strong> before leaving, or click another step to discard
            changes.
          </p>
        ) : null}

        {(insights?.chatbotReadinessSummary || insights?.understandingSummary) && (
          <div className="mb-6 flex gap-3 rounded-xl border border-sage/30 bg-sage/5 p-4 text-sm">
            <BookOpen className="h-5 w-5 shrink-0 text-sage" />
            <div>
              <p className="font-medium text-forest">From service knowledge documents</p>
              <p className="mt-1 text-muted text-xs line-clamp-3">
                {insights.chatbotReadinessSummary ?? insights.understandingSummary}
              </p>
              {!canUseAi && (
                <p className="mt-2 text-xs text-warning">
                  Generate insights on the service page for richer AI suggestions.
                </p>
              )}
            </div>
          </div>
        )}

        <OfferingWizardNav
          currentStep={step}
          completeness={offering.completeness}
          onStepClick={navigateToStep}
        />

        {step === 'details' && (
          <Card>
            <CardHeader>
              <CardTitle>Offering details</CardTitle>
              <CardDescription>
                Programme information students see before applying, plus the personal details form
                they fill in (date of birth, address, phone, etc.).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!detailsValidation.valid && showDetailsValidation ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  Please fix the highlighted fields before saving this step.
                </div>
              ) : null}

              <section className="rounded-xl border border-border bg-[#FAFBFA] p-5">
                <h3 className="text-sm font-semibold text-forest">Programme information</h3>
                <p className="mt-1 text-xs text-muted">
                  Name, description, and when students can apply.
                </p>

                <div className="mt-4 grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="offering-name">Programme name</Label>
                    <Input
                      id="offering-name"
                      value={detailsForm.name}
                      className={detailsErrors.name ? 'border-destructive/60' : undefined}
                      onChange={(event) => {
                        markDirty('details');
                        setDetailsForm({ ...detailsForm, name: event.target.value });
                      }}
                    />
                    <FieldError message={detailsErrors.name} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="offering-description">Description</Label>
                    <textarea
                      id="offering-description"
                      rows={3}
                      value={detailsForm.description}
                      onChange={(event) => {
                        markDirty('details');
                        setDetailsForm({ ...detailsForm, description: event.target.value });
                      }}
                      className={cn(
                        'flex min-h-[88px] w-full rounded-lg border bg-surface px-3 py-2 text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20',
                        detailsErrors.description ? 'border-destructive/60' : 'border-border',
                      )}
                      placeholder="What this programme covers and who it is for."
                    />
                    <div className="flex items-center justify-between gap-3">
                      <FieldError message={detailsErrors.description} />
                      <p className="ml-auto text-xs text-muted">
                        {detailsForm.description.length}/2000
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="start-date">Applications open</Label>
                      <DatePicker
                        id="start-date"
                        value={detailsForm.startDate}
                        maxDate={detailsForm.endDate || undefined}
                        error={Boolean(detailsErrors.startDate)}
                        onChange={(nextValue) => {
                          markDirty('details');
                          setDetailsForm({ ...detailsForm, startDate: nextValue });
                        }}
                        placeholder="Select opening date"
                      />
                      <FieldError message={detailsErrors.startDate} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end-date">Applications close</Label>
                      <DatePicker
                        id="end-date"
                        value={detailsForm.endDate}
                        minDate={detailsForm.startDate || undefined}
                        error={Boolean(detailsErrors.endDate)}
                        onChange={(nextValue) => {
                          markDirty('details');
                          setDetailsForm({ ...detailsForm, endDate: nextValue });
                        }}
                        placeholder="Select closing date"
                      />
                      <FieldError message={detailsErrors.endDate} />
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-border bg-[#FAFBFA] p-5">
                <h3 className="text-sm font-semibold text-forest">Identification document at intake</h3>
                <p className="mt-1 text-xs text-muted">
                  Students upload this when they click Start application so your team can verify them
                  before authorization.
                </p>
                <div className="mt-4">
                  <IntakeDocumentConfig
                    value={intakeDocument}
                    error={showDetailsValidation ? detailsValidation.errors.intakeDocument : undefined}
                    onChange={(nextConfig) => {
                      markDirty('details');
                      setIntakeDocument(nextConfig);
                    }}
                  />
                </div>
              </section>

              <section className="rounded-xl border border-border bg-[#FAFBFA] p-5">
                <h3 className="text-sm font-semibold text-forest">Applicant personal details</h3>
                <p className="mt-1 text-xs text-muted">
                  Custom input fields students complete when starting their application.
                </p>
                <div className="mt-4">
                  <ApplicantFieldBuilder
                    fields={applicantFields}
                    fieldErrors={detailsErrors.applicantFields}
                    onChange={(nextFields) => {
                      markDirty('details');
                      setApplicantFields(nextFields);
                    }}
                  />
                </div>
              </section>

              <StepFooter
                saving={saving}
                onSaveDraft={() => saveDetails()}
                onContinue={() => saveDetails({ advance: true })}
              />
            </CardContent>
          </Card>
        )}

        {step === 'documents' && (
          <Card>
            <CardHeader>
              <CardTitle>Document requirements</CardTitle>
              <CardDescription>
                List the files students must upload. Next, you will set eligibility criteria on each
                of these documents.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <AiStepAssist
                section="documents"
                aiSuggestions={aiSuggestions}
                generating={generatingSection === 'documents'}
                onGenerate={handleGenerateAi}
                canGenerate={canUseAi}
              />
              {docs.map((doc, i) => (
                <div key={i} className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2">
                  <Input
                    placeholder="Document name, e.g. Class 12 marksheet"
                    value={doc.name}
                    onChange={(e) => {
                      markDirty('documents');
                      const next = [...docs];
                      const name = e.target.value;
                      next[i] = {
                        ...next[i],
                        name,
                        eligibility: documentHasEligibilityCriteria(next[i].eligibility)
                          ? next[i].eligibility
                          : {
                              ...defaultDocumentEligibility(name),
                              ...next[i].eligibility,
                              enabled: isAcademicDocumentName(name),
                            },
                      };
                      setDocs(next);
                    }}
                  />
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={doc.required}
                        onChange={(e) => {
                          markDirty('documents');
                          const next = [...docs];
                          next[i].required = e.target.checked;
                          setDocs(next);
                        }}
                      />
                      Required
                    </label>
                    <Input
                      type="number"
                      className="w-24"
                      value={doc.maxSizeMb}
                      onChange={(e) => {
                        markDirty('documents');
                        const next = [...docs];
                        next[i].maxSizeMb = Number(e.target.value);
                        setDocs(next);
                      }}
                    />
                    <span className="text-xs text-muted">MB max</span>
                    {docs.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          markDirty('documents');
                          setDocs(docs.filter((_, idx) => idx !== i));
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() => {
                  markDirty('documents');
                  setDocs([...docs, defaultDoc()]);
                }}
              >
                <Plus className="h-4 w-4" />
                Add document
              </Button>
              <StepFooter
                saving={saving}
                onBack={() => navigateToStep('details')}
                onSaveDraft={() => saveDocuments()}
                onContinue={() => saveDocuments({ advance: true })}
              />
            </CardContent>
          </Card>
        )}

        {step === 'eligibility' && (
          <Card>
            <CardHeader>
              <CardTitle>Eligibility by document</CardTitle>
              <CardDescription>
                Set scores on each uploaded file. Required subjects are optional — add them only
                when that marksheet must include specific subjects.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <AiStepAssist
                section="eligibility"
                aiSuggestions={aiSuggestions}
                generating={generatingSection === 'eligibility'}
                onGenerate={handleGenerateAi}
                canGenerate={canUseAi}
              />

              {!docs.length ? (
                <p className="text-sm text-muted">
                  Add document requirements first, then come back to set eligibility on each file.
                </p>
              ) : (
                docs.map((doc, i) => (
                  <DocumentEligibilityCard
                    key={`${doc.name}-${i}`}
                    document={doc}
                    index={i}
                    onChange={(index, nextDoc) => {
                      markDirty('eligibility');
                      const next = [...docs];
                      next[index] = nextDoc;
                      setDocs(next);
                    }}
                  />
                ))
              )}
              <StepFooter
                saving={saving}
                onBack={() => navigateToStep('documents')}
                onSaveDraft={() => saveEligibility()}
                onContinue={() => saveEligibility({ advance: true })}
              />
            </CardContent>
          </Card>
        )}

        {step === 'workflow' && (
          <Card>
            <CardHeader>
              <CardTitle>Workflow timeline</CardTitle>
              <CardDescription>
                Extract the journey from knowledge documents, or add steps by hand. Every step
                needs staff, admin, and student instructions so each portal knows what to do.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <AiStepAssist
                section="workflow"
                aiSuggestions={aiSuggestions}
                generating={generatingSection === 'workflow'}
                onGenerate={handleGenerateAi}
                canGenerate={canUseAi}
              />
              <WorkflowTimelineBuilder
                steps={steps}
                onChange={(nextSteps) => {
                  markDirty('workflow');
                  setSteps(nextSteps);
                }}
                staffRoles={staffRoles}
                documentRequirements={docs}
              />
              <StepFooter
                saving={saving}
                onBack={() => navigateToStep('eligibility')}
                onSaveDraft={() => saveWorkflow()}
                onContinue={() => saveWorkflow({ advance: true })}
              />
            </CardContent>
          </Card>
        )}

        {step === 'queue' && (
          <Card>
            <CardHeader>
              <CardTitle>Queue & appointment</CardTitle>
              <CardDescription>
                Configure walk-in queue capacity and appointment windows students can book.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <AiStepAssist
                section="queue"
                aiSuggestions={aiSuggestions}
                generating={generatingSection === 'queue'}
                onGenerate={handleGenerateAi}
                canGenerate={canUseAi}
              />
              <div className="space-y-2">
                <Label>Mode</Label>
                <Select
                  value={queueMode}
                  onChange={(value) => {
                    markDirty('queue');
                    setQueueMode(value);
                  }}
                  options={[
                    { value: 'queue_only', label: 'Queue only' },
                    { value: 'appointment_only', label: 'Appointment only' },
                    { value: 'hybrid', label: 'Hybrid (queue + appointment)' },
                  ]}
                />
              </div>
              {(queueMode === 'queue_only' || queueMode === 'hybrid') && (
                <div className="rounded-xl border border-border bg-[#FAFBFA] p-4">
                  <p className="text-sm font-semibold text-forest">Walk-in queue</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Queue capacity</Label>
                      <Input
                        type="number"
                        value={queueConfig.capacity}
                        onChange={(e) => {
                          markDirty('queue');
                          setQueueConfig({ ...queueConfig, capacity: Number(e.target.value) });
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Processing rate / hour</Label>
                      <Input
                        type="number"
                        value={queueConfig.processingRatePerHour}
                        onChange={(e) => {
                          markDirty('queue');
                          setQueueConfig({
                            ...queueConfig,
                            processingRatePerHour: Number(e.target.value),
                          });
                        }}
                      />
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <Label>Service counters</Label>
                    <p className="text-xs text-muted">
                      Staff assign students to a counter when calling them. Used for wait-time estimates.
                    </p>
                    {(queueConfig.counters ?? []).map((counter, index) => (
                      <div key={counter.id ?? index} className="flex flex-wrap items-center gap-2">
                        <Input
                          value={counter.label}
                          onChange={(e) => {
                            markDirty('queue');
                            const next = [...(queueConfig.counters ?? [])];
                            next[index] = { ...next[index], label: e.target.value };
                            setQueueConfig({ ...queueConfig, counters: next });
                          }}
                          placeholder="Counter name"
                          className="min-w-[160px] flex-1"
                        />
                        <label className="inline-flex items-center gap-2 text-xs text-muted">
                          <input
                            type="checkbox"
                            checked={counter.active !== false}
                            onChange={(e) => {
                              markDirty('queue');
                              const next = [...(queueConfig.counters ?? [])];
                              next[index] = { ...next[index], active: e.target.checked };
                              setQueueConfig({ ...queueConfig, counters: next });
                            }}
                          />
                          Active
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            markDirty('queue');
                            setQueueConfig({
                              ...queueConfig,
                              counters: (queueConfig.counters ?? []).filter((_, i) => i !== index),
                            });
                          }}
                          className="text-xs font-semibold text-[#B91C1C]"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        markDirty('queue');
                        const nextId = `counter-${Date.now()}`;
                        setQueueConfig({
                          ...queueConfig,
                          counters: [
                            ...(queueConfig.counters ?? []),
                            { id: nextId, label: `Counter ${(queueConfig.counters?.length ?? 0) + 1}`, active: true },
                          ],
                        });
                      }}
                      className="text-sm font-semibold text-[#0A6640] hover:underline"
                    >
                      + Add counter
                    </button>
                  </div>
                </div>
              )}
              {(queueMode === 'appointment_only' || queueMode === 'hybrid') && (
                <div className="rounded-xl border border-border bg-[#FAFBFA] p-4">
                  <p className="text-sm font-semibold text-forest">Appointments</p>
                  <p className="mt-1 text-xs text-muted">
                    Use 24-hour office hours. Students only see bookable slots inside this window.
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Slot duration (minutes)</Label>
                      <Input
                        type="number"
                        min={5}
                        value={appointmentConfig.slotDurationMinutes}
                        onChange={(e) => {
                          markDirty('queue');
                          setAppointmentConfig({
                            ...appointmentConfig,
                            slotDurationMinutes: Number(e.target.value),
                          });
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Students per slot</Label>
                      <Input
                        type="number"
                        min={1}
                        value={appointmentConfig.slotCapacity}
                        onChange={(e) => {
                          markDirty('queue');
                          setAppointmentConfig({
                            ...appointmentConfig,
                            slotCapacity: Number(e.target.value),
                          });
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hours-start">Opens</Label>
                      <TimePicker
                        id="hours-start"
                        value={appointmentConfig.operatingHoursStart}
                        onChange={(nextValue) => {
                          markDirty('queue');
                          setAppointmentConfig({
                            ...appointmentConfig,
                            operatingHoursStart: nextValue,
                          });
                        }}
                        placeholder="Opening time"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hours-end">Closes</Label>
                      <TimePicker
                        id="hours-end"
                        value={appointmentConfig.operatingHoursEnd}
                        onChange={(nextValue) => {
                          markDirty('queue');
                          setAppointmentConfig({
                            ...appointmentConfig,
                            operatingHoursEnd: nextValue,
                          });
                        }}
                        placeholder="Closing time"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Booking horizon (days)</Label>
                      <Input
                        type="number"
                        min={1}
                        max={60}
                        value={appointmentConfig.bookingHorizonDays ?? 14}
                        onChange={(e) => {
                          markDirty('queue');
                          setAppointmentConfig({
                            ...appointmentConfig,
                            bookingHorizonDays: Number(e.target.value),
                          });
                        }}
                      />
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <Label>Operating days</Label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: 0, label: 'Sun' },
                        { value: 1, label: 'Mon' },
                        { value: 2, label: 'Tue' },
                        { value: 3, label: 'Wed' },
                        { value: 4, label: 'Thu' },
                        { value: 5, label: 'Fri' },
                        { value: 6, label: 'Sat' },
                      ].map((day) => {
                        const selected = (appointmentConfig.operatingDays ?? []).includes(day.value);
                        return (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => {
                              markDirty('queue');
                              const current = appointmentConfig.operatingDays ?? [];
                              const next = selected
                                ? current.filter((value) => value !== day.value)
                                : [...current, day.value].sort((a, b) => a - b);
                              setAppointmentConfig({ ...appointmentConfig, operatingDays: next });
                            }}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                              selected
                                ? 'border-[#0A6640] bg-[#F0FAF5] text-[#0A6640]'
                                : 'border-border bg-white text-muted'
                            }`}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted">
                      Institute-wide holidays and closures are configured in Institute settings.
                    </p>
                  </div>
                  <div className="mt-4 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] p-4">
                    <label className="flex items-center gap-2 text-sm font-semibold text-[#1D4ED8]">
                      <input
                        type="checkbox"
                        checked={appointmentConfig.virtualAppointment?.enabled ?? false}
                        onChange={(e) => {
                          markDirty('queue');
                          setAppointmentConfig({
                            ...appointmentConfig,
                            virtualAppointment: {
                              ...appointmentConfig.virtualAppointment,
                              enabled: e.target.checked,
                            },
                          });
                        }}
                      />
                      Enable virtual appointments (Google Meet)
                    </label>
                    {appointmentConfig.virtualAppointment?.enabled ? (
                      <div className="mt-3 space-y-2 text-sm text-[#052E1C]">
                        <p className="rounded-lg border border-[#BFDBFE] bg-white px-3 py-2 text-xs text-[#4B6358]">
                          Staff generate real Google Meet links via Google Calendar and send them to
                          students or other emails. Students cannot invite others. Zoom support is
                          coming soon.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-lg bg-white px-2 py-1 text-xs font-semibold text-[#1D4ED8] ring-1 ring-[#BFDBFE]">
                            Google Meet — active
                          </span>
                          <span className="rounded-lg bg-[#F3F4F6] px-2 py-1 text-xs font-medium text-[#6B7280] ring-1 ring-[#E5E7EB]">
                            Zoom — coming soon
                          </span>
                        </div>
                        <div className="mt-3">
                          <Label htmlFor="virtual-max-invitees">Max additional invitees per meeting</Label>
                          <Input
                            id="virtual-max-invitees"
                            type="number"
                            min={1}
                            max={500}
                            value={appointmentConfig.virtualAppointment?.maxAdditionalRecipients ?? 50}
                            onChange={(event) => {
                              markDirty('queue');
                              setAppointmentConfig({
                                ...appointmentConfig,
                                virtualAppointment: {
                                  ...appointmentConfig.virtualAppointment,
                                  maxAdditionalRecipients: Math.min(
                                    500,
                                    Math.max(1, Number(event.target.value) || 50),
                                  ),
                                },
                              });
                            }}
                            className="mt-1.5 max-w-[200px]"
                          />
                          <p className="mt-1.5 text-xs text-[#4B6358]">
                            Staff can add up to this many extra emails when sending a Meet link (e.g. 50 or 100).
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  {!appointmentHoursPreview.valid ? (
                    <p className="mt-3 rounded-lg border border-[#F5DEC2] bg-[#FDFAF6] px-3 py-2 text-xs text-[#92561A]">
                      {appointmentHoursPreview.message}
                    </p>
                  ) : (
                    <p className="mt-3 text-xs text-muted">
                      Preview: slots generated daily from {appointmentHoursPreview.start} to{' '}
                      {appointmentHoursPreview.end}.
                    </p>
                  )}
                </div>
              )}
              <div className="rounded-xl border border-border bg-[#FAFBFA] p-4">
                <p className="text-sm font-semibold text-forest">Visit location</p>
                <p className="mt-1 text-xs text-muted">
                  Shown to students when they book a queue slot or appointment.
                </p>
                <div className="mt-3 space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="visit-location">Address / campus location</Label>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                      <Input
                        id="visit-location"
                        className="pl-9"
                        value={visitDetails.visitLocation}
                        onChange={(event) => {
                          markDirty('queue');
                          setVisitDetails({ ...visitDetails, visitLocation: event.target.value });
                        }}
                        placeholder="Admissions block, ground floor, main campus"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="visit-instructions">Visit instructions</Label>
                    <textarea
                      id="visit-instructions"
                      rows={2}
                      value={visitDetails.visitInstructions}
                      onChange={(event) => {
                        markDirty('queue');
                        setVisitDetails({ ...visitDetails, visitInstructions: event.target.value });
                      }}
                      className="flex min-h-[72px] w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                      placeholder="Bring originals, report to reception, etc."
                    />
                  </div>
                </div>
              </div>
              <StepFooter
                saving={saving}
                onBack={() => navigateToStep('workflow')}
                onSaveDraft={() => saveQueue()}
                onContinue={() => saveQueue({ advance: true })}
              />
            </CardContent>
          </Card>
        )}

        {step === 'payment' && (
          <Card>
            <CardHeader>
              <CardTitle>Service fee (Razorpay)</CardTitle>
              <CardDescription>
                Collect admission fees, ID card fees, or other charges online. For admission, use
                &quot;At a workflow step&quot; and link it to your Fee Payment step.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <label className="flex items-center gap-2 text-sm font-medium text-forest">
                <input
                  type="checkbox"
                  checked={paymentConfig.enabled}
                  onChange={(event) => {
                    markDirty('payment');
                    setPaymentConfig((current) => ({
                      ...current,
                      enabled: event.target.checked,
                    }));
                  }}
                  className="h-4 w-4 rounded border-border"
                />
                Require online payment for this option
              </label>

              {paymentConfig.enabled ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="payment-label">Fee label</Label>
                    <Input
                      id="payment-label"
                      value={paymentConfig.label}
                      placeholder="Admission fee"
                      onChange={(event) => {
                        markDirty('payment');
                        setPaymentConfig((current) => ({
                          ...current,
                          label: event.target.value,
                        }));
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment-amount">Amount (INR)</Label>
                    <Input
                      id="payment-amount"
                      type="number"
                      min="1"
                      value={paymentConfig.amount}
                      placeholder="5000"
                      onChange={(event) => {
                        markDirty('payment');
                        setPaymentConfig((current) => ({
                          ...current,
                          amount: event.target.value,
                        }));
                      }}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="payment-timing">When to collect payment</Label>
                    <Select
                      id="payment-timing"
                      value={paymentConfig.timing}
                      onChange={(value) => {
                        markDirty('payment');
                        setPaymentConfig((current) => ({
                          ...current,
                          timing: value,
                        }));
                      }}
                      options={[
                        {
                          value: 'before_submit',
                          label: 'Before student submits the request',
                        },
                        {
                          value: 'workflow_step',
                          label: 'At a workflow step (e.g. Fee Payment)',
                        },
                      ]}
                    />
                  </div>
                  {paymentConfig.timing === 'workflow_step' ? (
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="payment-step">Workflow step</Label>
                      {steps.length > 0 ? (
                        <Select
                          id="payment-step"
                          value={paymentConfig.workflowStepId}
                          placeholder="Select a step"
                          onChange={(value) => {
                            markDirty('payment');
                            setPaymentConfig((current) => ({
                              ...current,
                              workflowStepId: value,
                            }));
                          }}
                          options={steps.map((workflowStep) => ({
                            value: workflowStep.stepId,
                            label: `Step ${workflowStep.order}: ${workflowStep.name}`,
                          }))}
                        />
                      ) : (
                        <p className="text-xs text-muted">
                          Save workflow steps first (Workflow tab), then return here to link the fee
                          step.
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-muted">
                  Leave this off if the service is free. Students will not see a Pay button.
                </p>
              )}

              <StepFooter
                saving={saving}
                onBack={() => navigateToStep('queue')}
                onSaveDraft={() => savePayment()}
                onContinue={() => savePayment({ advance: true })}
              />
            </CardContent>
          </Card>
        )}

        {step === 'review' && (
          <Card>
            <CardHeader>
              <CardTitle>Review & activate</CardTitle>
              <CardDescription>
                Offering must be complete before activation. Students see only active offerings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-border bg-[#FAFBFA] p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Programme summary
                </p>
                <p className="mt-2 text-lg font-semibold text-forest">{detailsForm.name}</p>
                {detailsForm.description ? (
                  <p className="mt-2 text-sm text-muted">{detailsForm.description}</p>
                ) : null}
                {applicantFields.length > 0 ? (
                  <ul className="mt-3 space-y-1 text-sm text-foreground">
                    {applicantFields.map((field) => (
                      <li key={field.fieldKey}>
                        {field.label}
                        {field.required !== false ? ' (required)' : ' (optional)'}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-muted">No custom applicant fields configured.</p>
                )}
                {visitDetails.visitLocation ? (
                  <p className="mt-3 flex items-start gap-2 text-sm text-foreground">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
                    {visitDetails.visitLocation}
                  </p>
                ) : null}
              </div>

              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Applicant fields</dt>
                  <dd>{offering.applicantFields?.length ?? applicantFields.length}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Eligibility</dt>
                  <dd>
                    {(offering.documentRequirements ?? []).filter((doc) => doc.eligibility?.enabled)
                      .length || offering.eligibilityRules?.length || 0}{' '}
                    documents with criteria
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Documents</dt>
                  <dd>{offering.documentRequirements?.length ?? 0}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Workflow steps</dt>
                  <dd>{offering.workflowSteps?.length ?? 0}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Queue mode</dt>
                  <dd>{offering.queueMode?.replace(/_/g, ' ') ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Online fee</dt>
                  <dd>
                    {offering.paymentConfig?.enabled
                      ? `${offering.paymentConfig.label} — ₹${Number(offering.paymentConfig.amount).toLocaleString('en-IN')}`
                      : 'Not required'}
                  </dd>
                </div>
              </dl>
              {!offering.completeness?.isComplete && (
                <p className="rounded-lg border border-sage-light bg-warning-surface px-3 py-2 text-sm text-warning">
                  Still needed: {formatOfferingMissing(offering.completeness.missing).join(', ')}
                </p>
              )}
              {offering.completeness?.isComplete && offering.status !== 'active' && (
                <p className="rounded-lg border border-sage-light bg-sage/5 px-3 py-2 text-sm text-forest">
                  All sections are saved. Activate this offering to make it visible to students
                  and mark the service as active.
                </p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <Button variant="outline" onClick={() => navigateToStep('payment')}>
                  Back
                </Button>
                <div className="flex flex-wrap gap-2">
                  {WIZARD_STEPS.slice(0, -1).map((wizardStep) => (
                    <Button
                      key={wizardStep.id}
                      variant="outline"
                      size="sm"
                      onClick={() => navigateToStep(wizardStep.id)}
                    >
                      Edit {wizardStep.label.toLowerCase()}
                    </Button>
                  ))}
                  <Button onClick={handleActivate} disabled={!offering.completeness?.isComplete}>
                    Activate offering
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
