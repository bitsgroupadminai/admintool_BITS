import { useState } from 'react';
import { toast } from 'sonner';
import { Archive, CheckSquare, Power, PowerOff, Square, Trash2 } from 'lucide-react';
import { useConfirm } from '@/components/ui/confirm-context';
import { offeringsApi } from '@/api/offerings.api';

/**
 * @param {Object} props
 * @param {Array} props.offerings
 * @param {() => Promise<void>} props.onUpdated
 * @param {Set<string>} [props.selected]
 * @param {(set: Set<string>) => void} [props.onSelectedChange]
 */
export function OfferingBulkToolbar({ offerings, onUpdated, selected: externalSelected, onSelectedChange }) {
  const [internalSelected, setInternalSelected] = useState(new Set());
  const selected = externalSelected ?? internalSelected;
  const setSelected = onSelectedChange ?? setInternalSelected;
  const [submitting, setSubmitting] = useState(false);
  const confirm = useConfirm();

  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === offerings.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(offerings.map((o) => o.id)));
    }
  };

  const runBulk = async (action) => {
    if (!selected.size) return;
    const labels = { enable: 'enable', disable: 'disable', archive: 'archive', delete: 'delete' };
    const ok = await confirm({
      title: `${labels[action]} ${selected.size} offering(s)?`,
      description:
        action === 'delete'
          ? 'This permanently removes the selected offerings. Offerings that already have student requests cannot be deleted.'
          : `This will ${action} the selected offerings.`,
      confirmLabel: labels[action],
      variant: action === 'archive' || action === 'delete' ? 'danger' : 'default',
    });
    if (!ok) return;

    setSubmitting(true);
    try {
      if (action === 'delete') {
        const results = await Promise.allSettled(
          [...selected].map((offeringId) => offeringsApi.remove(offeringId)),
        );
        const failed = results.filter((r) => r.status === 'rejected');
        if (failed.length) {
          toast.error(`${failed.length} offering(s) could not be deleted`);
        } else {
          toast.success('Offerings deleted');
        }
      } else {
        const { data } = await offeringsApi.bulk({
          offeringIds: [...selected],
          action,
        });
        const results = data.data.results ?? [];
        const failed = results.filter((r) => !r.success);
        if (failed.length) {
          toast.error(`${failed.length} offering(s) could not be ${action}d`);
        } else {
          toast.success(`Offerings ${action}d`);
        }
      }
      setSelected(new Set());
      await onUpdated();
    } catch (err) {
      toast.error(err.message || 'Bulk action failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!offerings.length) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-[#C4E8D4] bg-[#F0FAF5] px-4 py-3">
      <button
        type="button"
        onClick={toggleAll}
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#0A6640]"
      >
        {selected.size === offerings.length ? (
          <CheckSquare className="h-4 w-4" />
        ) : (
          <Square className="h-4 w-4" />
        )}
        {selected.size ? `${selected.size} selected` : 'Select all'}
      </button>
      {selected.size > 0 && (
        <>
          <button
            type="button"
            disabled={submitting}
            onClick={() => runBulk('enable')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#C4E8D4] bg-white px-3 py-1.5 text-xs font-semibold text-[#0A6640] transition hover:bg-[#F0FAF5] disabled:opacity-60"
          >
            <Power className="h-3.5 w-3.5" />
            Enable
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => runBulk('disable')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#C4E8D4] bg-white px-3 py-1.5 text-xs font-semibold text-[#0A6640] transition hover:bg-[#F0FAF5] disabled:opacity-60"
          >
            <PowerOff className="h-3.5 w-3.5" />
            Disable
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => runBulk('archive')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#FECACA] bg-white px-3 py-1.5 text-xs font-semibold text-[#B91C1C] transition hover:bg-[#FEF2F2] disabled:opacity-60"
          >
            <Archive className="h-3.5 w-3.5" />
            Archive
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => runBulk('delete')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#FECACA] bg-white px-3 py-1.5 text-xs font-semibold text-[#B91C1C] transition hover:bg-[#FEF2F2] disabled:opacity-60"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </>
      )}
    </div>
  );
}

/**
 * @param {Object} props
 * @param {string} props.offeringId
 * @param {boolean} props.checked
 * @param {(id: string) => void} props.onToggle
 */
export function OfferingBulkCheckbox({ offeringId, checked, onToggle }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={() => onToggle(offeringId)}
      className="h-4 w-4 rounded border-[#C4E8D4] text-[#0A6640]"
      aria-label="Select offering"
    />
  );
}
