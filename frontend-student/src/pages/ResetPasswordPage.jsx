import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '@/api/student.api';
import { LoginFormBackdrop } from '@/components/auth/LoginCircuitArt';
import { cn } from '@/lib/utils';

const inputClassName =
  'h-11 w-full rounded-xl border border-[#C4E8D4] bg-[#F9FCFB] px-4 text-sm outline-none transition placeholder:text-[#9CA3AF] focus:border-[#0A6640] focus:bg-white focus:ring-2 focus:ring-[#6EE7B7]/25';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const requirements = useMemo(
    () => [
      { label: 'At least 8 characters', met: password.length >= 8 },
      { label: 'Passwords match', met: password.length > 0 && password === confirmPassword },
    ],
    [password, confirmPassword],
  );

  const canSubmit = token && requirements.every((item) => item.met);

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      await authApi.resetPassword({ token, password });
      toast.success('Password updated. Sign in with your new password.');
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Could not reset password');
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
              New password
            </span>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-[#052E1C]">Set new password</h1>
            <p className="mt-1 text-sm text-[#4B6358]">
              Your reset link is valid for 10 minutes.
            </p>
          </div>

          <div className="rounded-2xl border border-[#E2EEE8] bg-white p-6 shadow-[0_1px_2px_rgba(10,102,64,0.04)] sm:p-7">
            {!token ? (
              <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#991B1B]">
                This reset link is missing or invalid. Request a new link from the forgot password
                page.
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4" noValidate>
                <div>
                  <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-[#052E1C]">
                    New password
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="At least 8 characters"
                      className={`${inputClassName} pl-10 pr-11`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#4B6358] transition-colors hover:bg-[#F0FAF5]"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="confirm-password"
                    className="mb-1.5 block text-sm font-medium text-[#052E1C]"
                  >
                    Confirm password
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                    <input
                      id="confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className={`${inputClassName} pl-10`}
                      required
                    />
                  </div>
                </div>

                <ul className="space-y-2 rounded-xl border border-[#E2EEE8] bg-[#F9FCFB] px-4 py-3">
                  {requirements.map((item) => (
                    <li key={item.label} className="flex items-center gap-2 text-xs">
                      <CheckCircle2
                        className={cn('h-3.5 w-3.5', item.met ? 'text-[#0A6640]' : 'text-[#D1D5DB]')}
                      />
                      <span className={item.met ? 'font-medium text-[#052E1C]' : 'text-[#6B7280]'}>
                        {item.label}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  type="submit"
                  disabled={!canSubmit || submitting}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0A6640] text-sm font-semibold text-white transition hover:bg-[#084F31] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating password...
                    </>
                  ) : (
                    'Update password'
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
