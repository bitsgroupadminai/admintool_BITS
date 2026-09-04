import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { softCardClassName } from '@/components/ui/back-link';
import { useConfirm } from '@/components/ui/confirm-context';
import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/store/auth.store';
import { clearSessionToken } from '@/utils/sessionToken';
import { cn } from '@/lib/utils';

export function DeleteAccountSection({ user }) {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const clearUser = useAuthStore((s) => s.clearUser);
  const instituteName = user?.institute?.name ?? '';
  const [password, setPassword] = useState('');
  const [typedName, setTypedName] = useState('');
  const [deleting, setDeleting] = useState(false);

  const nameMatches =
    typedName.trim().replace(/\s+/g, ' ').toLowerCase() ===
    instituteName.trim().replace(/\s+/g, ' ').toLowerCase();
  const canDelete = password.length > 0 && nameMatches && Boolean(instituteName);

  const handleDelete = async () => {
    if (!canDelete || deleting) return;

    const ok = await confirm({
      title: 'Delete your account and institute?',
      description:
        `This permanently removes ${instituteName}, every staff member, student, application, and contact detail stored for it. You will be able to sign up again with ${user?.email ?? 'this email'}. This cannot be undone.`,
      confirmLabel: 'Delete everything',
      variant: 'danger',
    });
    if (!ok) return;

    setDeleting(true);
    try {
      await authApi.deleteAccount({
        password,
        instituteName,
      });
      clearSessionToken();
      clearUser();
      toast.success('Account deleted. You can sign up again with the same email.');
      navigate('/signup', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Could not delete account');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className={cn('p-5 sm:p-6', softCardClassName, 'border-[#FECACA]/80')}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-[#B91C1C]">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-forest">Delete account</h3>
          <p className="mt-1 text-sm text-muted">
            Permanently remove your admin account, {instituteName || 'this institute'},
            every staff member you added, and all applicant emails and phone numbers.
            After this, you can create a new institute with the same email.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="delete-account-password">Current password</Label>
          <Input
            id="delete-account-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Confirm it is you"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="delete-account-institute">
            Type <span className="font-semibold text-forest">{instituteName || 'your institute name'}</span> to confirm
          </Label>
          <Input
            id="delete-account-institute"
            value={typedName}
            onChange={(event) => setTypedName(event.target.value)}
            placeholder={instituteName || 'Institute name'}
            autoComplete="off"
          />
        </div>
      </div>

      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted sm:max-w-xl">
          This cannot be undone. Staff logins, student records, and uploaded files for this
          institute are removed with your account.
        </p>
        <Button
          type="button"
          variant="destructive"
          disabled={!canDelete || deleting}
          onClick={handleDelete}
          className="w-full sm:w-auto"
        >
          <Trash2 className="h-4 w-4" />
          {deleting ? 'Deleting...' : 'Delete account'}
        </Button>
      </div>
    </section>
  );
}
