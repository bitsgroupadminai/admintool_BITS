export function ApplicationPanel({ visible, applicantName, applicantEmail, onNameChange, onEmailChange }) {
  return (
    <div
      className={`rounded-2xl border border-border bg-white p-6 shadow-sm transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
      }`}
    >
      <h2 className="text-lg font-semibold text-foreground">Start your application</h2>
      <p className="mt-1 text-sm text-muted">
        Enter your details below. You can prepare while we finish building online submission.
      </p>

      <form className="mt-6 space-y-4" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label htmlFor="applicant-name" className="mb-1.5 block text-sm font-medium text-foreground">
            Full name
          </label>
          <input
            id="applicant-name"
            type="text"
            value={applicantName}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Your full name"
            className="h-11 w-full rounded-xl border border-border bg-white px-4 text-sm outline-none focus:border-[#1F4D3F]"
          />
        </div>
        <div>
          <label htmlFor="applicant-email" className="mb-1.5 block text-sm font-medium text-foreground">
            Email
          </label>
          <input
            id="applicant-email"
            type="email"
            value={applicantEmail}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="you@email.com"
            className="h-11 w-full rounded-xl border border-border bg-white px-4 text-sm outline-none focus:border-[#1F4D3F]"
          />
        </div>

        <div className="space-y-2">
          <button
            type="button"
            disabled
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1F4D3F]/40 text-sm font-semibold text-white cursor-not-allowed"
          >
            Submit application
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
              Coming soon
            </span>
          </button>
          <p className="text-xs leading-relaxed text-muted">
            Online submission isn&apos;t available yet. Review the requirements on the left and
            gather your documents in the meantime.
          </p>
        </div>
      </form>
    </div>
  );
}
