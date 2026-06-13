import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { authApi } from '@/api/student.api';
import { useAuthStore } from '@/store/auth.store';
import { PublicLayout } from '@/components/StudentLayout';

export function LoginPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <PublicLayout>
      <div className="mx-auto flex max-w-md flex-col px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-semibold text-foreground">Student login</h1>
        <p className="mt-2 text-sm text-muted">Sign in with the credentials provided by your institute.</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-white px-4 text-sm outline-none focus:border-[#1F4D3F]"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-foreground">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-white px-4 text-sm outline-none focus:border-[#1F4D3F]"
              required
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="h-11 w-full rounded-xl bg-[#1F4D3F] text-sm font-semibold text-white hover:bg-[#173D32] disabled:opacity-60"
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          New student?{' '}
          <Link to="/enroll" className="font-semibold text-[#1F4D3F]">
            Apply to enroll
          </Link>
        </p>
      </div>
    </PublicLayout>
  );
}
