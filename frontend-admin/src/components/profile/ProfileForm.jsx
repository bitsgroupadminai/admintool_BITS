import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Save, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { softCardClassName, softFooterClassName, softHeroClassName } from '@/components/ui/back-link';
import { ProfileFormSkeleton } from '@/components/skeletons';
import { ProfileAvatarUpload } from '@/components/profile/ProfileAvatarUpload';
import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';
export function ProfileForm() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [name, setName] = useState(user?.name ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  useEffect(() => {
    setName(user?.name ?? '');
  }, [user?.name]);

  const nameChanged = name.trim() !== (user?.name ?? '').trim();
  const passwordTouched = Boolean(currentPassword || newPassword || confirmPassword);

  const passwordValid = useMemo(() => {
    if (!passwordTouched) return true;
    return (
      currentPassword.length > 0 &&
      newPassword.length >= 8 &&
      newPassword === confirmPassword
    );
  }, [passwordTouched, currentPassword, newPassword, confirmPassword]);

  const canSave = (nameChanged || passwordTouched) && passwordValid && name.trim().length >= 2;

  const handleSendResetLink = async () => {
    if (!user?.email) return;
    setSendingReset(true);
    try {
      const { data } = await authApi.forgotPassword({ email: user.email });
      toast.success(data.message || 'Reset link sent to your email');
    } catch (err) {
      toast.error(err.message || 'Could not send reset link');
    } finally {
      setSendingReset(false);
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!canSave) return;

    setSaving(true);
    try {
      const payload = { name: name.trim() };
      if (passwordTouched) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      const { data } = await authApi.updateProfile(payload);
      setUser(data.data.user);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return <ProfileFormSkeleton />;
  }

  return (
    <div className="w-full space-y-6">
      <div className={cn(softHeroClassName, 'p-5 sm:p-6 lg:p-8')}>
        <ProfileAvatarUpload user={user} onUserUpdate={setUser} className="mb-5" />
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
              Account settings
            </p>
            <h2 className="mt-1 truncate text-2xl font-semibold text-forest sm:text-3xl">
              {user?.name ?? 'Your profile'}
            </h2>
            <p className="mt-1 text-sm text-muted">
              Manage your display name, photo, and password. Email is managed by your institute.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            <InfoPill icon={Mail} label={user?.email ?? '—'} />
            <InfoPill icon={UserRound} label={user?.staffRole ?? user?.role ?? 'User'} />
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-2">
          <ProfileSection
            icon={UserRound}
            title="Account details"
            description="Update your display name. Your sign-in email cannot be changed here."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="profile-name">Full name</Label>
                <Input
                  id="profile-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                  required
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="profile-email">Email</Label>
                <Input
                  id="profile-email"
                  type="email"
                  value={user?.email ?? ''}
                  disabled
                  className="cursor-not-allowed bg-muted/40 text-muted"
                />
                <p className="text-xs text-muted">Email cannot be changed from this page.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-role">Role</Label>
                <Input
                  id="profile-role"
                  value={user?.staffRole ?? user?.role ?? ''}
                  disabled
                  className="cursor-not-allowed bg-muted/40 capitalize text-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-institute">Institute</Label>
                <Input
                  id="profile-institute"
                  value={user?.institute?.name ?? ''}
                  disabled
                  className="cursor-not-allowed bg-muted/40 text-muted"
                />
              </div>
            </div>
          </ProfileSection>

          <ProfileSection
            icon={Lock}
            title="Change password"
            description="Update here if you know your current password, or request an email reset link."
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-[#FAFBFA] px-4 py-3">
              <p className="text-xs text-muted">
                Forgot your current password? We will email a secure link valid for 10 minutes.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={sendingReset}
                onClick={handleSendResetLink}
                className="shrink-0"
              >
                {sendingReset ? 'Sending...' : 'Email reset link'}
              </Button>
            </div>
            <div className="grid gap-4">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="current-password">Current password</Label>
                <Link
                  to="/forgot-password"
                  className="rounded-full px-2 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                >
                  Forgot password?
                </Link>
              </div>
              <PasswordField
                id="current-password"
                label=""
                hideLabel
                value={currentPassword}
                onChange={setCurrentPassword}
                show={showCurrentPassword}
                onToggleShow={() => setShowCurrentPassword((value) => !value)}
                autoComplete="current-password"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <PasswordField
                  id="new-password"
                  label="New password"
                  value={newPassword}
                  onChange={setNewPassword}
                  show={showNewPassword}
                  onToggleShow={() => setShowNewPassword((value) => !value)}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                />
                <PasswordField
                  id="confirm-password"
                  label="Confirm new password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  show={showConfirmPassword}
                  onToggleShow={() => setShowConfirmPassword((value) => !value)}
                  autoComplete="new-password"
                />
              </div>
              {passwordTouched && !passwordValid ? (
                <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-xs text-destructive">
                  Enter your current password and choose a matching new password of at least 8
                  characters.
                </p>
              ) : null}
            </div>
          </ProfileSection>
        </div>

        <div className={cn('sticky bottom-0 z-10 -mx-4 px-4 py-4 backdrop-blur-sm sm:static sm:mx-0 sm:px-6', softFooterClassName)}>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted sm:max-w-xl">
              Changes apply immediately after you save. Your institute manages your email address.
            </p>
            <Button type="submit" disabled={!canSave || saving} className="w-full sm:w-auto">
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

function ProfileSection({ icon: Icon, title, description, children }) {
  return (
    <section className={cn('h-full p-5 sm:p-6', softCardClassName)}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-forest">{title}</h3>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function InfoPill({ icon: Icon, label }) {
  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-medium text-muted">
      <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
      <span className="truncate">{label}</span>
    </span>
  );
}

function PasswordField({
  id,
  label,
  hideLabel = false,
  value,
  onChange,
  show,
  onToggleShow,
  autoComplete,
  placeholder,
}) {
  return (
    <div className="space-y-2">
      {!hideLabel && label ? <Label htmlFor={id}>{label}</Label> : null}
      <div className="relative">
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="pr-10"
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted transition-colors hover:bg-accent/50"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
