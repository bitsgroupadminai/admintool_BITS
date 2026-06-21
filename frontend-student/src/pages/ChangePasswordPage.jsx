import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { studentApi } from '@/api/student.api';
import { useAuthStore } from '@/store/auth.store';
import { useConfirm } from '@/components/ui/confirm-context';
import { LoginFormBackdrop, LoginHeroAccent } from '@/components/auth/LoginCircuitArt';

const SECURITY_TIPS = [
  {
    icon: Lock,
    title: 'Keep it private',
    text: 'Never share your password with anyone',
  },
  {
    icon: KeyRound,
    title: 'Make it unique',
    text: 'Use a password you do not use elsewhere',
  },
  {
    icon: ShieldCheck,
    title: 'Stay protected',
    text: 'A strong password keeps your records safe',
  },
];

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const confirm = useConfirm();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [skipping, setSkipping] = useState(false);

  const instituteName = user?.institute?.name ?? 'Student Portal';
  const studentName = user?.name ?? 'Student';

  const requirements = useMemo(
    () => [
      { label: 'At least 8 characters', met: password.length >= 8 },
      { label: 'Passwords match', met: password.length > 0 && password === confirmPassword },
    ],
    [password, confirmPassword],
  );

  const canSubmit = requirements.every((item) => item.met);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) {
      toast.error('Please meet all password requirements');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await studentApi.changePassword({ password });
      setUser(data.data.user);
      toast.success('Password updated successfully');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setSubmitting(false);
    }
  };

  const onSkip = async () => {
    const ok = await confirm({
      title: 'Skip for now?',
      description:
        'You can change your password later from your account settings. Continue to the portal?',
      confirmLabel: 'Continue',
    });
    if (!ok) return;

    setSkipping(true);
    try {
      const { data } = await studentApi.skipPasswordChange();
      setUser(data.data.user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Failed to continue');
    } finally {
      setSkipping(false);
    }
  };

  return (
    <div className="flex h-screen max-h-screen overflow-hidden bg-[#F4FAF7]">
      {/* ── Left panel ── */}
      <aside className="relative hidden h-full shrink-0 overflow-hidden border-r border-[#084F31]/80 lg:flex lg:w-[44%] xl:w-[46%]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#063D25] via-[#0A6640] to-[#0B7344]" />
        <LoginHeroAccent />

        <div className="relative z-10 flex h-full w-full flex-col justify-between p-8 xl:p-10">
          <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-white/15 bg-white/8 px-3.5 py-2 text-sm font-medium text-white/90 backdrop-blur-sm">
            <Lock className="h-4 w-4 text-[#A7F3D0]" />
            First-time setup
          </div>

          <div className="max-w-[340px]">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-white">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A7F3D0]">
                    Account security
                  </p>
                  <p className="text-base font-bold text-white">{instituteName}</p>
                </div>
              </div>
            </div>

            <h1 className="mt-7 text-[1.75rem] font-bold leading-tight tracking-tight text-white xl:text-3xl">
              Set your new password
            </h1>
            <p className="mt-2.5 text-sm leading-relaxed text-[#D1FAE5]/80">
              Hi {studentName.split(' ')[0]}, your institute issued a temporary password. Choose a
              personal one before you continue.
            </p>

            <div className="mt-6 space-y-2.5">
              {SECURITY_TIPS.map(({ icon: Icon, title, text }) => (
                <div
                  key={title}
                  className="flex items-center gap-3 rounded-xl border border-white/12 bg-white/8 px-3.5 py-3 backdrop-blur-sm transition hover:bg-white/10"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#6EE7B7]/15 text-[#A7F3D0]">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="text-xs text-[#D1FAE5]/70">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3.5 py-2 text-xs font-medium text-[#D1FAE5] backdrop-blur-sm">
            <ShieldCheck className="h-3.5 w-3.5 text-[#6EE7B7]" />
            Required on first sign-in
          </div>
        </div>
      </aside>

      {/* ── Right panel ── */}
      <main className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <LoginFormBackdrop />

        <header className="relative z-10 flex shrink-0 items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0A6640] text-white shadow-sm">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span className="text-sm font-bold text-[#052E1C]">{instituteName}</span>
          </div>
          <button
            type="button"
            onClick={onSkip}
            disabled={skipping}
            className="ml-auto rounded-lg border border-[#C4E8D4] bg-white px-3.5 py-2 text-sm font-semibold text-[#0A6640] shadow-sm transition hover:border-[#6EE7B7] hover:bg-[#F0FAF5] disabled:opacity-60"
          >
            {skipping ? 'Continuing...' : 'Skip for now'}
          </button>
        </header>

        <div className="relative z-10 flex flex-1 items-center justify-center overflow-y-auto px-5 pb-5 sm:px-8">
          <div className="w-full max-w-[400px]">
            <div className="mb-5 text-center lg:text-left">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C4E8D4] bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#0A6640]">
                <Lock className="h-3 w-3" />
                Secure your account
              </span>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-[#052E1C]">
                Create a new password
              </h2>
              <p className="mt-1 text-sm text-[#4B6358]">
                Replace your temporary password with one only you know.
              </p>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-[#E2EEE8] bg-white shadow-[0_8px_32px_rgba(10,102,64,0.08)]">
              <div className="h-1 bg-gradient-to-r from-[#0A6640] via-[#10B981] to-[#6EE7B7]" />

              <svg
                className="pointer-events-none absolute right-0 top-1 h-20 w-20 text-[#0A6640] opacity-[0.07]"
                viewBox="0 0 80 80"
                fill="none"
                aria-hidden
              >
                <path d="M80 0 V 50 Q 80 80 50 80 H 0" stroke="currentColor" strokeWidth="2" />
                <circle cx="50" cy="30" r="3" fill="currentColor" />
              </svg>

              <form onSubmit={onSubmit} className="relative p-6 sm:p-7">
                <div className="space-y-4">
                  <PasswordInput
                    id="password"
                    label="New password"
                    value={password}
                    onChange={setPassword}
                    show={showPassword}
                    onToggleShow={() => setShowPassword((v) => !v)}
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                  />

                  <PasswordInput
                    id="confirmPassword"
                    label="Confirm password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    show={showConfirm}
                    onToggleShow={() => setShowConfirm((v) => !v)}
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                  />

                  <ul className="space-y-2 rounded-xl border border-[#E2EEE8] bg-[#F9FCFB] px-4 py-3">
                    {requirements.map((item) => (
                      <li key={item.label} className="flex items-center gap-2 text-xs">
                        <CheckCircle2
                          className={`h-3.5 w-3.5 shrink-0 ${
                            item.met ? 'text-[#0A6640]' : 'text-[#D1D5DB]'
                          }`}
                        />
                        <span className={item.met ? 'font-medium text-[#052E1C]' : 'text-[#6B7280]'}>
                          {item.label}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="submit"
                    disabled={submitting || !canSubmit}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0A6640] text-sm font-semibold text-white shadow-[0_4px_16px_rgba(10,102,64,0.3)] transition hover:bg-[#084F31] disabled:opacity-60"
                  >
                    {submitting ? 'Saving password...' : 'Save and continue'}
                    {!submitting && <ArrowRight className="h-4 w-4" />}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onSkip}
                  disabled={skipping}
                  className="mt-4 flex h-11 w-full items-center justify-center rounded-xl border border-[#C4E8D4] bg-white text-sm font-semibold text-[#4B6358] transition hover:border-[#6EE7B7] hover:bg-[#F0FAF5] hover:text-[#052E1C] disabled:opacity-60"
                >
                  {skipping ? 'Continuing...' : 'Skip for now'}
                </button>
              </form>
            </div>

            <p className="mt-4 text-center text-xs text-[#6B7280]">
              You can update your password anytime from account settings.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function PasswordInput({
  id,
  label,
  value,
  onChange,
  show,
  onToggleShow,
  autoComplete,
  placeholder,
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-[#052E1C]">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          minLength={8}
          className="h-11 w-full rounded-xl border border-[#C4E8D4] bg-[#F9FCFB] px-4 pr-11 text-sm outline-none transition placeholder:text-[#9CA3AF] focus:border-[#0A6640] focus:bg-white focus:ring-2 focus:ring-[#6EE7B7]/25"
          required
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#4B6358] hover:bg-[#F0FAF5]"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
