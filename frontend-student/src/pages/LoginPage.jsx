import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Eye,
  EyeOff,
  GraduationCap,
  Route,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '@/api/student.api';
import { useAuthStore } from '@/store/auth.store';
import { LoginFormBackdrop, LoginHeroAccent } from '@/components/auth/LoginCircuitArt';

const FEATURES = [
  {
    icon: ClipboardList,
    title: 'Request tracking',
    text: 'Documents and status in one view',
  },
  {
    icon: CalendarDays,
    title: 'Visit planning',
    text: 'Queues and appointments online',
  },
  {
    icon: Route,
    title: 'Guided steps',
    text: 'Clear path for every service',
  },
];

export function LoginPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const [instituteName] = useState('Student Portal');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await authApi.login({ email, password });
      const user = data.data.user;
      if (user.role !== 'student') {
        toast.error('This portal is for enrolled students only');
        return;
      }
      setUser(user);
      if (user.mustChangePassword) {
        navigate('/change-password', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      toast.error(err.message || 'Invalid email or password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen max-h-screen overflow-hidden bg-[#F4FAF7]">
      {/* ── Left panel ── */}
      <aside className="relative hidden h-full shrink-0 overflow-hidden border-r border-[#084F31]/80 lg:flex lg:w-[44%] xl:w-[46%]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#063D25] via-[#0A6640] to-[#0B7344]" />
        <LoginHeroAccent />

        <div className="relative z-10 flex h-full w-full flex-col justify-between p-8 xl:p-10">
          <Link
            to="/"
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-white/15 bg-white/8 px-3.5 py-2 text-sm font-medium text-white/90 backdrop-blur-sm transition hover:bg-white/12"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>

          <div className="max-w-[340px]">
            {/* Institute card */}
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-white">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A7F3D0]">
                    Student portal
                  </p>
                  <p className="text-base font-bold text-white">{instituteName}</p>
                </div>
              </div>
            </div>

            <h1 className="mt-7 text-[1.75rem] font-bold leading-tight tracking-tight text-white xl:text-3xl">
              Sign in to your workspace
            </h1>
            <p className="mt-2.5 text-sm leading-relaxed text-[#D1FAE5]/80">
              Applications, documents, and visits — all in one secure portal.
            </p>

            {/* Feature cards */}
            <div className="mt-6 space-y-2.5">
              {FEATURES.map(({ icon: Icon, title, text }) => (
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
            Institute-issued accounts only
          </div>
        </div>
      </aside>

      {/* ── Right panel ── */}
      <main className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <LoginFormBackdrop />

        <header className="relative z-10 flex shrink-0 items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/" className="flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0A6640] text-white shadow-sm">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span className="text-sm font-bold text-[#052E1C]">{instituteName}</span>
          </Link>
          <Link
            to="/"
            className="ml-auto rounded-lg border border-[#C4E8D4] bg-white px-3.5 py-2 text-sm font-semibold text-[#0A6640] shadow-sm transition hover:border-[#6EE7B7] hover:bg-[#F0FAF5]"
          >
            Choose institute
          </Link>
        </header>

        <div className="relative z-10 flex flex-1 items-center justify-center overflow-y-auto px-5 pb-5 sm:px-8">
          <div className="w-full max-w-[400px]">
            <div className="mb-5 text-center lg:text-left">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C4E8D4] bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#0A6640]">
                <ShieldCheck className="h-3 w-3" />
                Secure login
              </span>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-[#052E1C]">Welcome back</h2>
              <p className="mt-1 text-sm text-[#4B6358]">Enter your student account credentials.</p>
            </div>

            {/* Login card */}
            <div className="relative overflow-hidden rounded-2xl border border-[#E2EEE8] bg-white shadow-[0_1px_2px_rgba(10,102,64,0.04)]">
              <div className="h-1 bg-gradient-to-r from-[#0A6640] via-[#10B981] to-[#6EE7B7]" />

              {/* Corner curve accent */}
              <svg
                className="pointer-events-none absolute right-0 top-1 h-20 w-20 text-[#0A6640] opacity-[0.07]"
                viewBox="0 0 80 80"
                fill="none"
                aria-hidden
              >
                <path
                  d="M80 0 V 50 Q 80 80 50 80 H 0"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <circle cx="50" cy="30" r="3" fill="currentColor" />
              </svg>

              <form onSubmit={onSubmit} className="relative p-6 sm:p-7">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[#052E1C]">
                      Email address
                    </label>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@institute.edu"
                      className="h-11 w-full rounded-xl border border-[#C4E8D4] bg-[#F9FCFB] px-4 text-sm outline-none transition placeholder:text-[#9CA3AF] focus:border-[#0A6640] focus:bg-white focus:ring-2 focus:ring-[#6EE7B7]/25"
                      required
                    />
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <label htmlFor="password" className="text-sm font-medium text-[#052E1C]">
                        Password
                      </label>
                      <Link
                        to="/forgot-password"
                        className="rounded-full px-2 py-1 text-xs font-semibold text-[#0A6640] transition-colors hover:bg-[#E6F7EF]"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="h-11 w-full rounded-xl border border-[#C4E8D4] bg-[#F9FCFB] px-4 pr-11 text-sm outline-none transition placeholder:text-[#9CA3AF] focus:border-[#0A6640] focus:bg-white focus:ring-2 focus:ring-[#6EE7B7]/25"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#4B6358] transition-colors hover:bg-[#F0FAF5]"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0A6640] text-sm font-semibold text-white transition hover:bg-[#084F31] disabled:opacity-60"
                  >
                    {submitting ? 'Signing in...' : 'Sign in to portal'}
                    {!submitting && <ArrowRight className="h-4 w-4" />}
                  </button>
                </div>

                <p className="mt-5 text-center text-sm text-[#4B6358]">
                  New student?{' '}
                  <Link to="/" className="font-semibold text-[#0A6640] hover:underline">
                    Choose institute to apply
                  </Link>
                </p>
              </form>
            </div>

            <p className="mt-4 text-center text-xs text-[#6B7280]">
              Accounts are created by institute staff.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
