import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { authApi } from '@/api/auth.api';
import { FieldWrapper, InputBase, InputNormal } from '@/pages/auth/LoginPage';
import { cn } from '@/lib/utils';

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
    <AuthLayout
      title="Forgot password"
      subtitle="We will email you a secure link valid for 10 minutes"
      heroTitle="Secure account recovery"
      heroSubtitle="Reset access without contacting support. Links expire quickly to keep your institute account safe."
    >
      <Link
        to="/login"
        className="mb-5 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold text-[#0A6640] transition-colors hover:bg-[#E6F7EF]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to sign in
      </Link>

      {sent ? (
        <div className="rounded-2xl border border-[#E2EEE8] bg-[#F9FCFB] p-5 text-sm text-[#4B6358] shadow-[0_1px_2px_rgba(10,102,64,0.04)]">
          <p className="font-semibold text-[#052E1C]">Check your inbox</p>
          <p className="mt-2 leading-relaxed">
            If an account exists for <span className="font-medium text-[#052E1C]">{email}</span>,
            you will receive a password reset link shortly. The link expires in 10 minutes.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <FieldWrapper id="email" label="Email address" icon={Mail}>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@institute.edu"
              className={cn(InputBase, InputNormal)}
              required
            />
          </FieldWrapper>

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
    </AuthLayout>
  );
}
