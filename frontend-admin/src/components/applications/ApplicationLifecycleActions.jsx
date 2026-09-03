import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowUpRight, RotateCcw, Undo2, UserPlus, XCircle } from 'lucide-react';
import { Select } from '@/components/ui/select';
import { useConfirm } from '@/components/ui/confirm-context';
import { applicationLifecycleApi } from '@/api/applications.lifecycle.api';
import { userApi } from '@/api/user.api';

const actionBtn =
  'inline-flex items-center gap-1.5 rounded-xl border border-[#C4E8D4] bg-white px-4 py-2 text-sm font-semibold text-[#0A6640] transition hover:bg-[#F0FAF5] disabled:opacity-60';
const actionBtnDanger =
  'inline-flex items-center gap-1.5 rounded-xl border border-[#FECACA] bg-white px-4 py-2 text-sm font-semibold text-[#B91C1C] transition hover:bg-[#FEF2F2] disabled:opacity-60';
const primaryBtn =
  'inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0A6640] to-[#084F31] px-4 py-2 text-sm font-semibold text-white shadow-[0_2px_10px_rgba(10,102,64,0.28)] disabled:opacity-60';

/**
 * @param {Object} props
 * @param {string} props.applicationId
 * @param {string} props.status
 * @param {'admin' | 'staff'} props.role
 * @param {Array} [props.workflowSteps] — workflow steps for rollback picker
 * @param {Object} [props.currentStep] — current workflow step
 * @param {() => void} props.onUpdated
 */
export function ApplicationLifecycleActions({
  applicationId,
  status,
  role,
  workflowSteps,
  currentStep,
  onUpdated,
  embedded = false,
}) {
  const [note, setNote] = useState('');
  const [staffList, setStaffList] = useState([]);
  const [transferStaffId, setTransferStaffId] = useState('');
  const [showTransfer, setShowTransfer] = useState(false);
  const [showRollback, setShowRollback] = useState(false);
  const [rollbackStepId, setRollbackStepId] = useState('');
  const [loading, setLoading] = useState(false);
  const confirm = useConfirm();

  const earlierSteps = (workflowSteps ?? [])
    .filter((step) => currentStep && step.order < currentStep.order)
    .sort((a, b) => a.order - b.order);
  const canRollback =
    earlierSteps.length > 0 &&
    ['in_review', 'needs_correction', 'pending_ai_review'].includes(status);

  const loadStaff = async () => {
    if (staffList.length) {
      setShowTransfer(true);
      return;
    }
    const { data } = await userApi.listStaff();
    setStaffList(data.data.staff ?? []);
    setShowTransfer(true);
  };

  const runAction = async (label, fn) => {
    const ok = await confirm({
      title: `${label} this request?`,
      description: note ? `Note: ${note}` : undefined,
      confirmLabel: label,
      variant: label === 'Cancel' ? 'danger' : 'default',
    });
    if (!ok) return;

    setLoading(true);
    try {
      await fn();
      toast.success(`Request ${label.toLowerCase()}d`);
      setNote('');
      setShowTransfer(false);
      onUpdated?.();
    } catch (err) {
      toast.error(err.message || `Failed to ${label.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  };

  const terminal = ['admitted', 'rejected', 'withdrawn', 'cancelled'].includes(status);
  const canCancel = ['submitted', 'in_review', 'needs_correction'].includes(status);
  const canReopen = ['rejected', 'cancelled', 'withdrawn'].includes(status);

  return (
    <div className={embedded ? 'space-y-4' : 'mt-8 space-y-4 rounded-2xl border border-[#E2EEE8] bg-white p-5 shadow-sm'}>
      {embedded ? null : (
      <div>
        <h2 className="text-sm font-bold text-[#052E1C]">Request actions</h2>
        <p className="mt-1 text-sm text-[#4B6358]">
          Cancel, reopen, escalate, or transfer this request. Notes are saved to the audit log.
        </p>
      </div>
      )}

      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note for audit log"
        className="w-full rounded-xl border border-[#C4E8D4] bg-[#F0FAF5] px-4 py-2.5 text-sm text-[#052E1C] placeholder-[#A8BDB5] outline-none transition focus:border-[#6EE7B7] focus:bg-white focus:ring-2 focus:ring-[#6EE7B7]/20"
      />

      <div className="flex flex-wrap gap-2">
        {canCancel && (
          <button
            type="button"
            disabled={loading}
            className={actionBtnDanger}
            onClick={() => runAction('Cancel', () => applicationLifecycleApi.cancel(applicationId, { note }, role))}
          >
            <XCircle className="h-3.5 w-3.5" />
            Cancel
          </button>
        )}
        {canReopen && role === 'admin' && (
          <button
            type="button"
            disabled={loading}
            className={actionBtn}
            onClick={() => runAction('Reopen', () => applicationLifecycleApi.reopen(applicationId, { note }))}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reopen
          </button>
        )}
        {!terminal && (
          <button
            type="button"
            disabled={loading}
            className={actionBtn}
            onClick={() =>
              runAction('Escalate', () => applicationLifecycleApi.escalate(applicationId, { note }, role))
            }
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
            Escalate
          </button>
        )}
        {role === 'admin' && !terminal && (
          <button type="button" className={actionBtn} onClick={loadStaff}>
            <UserPlus className="h-3.5 w-3.5" />
            Transfer
          </button>
        )}
        {canRollback && (
          <button
            type="button"
            className={actionBtn}
            onClick={() => setShowRollback((show) => !show)}
          >
            <Undo2 className="h-3.5 w-3.5" />
            Send back to step
          </button>
        )}
      </div>

      {showTransfer && staffList.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-[#C4E8D4] bg-[#F9FCFB] p-4 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#4B6358]">
              Transfer to staff
            </p>
            <Select
              value={transferStaffId}
              onChange={setTransferStaffId}
              placeholder="Select staff member"
              options={staffList.map((s) => ({ value: s.id, label: `${s.name} (${s.email})` }))}
            />
          </div>
          <button
            type="button"
            disabled={!transferStaffId || loading}
            className={primaryBtn}
            onClick={() =>
              runAction('Transfer', () =>
                applicationLifecycleApi.transfer(applicationId, {
                  staffUserId: transferStaffId,
                  note,
                }),
              )
            }
          >
            Confirm transfer
          </button>
        </div>
      )}

      {showRollback && earlierSteps.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-[#C4E8D4] bg-[#F9FCFB] p-4 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#4B6358]">
              Send back to step
            </p>
            <Select
              value={rollbackStepId}
              onChange={setRollbackStepId}
              placeholder="Select an earlier step"
              options={earlierSteps.map((step) => ({
                value: step.stepId,
                label: `Step ${step.order}: ${step.name}`,
              }))}
            />
            <p className="mt-2 text-xs text-[#4B6358]">
              The student will be notified and asked to complete this step again.
              {note ? '' : ' You can add a reason in the note field above.'}
            </p>
          </div>
          <button
            type="button"
            disabled={!rollbackStepId || loading}
            className={primaryBtn}
            onClick={() =>
              runAction('Send back', () =>
                applicationLifecycleApi.rollback(applicationId, {
                  targetStepId: rollbackStepId,
                  note,
                }, role),
              )
            }
          >
            Confirm rollback
          </button>
        </div>
      )}
    </div>
  );
}
