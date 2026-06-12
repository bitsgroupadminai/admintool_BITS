import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { OfferingWizardNav } from '@/components/offerings/OfferingWizardNav';
import { AiStepAssist } from '@/components/offerings/AiStepAssist';
import { WorkflowTimelineBuilder } from '@/components/offerings/WorkflowTimelineBuilder';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { GlobalLoader } from '@/components/ui/GlobalLoader';
import { offeringsApi } from '@/api/offerings.api';
import { servicesApi } from '@/api/services.api';
import { userApi } from '@/api/user.api';
import { createStep, normalizeSteps, relinkStepOutcomes } from '@/utils/workflow';

const OPERATORS = [
  { value: 'eq', label: '=' },
  { value: 'neq', label: '≠' },
  { value: 'gte', label: '≥' },
  { value: 'lte', label: '≤' },
  { value: 'gt', label: '>' },
  { value: 'lt', label: '<' },
];

const FIELD_TYPES = [
  { value: 'numeric', label: 'Numeric' },
  { value: 'text', label: 'Text' },
  { value: 'boolean', label: 'Boolean' },
];

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

export function OfferingConfigurePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const step = searchParams.get('step') || 'eligibility';

  const [offering, setOffering] = useState(null);
  const [service, setService] = useState(null);
  const [staffRoles, setStaffRoles] = useState(STAFF_ROLES_FALLBACK);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [generatingSection, setGeneratingSection] = useState(null);

  const [rules, setRules] = useState([]);
  const [docs, setDocs] = useState([]);
  const [steps, setSteps] = useState([]);
  const [queueMode, setQueueMode] = useState('queue_only');
  const [queueConfig, setQueueConfig] = useState({ capacity: 50, processingRatePerHour: 10 });
  const [appointmentConfig, setAppointmentConfig] = useState({
    slotDurationMinutes: 15,
    slotCapacity: 5,
    operatingHoursStart: '09:00',
    operatingHoursEnd: '17:00',
  });

  const goToStep = (next) => setSearchParams({ step: next });

  const defaultRule = () => ({
    field: 'Marks',
    fieldType: 'numeric',
    operator: 'gte',
    value: 60,
  });

  const defaultDoc = () => ({
    name: 'Government ID',
    required: true,
    allowedTypes: ['pdf', 'jpg', 'jpeg', 'png'],
    maxSizeMb: 5,
  });

  const defaultSteps = () => relinkStepOutcomes([createStep(1), createStep(2)]);

  const loadOffering = async () => {
    const { data } = await offeringsApi.get(id);
    const o = data.data.offering;
    setOffering(o);
    setRules(o.eligibilityRules?.length ? o.eligibilityRules : [defaultRule()]);
    setDocs(o.documentRequirements?.length ? o.documentRequirements : [defaultDoc()]);
    const wf = o.workflowSteps?.length ? normalizeSteps(o.workflowSteps) : defaultSteps();
    setSteps(relinkStepOutcomes(wf));
    if (o.queueMode) setQueueMode(o.queueMode);
    if (o.queueConfig) setQueueConfig(o.queueConfig);
    if (o.appointmentConfig) setAppointmentConfig(o.appointmentConfig);

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
      setAiSuggestions(data.data.suggestions);
      toast.success(data.message);
    } catch (err) {
      toast.error(err.message || 'Could not generate suggestions');
    } finally {
      setGeneratingSection(null);
    }
  };

  const applyAiSection = async (section) => {
    try {
      const { data } = await offeringsApi.applyAi(id, { section });
      setOffering(data.data.offering);
      await loadOffering();
      toast.success('Suggestions applied');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const dismissAi = async () => {
    await offeringsApi.rejectAi(id);
    setAiSuggestions(null);
    toast.success('Suggestions dismissed');
  };

  const saveEligibility = async () => {
    try {
      const { data } = await offeringsApi.updateEligibility(id, rules);
      setOffering(data.data.offering);
      toast.success('Eligibility rules saved');
      goToStep('documents');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const saveDocuments = async () => {
    try {
      const { data } = await offeringsApi.updateDocuments(id, docs);
      setOffering(data.data.offering);
      toast.success('Document requirements saved');
      goToStep('workflow');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const saveWorkflow = async () => {
    try {
      const { data } = await offeringsApi.updateWorkflow(id, steps);
      setOffering(data.data.offering);
      toast.success('Workflow saved');
      goToStep('queue');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const saveQueue = async () => {
    try {
      const payload = { queueMode };
      if (queueMode === 'queue_only' || queueMode === 'hybrid') {
        payload.queueConfig = queueConfig;
      }
      if (queueMode === 'appointment_only' || queueMode === 'hybrid') {
        payload.appointmentConfig = appointmentConfig;
      }
      const { data } = await offeringsApi.updateQueue(id, payload);
      setOffering(data.data.offering);
      toast.success('Queue configuration saved');
      goToStep('review');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleActivate = async () => {
    try {
      const { data } = await offeringsApi.activate(id);
      setOffering(data.data.offering);
      toast.success('Offering is now active');
      navigate(`/admin/services/${offering.serviceId}`);
    } catch (err) {
      toast.error(err.message || 'Cannot activate — complete all configuration');
    }
  };

  if (!offering) {
    return (
      <AdminLayout>
        <div className="mx-auto max-w-4xl px-6 py-8">
          <GlobalLoader label="Loading offering..." />
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

  return (
    <AdminLayout>
      <div className="mx-auto max-w-4xl px-6 py-8">
        <Link
          to={`/admin/services/${offering.serviceId}`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {service?.name ?? 'service'}
        </Link>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{offering.name}</h1>
            <p className="text-sm text-muted">Configure offering · {service?.name}</p>
          </div>
          <Badge variant={offering.status}>{offering.status}</Badge>
        </div>

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

        <OfferingWizardNav currentStep={step} completeness={offering.completeness} />

        {step === 'eligibility' && (
          <Card>
            <CardHeader>
              <CardTitle>Eligibility rules</CardTitle>
              <CardDescription>All rules use AND logic. Use &ldquo;Extract from documents&rdquo; to pull exact criteria stated in your uploads.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <AiStepAssist
                section="eligibility"
                sectionLabel={SECTION_LABELS.eligibility}
                aiSuggestions={aiSuggestions}
                generating={generatingSection === 'eligibility'}
                onGenerate={handleGenerateAi}
                onApply={applyAiSection}
                onDismiss={dismissAi}
                canGenerate={canUseAi}
              />
              {rules.map((rule, i) => (
                <div key={i} className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-4">
                  <Input
                    placeholder="Field"
                    value={rule.field}
                    onChange={(e) => {
                      const next = [...rules];
                      next[i].field = e.target.value;
                      setRules(next);
                    }}
                  />
                  <select
                    className="h-10 rounded-lg border border-border px-3 text-sm"
                    value={rule.fieldType}
                    onChange={(e) => {
                      const next = [...rules];
                      next[i].fieldType = e.target.value;
                      setRules(next);
                    }}
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <select
                    className="h-10 rounded-lg border border-border px-3 text-sm"
                    value={rule.operator}
                    onChange={(e) => {
                      const next = [...rules];
                      next[i].operator = e.target.value;
                      setRules(next);
                    }}
                  >
                    {OPERATORS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Value"
                      value={String(rule.value)}
                      onChange={(e) => {
                        const next = [...rules];
                        let val = e.target.value;
                        if (rule.fieldType === 'numeric') val = Number(val);
                        if (rule.fieldType === 'boolean') val = val === 'true';
                        next[i].value = val;
                        setRules(next);
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRules(rules.filter((_, idx) => idx !== i))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={() => setRules([...rules, defaultRule()])}>
                <Plus className="h-4 w-4" />
                Add rule
              </Button>
              <div className="flex justify-end pt-4">
                <Button onClick={saveEligibility}>Save & continue</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'documents' && (
          <Card>
            <CardHeader>
              <CardTitle>Document requirements</CardTitle>
              <CardDescription>Defines what students must upload before workflow steps run.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <AiStepAssist
                section="documents"
                sectionLabel={SECTION_LABELS.documents}
                aiSuggestions={aiSuggestions}
                generating={generatingSection === 'documents'}
                onGenerate={handleGenerateAi}
                onApply={applyAiSection}
                onDismiss={dismissAi}
                canGenerate={canUseAi}
              />
              {docs.map((doc, i) => (
                <div key={i} className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2">
                  <Input
                    placeholder="Document name"
                    value={doc.name}
                    onChange={(e) => {
                      const next = [...docs];
                      next[i].name = e.target.value;
                      setDocs(next);
                    }}
                  />
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={doc.required}
                        onChange={(e) => {
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
                        const next = [...docs];
                        next[i].maxSizeMb = Number(e.target.value);
                        setDocs(next);
                      }}
                    />
                    <span className="text-xs text-muted">MB max</span>
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={() => setDocs([...docs, defaultDoc()])}>
                <Plus className="h-4 w-4" />
                Add document
              </Button>
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => goToStep('eligibility')}>
                  Back
                </Button>
                <Button onClick={saveDocuments}>Save & continue</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'workflow' && (
          <Card>
            <CardHeader>
              <CardTitle>Workflow timeline</CardTitle>
              <CardDescription>
                Build a vertical timeline with staff, student, or AI handlers and outcome-based routing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <AiStepAssist
                section="workflow"
                sectionLabel={SECTION_LABELS.workflow}
                aiSuggestions={aiSuggestions}
                generating={generatingSection === 'workflow'}
                onGenerate={handleGenerateAi}
                onApply={applyAiSection}
                onDismiss={dismissAi}
                canGenerate={canUseAi}
              />
              <WorkflowTimelineBuilder
                steps={steps}
                onChange={setSteps}
                staffRoles={staffRoles}
                documentRequirements={docs}
              />
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => goToStep('documents')}>
                  Back
                </Button>
                <Button onClick={saveWorkflow}>Save & continue</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'queue' && (
          <Card>
            <CardHeader>
              <CardTitle>Queue & appointment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <AiStepAssist
                section="queue"
                sectionLabel={SECTION_LABELS.queue}
                aiSuggestions={aiSuggestions}
                generating={generatingSection === 'queue'}
                onGenerate={handleGenerateAi}
                onApply={applyAiSection}
                onDismiss={dismissAi}
                canGenerate={canUseAi}
              />
              <div className="space-y-2">
                <Label>Mode</Label>
                <select
                  className="h-10 w-full rounded-lg border border-border px-3 text-sm"
                  value={queueMode}
                  onChange={(e) => setQueueMode(e.target.value)}
                >
                  <option value="queue_only">Queue only</option>
                  <option value="appointment_only">Appointment only</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
              {(queueMode === 'queue_only' || queueMode === 'hybrid') && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Queue capacity</Label>
                    <Input
                      type="number"
                      value={queueConfig.capacity}
                      onChange={(e) =>
                        setQueueConfig({ ...queueConfig, capacity: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Processing rate / hour</Label>
                    <Input
                      type="number"
                      value={queueConfig.processingRatePerHour}
                      onChange={(e) =>
                        setQueueConfig({
                          ...queueConfig,
                          processingRatePerHour: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
              )}
              {(queueMode === 'appointment_only' || queueMode === 'hybrid') && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Slot duration (minutes)</Label>
                    <Input
                      type="number"
                      value={appointmentConfig.slotDurationMinutes}
                      onChange={(e) =>
                        setAppointmentConfig({
                          ...appointmentConfig,
                          slotDurationMinutes: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Slots per window</Label>
                    <Input
                      type="number"
                      value={appointmentConfig.slotCapacity}
                      onChange={(e) =>
                        setAppointmentConfig({
                          ...appointmentConfig,
                          slotCapacity: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Opens</Label>
                    <Input
                      value={appointmentConfig.operatingHoursStart}
                      onChange={(e) =>
                        setAppointmentConfig({
                          ...appointmentConfig,
                          operatingHoursStart: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Closes</Label>
                    <Input
                      value={appointmentConfig.operatingHoursEnd}
                      onChange={(e) =>
                        setAppointmentConfig({
                          ...appointmentConfig,
                          operatingHoursEnd: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              )}
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => goToStep('workflow')}>
                  Back
                </Button>
                <Button onClick={saveQueue}>Save & continue</Button>
              </div>
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
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">Eligibility rules</dt>
                  <dd>{offering.eligibilityRules?.length ?? 0}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Documents</dt>
                  <dd>{offering.documentRequirements?.length ?? 0}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Workflow steps</dt>
                  <dd>{offering.workflowSteps?.length ?? 0}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Queue mode</dt>
                  <dd>{offering.queueMode?.replace('_', ' ') ?? '—'}</dd>
                </div>
              </dl>
              {!offering.completeness?.isComplete && (
                <p className="rounded-lg border border-sage-light bg-warning-surface px-3 py-2 text-sm text-warning">
                  Incomplete: {offering.completeness.missing.join(', ').replace(/_/g, ' ')}
                </p>
              )}
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => goToStep('queue')}>
                  Back
                </Button>
                <Button onClick={handleActivate} disabled={!offering.completeness?.isComplete}>
                  Activate offering
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
