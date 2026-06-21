import { useMemo } from 'react';
import { CalendarDays, Clock3 } from 'lucide-react';

function groupSlotsByDay(slots) {
  return slots.reduce((groups, slot) => {
    const dayKey = new Date(slot.slotStart).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    if (!groups[dayKey]) groups[dayKey] = [];
    groups[dayKey].push(slot);
    return groups;
  }, {});
}

export function AppointmentSlotPicker({
  slots = [],
  closures = [],
  loading = false,
  disabled = false,
  selectedSlotStart = null,
  onSelect,
  emptyMessage = 'No available slots right now.',
  maxDays = null,
}) {
  const grouped = useMemo(() => groupSlotsByDay(slots), [slots]);
  const dayEntries = useMemo(() => {
    const entries = Object.entries(grouped);
    return maxDays ? entries.slice(0, maxDays) : entries;
  }, [grouped, maxDays]);

  if (loading) {
    return <p className="text-sm text-[#4B6358]">Loading available slots...</p>;
  }

  return (
    <div className="space-y-4">
      {closures.length > 0 ? (
        <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-xs text-[#92400E]">
          <p className="font-semibold">Upcoming closures</p>
          <ul className="mt-1 space-y-0.5">
            {closures.slice(0, 4).map((closure) => (
              <li key={closure.date}>
                {closure.date} — {closure.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {dayEntries.length === 0 ? (
        <p className="rounded-xl border border-[#E2EEE8] bg-white px-3 py-2 text-sm text-[#4B6358]">
          {emptyMessage}
        </p>
      ) : (
        dayEntries.map(([day, daySlots]) => (
          <section key={day}>
            <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#0A6640]">
              <CalendarDays className="h-3.5 w-3.5" />
              {day}
            </h4>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {daySlots.map((slot) => {
                const isSelected =
                  selectedSlotStart &&
                  new Date(selectedSlotStart).getTime() === new Date(slot.slotStart).getTime();
                return (
                  <button
                    key={slot.slotStart}
                    type="button"
                    disabled={disabled}
                    onClick={() => onSelect?.(slot.slotStart)}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition ${
                      isSelected
                        ? 'border-[#0A6640] bg-[#F0FAF5] text-[#052E1C] ring-2 ring-[#0A6640]/20'
                        : 'border-[#C4E8D4] bg-white text-[#052E1C] hover:bg-[#F0FAF5]'
                    } disabled:opacity-60`}
                  >
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      <Clock3 className="h-3.5 w-3.5 text-[#0A6640]" />
                      {new Date(slot.slotStart).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className="text-xs font-semibold text-[#0A6640]">
                      {slot.remaining} left
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
