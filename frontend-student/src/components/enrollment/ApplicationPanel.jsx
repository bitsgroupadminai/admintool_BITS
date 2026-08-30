import { CheckCircle2, Clock3, Loader2, Send } from 'lucide-react';
import { formatQueueMode } from '@/utils/offering';
import { ApplicantDetailsForm } from '@/components/enrollment/ApplicantDetailsForm';
import { IntakeDocumentInput } from '@/components/enrollment/IntakeDocumentInput';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { isPublicApplicationFormValid } from '@/utils/applicantDetails';

export function ApplicationPanel({
  visible,
  offering,
  applicantName,
  applicantEmail,
  applicantMobile,
  intakeDocumentFile,
  applicantDetails,
  onNameChange,
  onEmailChange,
  onMobileChange,
  onIntakeDocumentChange,
  onApplicantDetailChange,
  onSubmit,
  submitting,
  intakeStatus,
  checkingIntake,
}) {
  const blocked = intakeStatus?.canSubmit === false;
  const pending = intakeStatus?.status === 'pending_authorization';
  const canSubmit = isPublicApplicationFormValid({
    applicantName,
    applicantEmail,
    applicantMobile,
    applicantDetails,
    offering,
    intakeDocumentFile,
  });

  return (
    <div
      className={`rounded-2xl border border-[#E2EEE8] bg-white/90 p-6 shadow-sm transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
      }`}
    >
      <h2 className="text-lg font-semibold text-[#052E1C]">Start your application</h2>
      <p className="mt-1 text-sm text-[#4B6358]">
        Submit your details for institute authorization. After approval you will receive student
        portal access to complete enrollment.
      </p>

      {blocked && intakeStatus?.message ? (
        <div
          className={`mt-5 rounded-xl border p-4 ${
            pending
              ? 'border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]'
              : 'border-[#E2EEE8] bg-[#F9FCFB] text-[#4B6358]'
          }`}
        >
          <div className="flex items-start gap-3">
            <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="text-sm font-semibold">
                {pending ? 'Authorization pending' : 'Request already on file'}
              </p>
              <p className="mt-1 text-sm leading-relaxed">{intakeStatus.message}</p>
            </div>
          </div>
        </div>
      ) : null}

      {offering && !blocked ? (
        <div className="mt-5 rounded-xl border border-[#E2EEE8] bg-[#F9FCFB] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#10B981]">
            Before you start
          </p>
          <ul className="mt-3 space-y-2 text-xs text-[#4B6358]">
            <ReadinessItem label={`${offering.eligibilityRules?.length ?? 0} eligibility checks`} />
            <ReadinessItem
              label={`${offering.documentRequirements?.filter((doc) => doc.required !== false).length ?? 0} required documents`}
            />
            <ReadinessItem label={formatQueueMode(offering.queueMode)} />
          </ul>
        </div>
      ) : null}

      {!blocked ? (
        <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
          <div>
            <label htmlFor="applicant-name" className="mb-1.5 block text-sm font-medium text-[#052E1C]">
              Full name
            </label>
            <input
              id="applicant-name"
              type="text"
              value={applicantName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Your full name"
              className="h-11 w-full rounded-xl border border-[#C4E8D4] bg-[#F0FAF5] px-4 text-sm text-[#052E1C] outline-none transition focus:border-[#6EE7B7] focus:bg-white disabled:opacity-60"
              autoComplete="name"
              disabled={submitting}
            />
          </div>
          <div>
            <label htmlFor="applicant-email" className="mb-1.5 block text-sm font-medium text-[#052E1C]">
              Email
            </label>
            <input
              id="applicant-email"
              type="email"
              value={applicantEmail}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="you@email.com"
              className="h-11 w-full rounded-xl border border-[#C4E8D4] bg-[#F0FAF5] px-4 text-sm text-[#052E1C] outline-none transition focus:border-[#6EE7B7] focus:bg-white disabled:opacity-60"
              autoComplete="email"
              disabled={submitting}
            />
            {checkingIntake ? (
              <p className="mt-1.5 text-xs text-[#6B7280]">Checking existing request…</p>
            ) : null}
          </div>
          <div>
            <label htmlFor="applicant-mobile-number" className="mb-1.5 block text-sm font-medium text-[#052E1C]">
              Mobile number
            </label>
            <PhoneInput
              id="applicant-mobile"
              value={applicantMobile}
              onChange={onMobileChange}
              placeholder="Mobile number"
              required={false}
            />
          </div>

          <ApplicantDetailsForm
            fields={offering?.applicantFields ?? []}
            values={applicantDetails ?? {}}
            onChange={onApplicantDetailChange}
          />

          <IntakeDocumentInput
            intakeDocument={offering?.intakeDocument}
            file={intakeDocumentFile}
            onChange={onIntakeDocumentChange}
          />

          {intakeStatus?.message && intakeStatus.canSubmit ? (
            <p className="rounded-xl border border-[#E2EEE8] bg-[#F9FCFB] px-4 py-3 text-xs leading-relaxed text-[#4B6358]">
              {intakeStatus.message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting || !canSubmit}
            aria-busy={submitting}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0A6640] text-sm font-semibold text-white hover:bg-[#084F31] disabled:pointer-events-none disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Send className="h-4 w-4" aria-hidden />
            )}
            {submitting ? 'Submitting…' : 'Start application'}
          </button>
          <p className="text-xs leading-relaxed text-[#4B6358]">
            This sends an authorization request to the institute. Login credentials are emailed after
            admin approval.
          </p>
        </form>
      ) : null}
    </div>
  );
}

function ReadinessItem({ label }) {
  return (
    <li className="flex items-center gap-2">
      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#0A6640]" />
      <span>{label}</span>
    </li>
  );
}
