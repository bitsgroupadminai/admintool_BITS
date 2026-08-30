import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { enrollmentIntakesApi } from '@/api/enrollmentIntakes.api';
import { useConfirm } from '@/components/ui/confirm-context';
import { AdminEnrollmentIntakeSkeleton } from '@/components/skeletons';
import { IntakeDocumentsSection } from '@/components/enrollment/IntakeDocumentsSection';

export function EnrollmentIntakeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [intake, setIntake] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const loadIntake = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await enrollmentIntakesApi.get(id);
      setIntake(data.data.intake);
    } catch (err) {
      toast.error(err.message || 'Failed to load enrollment intake');
      navigate('/admin/enrollment-intakes');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadIntake();
  }, [loadIntake]);

  const handleApprove = async () => {
    const ok = await confirm({
      title: 'Authorize applicant?',
      description:
        'This creates or updates the student account and lets them sign in to continue their enrollment application.',
      confirmLabel: 'Authorize',
    });
    if (!ok) return;

    setActing(true);
    try {
      const { data } = await enrollmentIntakesApi.approve(id);
      setIntake(data.data.intake);
      toast.success('Applicant authorized — login details emailed if a new account was created');
    } catch (err) {
      toast.error(err.message || 'Could not authorize intake');
    } finally {
      setActing(false);
    }
  };

  const handleReject = async (event) => {
    event.preventDefault();
    if (!rejectReason.trim()) {
      toast.error('Add a rejection reason for the applicant email');
      return;
    }

    const ok = await confirm({
      title: 'Reject authorization?',
      description: 'The applicant will receive a rejection email.',
      confirmLabel: 'Reject',
    });
    if (!ok) return;

    setActing(true);
    try {
      const { data } = await enrollmentIntakesApi.reject(id, { reason: rejectReason.trim() });
      setIntake(data.data.intake);
      setShowRejectForm(false);
      toast.success('Intake rejected — applicant notified by email');
    } catch (err) {
      toast.error(err.message || 'Could not reject intake');
    } finally {
      setActing(false);
    }
  };

  const isPending = intake?.status === 'pending_authorization';

  return (
    <AdminLayout>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <Link
          to="/admin/enrollment-intakes"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#0A6640]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to authorization queue
        </Link>

        {loading ? (
          <AdminEnrollmentIntakeSkeleton />
        ) : intake ? (
          <div className="mt-8 space-y-6">
            <div className="rounded-2xl border border-[#E2EEE8] bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#10B981]">
                    Enrollment intake
                  </p>
                  <h1 className="mt-2 text-2xl font-bold text-[#052E1C]">{intake.applicantName}</h1>
                  <p className="mt-1 text-sm text-[#4B6358]">{intake.applicantEmail}</p>
                  {intake.applicantMobile ? (
                    <p className="mt-1 text-sm text-[#4B6358]">{intake.applicantMobile}</p>
                  ) : null}
                </div>
                <Badge variant={isPending ? 'incomplete' : intake.status === 'rejected' ? 'disabled' : 'active'}>
                  {isPending ? 'Awaiting authorization' : intake.status === 'rejected' ? 'Rejected' : 'Authorized'}
                </Badge>
              </div>

              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.12em] text-[#9CA3AF]">Programme</dt>
                  <dd className="mt-1 text-sm font-medium text-[#052E1C]">{intake.offeringName}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.12em] text-[#9CA3AF]">Service</dt>
                  <dd className="mt-1 text-sm font-medium text-[#052E1C]">{intake.serviceName}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.12em] text-[#9CA3AF]">Submitted</dt>
                  <dd className="mt-1 text-sm text-[#4B6358]">
                    {new Date(intake.createdAt).toLocaleString()}
                  </dd>
                </div>
                {intake.applicantMobile ? (
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-[0.12em] text-[#9CA3AF]">Mobile</dt>
                    <dd className="mt-1 text-sm font-medium text-[#052E1C]">{intake.applicantMobile}</dd>
                  </div>
                ) : null}
              </dl>

              <IntakeDocumentsSection intake={intake} api={enrollmentIntakesApi} />

              {intake.applicantDetails?.length > 0 ? (
                <dl className="mt-6 grid gap-3 sm:grid-cols-2">
                  {intake.applicantDetails.map((item) => (
                    <div
                      key={item.fieldKey}
                      className="rounded-xl border border-[#E2EEE8] bg-[#F9FCFB] px-4 py-3"
                    >
                      <dt className="text-xs font-bold uppercase tracking-[0.12em] text-[#9CA3AF]">
                        {item.label}
                      </dt>
                      <dd className="mt-1 text-sm font-medium text-[#052E1C]">{String(item.value ?? '—')}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}

              {intake.correctionNote && !isPending && (
                <div className="mt-6 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#7F1D1D]">
                  <p className="font-semibold">Note</p>
                  <p className="mt-1">{intake.correctionNote}</p>
                </div>
              )}
            </div>

            {intake.aiRecommendation ? (
              <IntakeAiRecommendation recommendation={intake.aiRecommendation} />
            ) : null}

            {isPending && (
              <div className="rounded-2xl border border-[#E2EEE8] bg-[#F9FCFB] p-6">
                <h2 className="text-lg font-semibold text-[#052E1C]">Authorization decision</h2>
                <p className="mt-2 text-sm text-[#4B6358]">
                  Confirm whether this applicant is authorized to enroll. If approved, they receive portal
                  access and can complete documents and workflow steps.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Button onClick={handleApprove} disabled={acting}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Authorize applicant
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowRejectForm((value) => !value)}
                    disabled={acting}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                </div>

                {showRejectForm && (
                  <form className="mt-6 space-y-4" onSubmit={handleReject}>
                    <div>
                      <label htmlFor="reject-reason" className="mb-1.5 block text-sm font-medium text-[#052E1C]">
                        Rejection reason (sent to applicant)
                      </label>
                      <textarea
                        id="reject-reason"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        rows={4}
                        className="w-full rounded-xl border border-[#C4E8D4] bg-white px-4 py-3 text-sm text-[#052E1C] outline-none focus:border-[#6EE7B7]"
                        placeholder="Explain why authorization was not granted..."
                        required
                      />
                    </div>
                    <Button type="submit" variant="destructive" disabled={acting}>
                      Confirm rejection
                    </Button>
                  </form>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </AdminLayout>
  );
}

const INTAKE_RECOMMENDATION_META = {
  approve: { label: 'AI suggests: Authorize', variant: 'active' },
  reject: { label: 'AI suggests: Reject', variant: 'disabled' },
  manual_review: { label: 'AI suggests: Manual review', variant: 'incomplete' },
};

function IntakeAiRecommendation({ recommendation }) {
  const meta =
    INTAKE_RECOMMENDATION_META[recommendation.recommendation] ??
    INTAKE_RECOMMENDATION_META.manual_review;
  const confidence =
    recommendation.confidence != null
      ? `${Math.round(recommendation.confidence * 100)}% confidence`
      : null;

  return (
    <div className="rounded-2xl border border-[#D4E5D0] bg-[#F6FAF5] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[#10B981]" />
          <h2 className="text-lg font-semibold text-[#052E1C]">AI pre-screen</h2>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={meta.variant}>{meta.label}</Badge>
          {confidence ? (
            <span className="text-xs font-medium text-[#4B6358]">{confidence}</span>
          ) : null}
        </div>
      </div>
      <p className="mt-2 text-xs text-[#4B6358]">
        Advisory only. Review the documents and make the final authorization decision yourself.
      </p>
      {recommendation.summary ? (
        <p className="mt-3 text-sm text-[#334155]">{recommendation.summary}</p>
      ) : null}
      {(recommendation.issues ?? []).length > 0 ? (
        <div className="mt-3 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] p-3">
          <p className="text-xs font-bold text-[#92400E]">Concerns</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-[#92400E]">
            {recommendation.issues.map((issue, index) => (
              <li key={index}>{issue}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
