import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CalendarDays, Download, Mail, Phone, UserCheck, UserRound } from 'lucide-react';
import { BackLink, softCardClassName, softHeroClassName } from '@/components/ui/back-link';
import { IntakeDetailSkeleton } from '@/components/skeletons';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { staffEnrollmentIntakesApi } from '@/api/enrollmentIntakes.api';
import { cn } from '@/lib/utils';

export function StaffEnrollmentIntakeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [intake, setIntake] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadIntake = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await staffEnrollmentIntakesApi.get(id);
      setIntake(data.data.intake);
    } catch (err) {
      toast.error(err.message || 'Failed to load enrollment intake');
      navigate('/staff/enrollment-intakes');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadIntake();
  }, [loadIntake]);

  const isPending = intake?.status === 'pending_authorization';
  const isRejected = intake?.status === 'rejected';
  const initials = (intake?.applicantName ?? 'NA')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <DashboardLayout
      title="Enrollment intake"
      subtitle={
        isPending
          ? 'Awaiting admin authorization'
          : isRejected
            ? 'Authorization was rejected'
            : 'Applicant authorized'
      }
    >
      <BackLink to="/staff/enrollment-intakes" label="Back to intakes" className="mb-6" />

      {loading ? (
        <IntakeDetailSkeleton />
      ) : intake ? (
        <div className="space-y-6">
          <div className={cn(softHeroClassName, 'p-5 sm:p-6 lg:p-8')}>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0A6640] to-[#10B981] text-xl font-bold text-white">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#10B981]">
                    Enrollment intake
                  </p>
                  <h1 className="mt-1 truncate text-2xl font-bold text-[#052E1C] sm:text-3xl">
                    {intake.applicantName}
                  </h1>
                  <p className="mt-1 text-sm text-[#4B6358]">{intake.applicantEmail}</p>
                </div>
              </div>

              <Badge
                variant={isPending ? 'incomplete' : isRejected ? 'disabled' : 'active'}
                className="self-start"
              >
                {isPending ? 'Awaiting authorization' : isRejected ? 'Rejected' : 'Authorized'}
              </Badge>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <section className={cn('p-5 sm:p-6', softCardClassName)}>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#D1FAE5] text-[#0A6640]">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#052E1C]">Application summary</h2>
                  <p className="mt-1 text-sm text-[#4B6358]">
                    Programme and submission details for this intake request.
                  </p>
                </div>
              </div>

              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                <DetailItem label="Programme" value={intake.offeringName} />
                <DetailItem
                  label="Submitted"
                  value={new Date(intake.createdAt).toLocaleString()}
                  icon={CalendarDays}
                />
                <DetailItem label="Applicant email" value={intake.applicantEmail} icon={Mail} />
                <DetailItem label="Applicant name" value={intake.applicantName} icon={UserRound} />
                {intake.applicantMobile ? (
                  <DetailItem label="Mobile number" value={intake.applicantMobile} icon={Phone} />
                ) : null}
              </dl>

              {intake.documents?.length > 0 ? (
                <div className="mt-5">
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
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            staffEnrollmentIntakesApi.downloadDocument(intake.id, document)
                          }
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {isPending ? (
                <div className="mt-5 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-4 text-sm text-[#92400E]">
                  An admin must authorize this applicant before they can sign in and continue their
                  application.
                </div>
              ) : null}

              {isRejected && intake.correctionNote ? (
                <div className="mt-5 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-4">
                  <p className="text-sm font-semibold text-[#991B1B]">Rejection reason</p>
                  <p className="mt-2 text-sm text-[#7F1D1D]">{intake.correctionNote}</p>
                </div>
              ) : null}
            </section>

            <section className={cn('p-5 sm:p-6', softCardClassName)}>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#D1FAE5] text-[#0A6640]">
                  <UserRound className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#052E1C]">Applicant information</h2>
                  <p className="mt-1 text-sm text-[#4B6358]">
                    Personal details submitted with the enrollment request.
                  </p>
                </div>
              </div>

              {intake.applicantDetails?.length > 0 ? (
                <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                  {intake.applicantDetails.map((item) => (
                    <div
                      key={item.fieldKey}
                      className="rounded-xl border border-[#E2EEE8] bg-[#F9FCFB] px-4 py-3"
                    >
                      <dt className="text-xs font-bold uppercase tracking-[0.12em] text-[#9CA3AF]">
                        {item.label}
                      </dt>
                      <dd className="mt-1 text-sm font-medium text-[#052E1C]">
                        {String(item.value ?? '—')}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="mt-5 rounded-xl border border-dashed border-[#C4E8D4] bg-[#F9FCFB] px-4 py-8 text-center text-sm text-[#4B6358]">
                  No additional applicant details were collected for this programme.
                </p>
              )}
            </section>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}

function DetailItem({ label, value, icon: Icon }) {
  return (
    <div className="rounded-xl border border-[#E2EEE8] bg-[#F9FCFB] px-4 py-3">
      <dt className="text-xs font-bold uppercase tracking-[0.12em] text-[#9CA3AF]">{label}</dt>
      <dd className="mt-1 flex items-start gap-2 text-sm font-medium text-[#052E1C]">
        {Icon ? <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#0A6640]" /> : null}
        <span className="min-w-0 break-words">{value}</span>
      </dd>
    </div>
  );
}
