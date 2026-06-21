import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, GraduationCap, Loader2, Mail, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '@/api/student.api';
import { LoginFormBackdrop } from '@/components/auth/LoginCircuitArt';

const inputClassName =
  'h-11 w-full rounded-xl border border-[#C4E8D4] bg-[#F9FCFB] px-4 text-sm outline-none transition placeholder:text-[#9CA3AF] focus:border-[#0A6640] focus:bg-white focus:ring-2 focus:ring-[#6EE7B7]/25';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!email.trim()) {
      toast.error('Enter your email address');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await authApi.forgotPassword({ email: email.trim() });
      setSent(true);
      toast.success(data.message || 'Check your email for a reset link');
    } catch (err) {
      toast.error(err.message || 'Could not send reset link');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-[#F4FAF7]">
      <LoginFormBackdrop />

      <header className="relative z-10 flex items-center justify-between px-5 py-4 sm:px-8">
        <Link to="/login" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0A6640] text-white">
            <GraduationCap className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold text-[#052E1C]">Student Portal</span>
        </Link>
        <Link
          to="/"
          className="rounded-full px-3.5 py-2 text-sm font-semibold text-[#0A6640] transition-colors hover:bg-[#E6F7EF]"
        >
          Choose institute
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-5 pb-8 sm:px-8">
        <div className="w-full max-w-[420px]">
          <Link
            to="/login"
            className="mb-5 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold text-[#0A6640] transition-colors hover:bg-[#E6F7EF]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>

          <div className="mb-5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C4E8D4] bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#0A6640]">
              <ShieldCheck className="h-3 w-3" />
              Account recovery
            </span>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-[#052E1C]">Forgot password</h1>
            <p className="mt-1 text-sm text-[#4B6358]">
              We will email you a secure link valid for 10 minutes.
            </p>
          </div>

          <div className="rounded-2xl border border-[#E2EEE8] bg-white p-6 shadow-[0_1px_2px_rgba(10,102,64,0.04)] sm:p-7">
            {sent ? (
              <div className="rounded-xl border border-[#E2EEE8] bg-[#F9FCFB] p-4 text-sm text-[#4B6358]">
                <p className="font-semibold text-[#052E1C]">Check your inbox</p>
                <p className="mt-2 leading-relaxed">
                  If an account exists for{' '}
                  <span className="font-medium text-[#052E1C]">{email}</span>, you will receive a
                  password reset link shortly. The link expires in 10 minutes.
                </p>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4" noValidate>
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[#052E1C]">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@institute.edu"
                      className={`${inputClassName} pl-10`}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0A6640] text-sm font-semibold text-white transition hover:bg-[#084F31] disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending link...
                    </>
                  ) : (
                    'Send reset link'
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
