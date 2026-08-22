import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { authApi } from '@/api/auth.api';
import { FieldWrapper, InputBase, InputNormal } from '@/pages/auth/LoginPage';
import { cn } from '@/lib/utils';
import { getAuthPortal, loginPathForPortal } from '@/constants/portalBranding';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const portal = getAuthPortal(pathname);
  const loginPath = loginPathForPortal(portal);
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
      navigate(loginPath, { replace: true });
    } catch (err) {
      toast.error(err.message || 'Could not reset password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      portal={portal}
      title="Set new password"
      subtitle="Choose a strong password for your account"
      heroTitle="Almost done"
      heroSubtitle="Your reset link is valid for 10 minutes. Pick a new password you have not used elsewhere."
    >
      <Link
        to={loginPath}
        className="mb-5 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold text-[#0A6640] transition-colors hover:bg-[#E6F7EF]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to sign in
      </Link>

      {!token ? (
        <div className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-5 text-sm text-[#991B1B] shadow-[0_1px_2px_rgba(10,102,64,0.04)]">
          This reset link is missing or invalid. Request a new link from the forgot password page.
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <FieldWrapper
            id="password"
            label="New password"
            icon={Lock}
            rightSlot={
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#9CA3AF] transition-colors hover:bg-[#E6F7EF] hover:text-[#0A6640]"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          >
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={cn(InputBase, InputNormal, 'pr-11')}
              placeholder="At least 8 characters"
              required
            />
          </FieldWrapper>

          <FieldWrapper id="confirm-password" label="Confirm password" icon={Lock}>
            <input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className={cn(InputBase, InputNormal)}
              required
            />
          </FieldWrapper>

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
    </AuthLayout>
  );
}
