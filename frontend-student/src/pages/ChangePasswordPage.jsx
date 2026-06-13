import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { studentApi } from '@/api/student.api';
import { useAuthStore } from '@/store/auth.store';
import { StudentLayout } from '@/components/StudentLayout';

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [skipping, setSkipping] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await studentApi.changePassword({ password });
      setUser(data.data.user);
      toast.success('Password updated');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setSubmitting(false);
    }
  };

  const onSkip = async () => {
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
    <StudentLayout showNav={false}>
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-semibold text-foreground">Change your password</h1>
        <p className="mt-2 text-sm text-muted">
          For security, you can set a new password now. This step is optional and can be skipped.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-foreground">
              New password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              className="h-11 w-full rounded-xl border border-border bg-white px-4 text-sm outline-none focus:border-[#1F4D3F]"
            />
          </div>
          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              className="h-11 w-full rounded-xl border border-border bg-white px-4 text-sm outline-none focus:border-[#1F4D3F]"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="h-11 w-full rounded-xl bg-[#1F4D3F] text-sm font-semibold text-white hover:bg-[#173D32] disabled:opacity-60"
          >
            {submitting ? 'Saving...' : 'Save new password'}
          </button>
        </form>

        <button
          type="button"
          onClick={onSkip}
          disabled={skipping}
          className="mt-4 h-11 w-full rounded-xl border border-border bg-white text-sm font-medium text-muted hover:text-foreground disabled:opacity-60"
        >
          {skipping ? 'Continuing...' : 'Skip for now'}
        </button>
      </div>
    </StudentLayout>
  );
}
