/**
 * Estimate wait time in minutes based on queue position and throughput.
 * @param {number | null} position - 1-based position among waiting tickets
 * @param {{ processingRatePerHour?: number, counters?: Array<{ active?: boolean }> } | null | undefined} queueConfig
 */
export function estimateWaitMinutes(position, queueConfig) {
  if (!position || position <= 1) return 0;

  const ratePerHour = Math.max(1, queueConfig?.processingRatePerHour ?? 10);
  const activeCounters = Math.max(
    1,
    (queueConfig?.counters ?? []).filter((counter) => counter.active !== false).length || 1,
  );

  const peopleAhead = position - 1;
  const effectiveRatePerHour = ratePerHour * activeCounters;
  return Math.max(1, Math.ceil((peopleAhead / effectiveRatePerHour) * 60));
}

/**
 * Human-readable ETA label for students.
 * @param {number} minutes
 */
export function formatWaitEstimate(minutes) {
  if (!minutes || minutes <= 0) return 'You are next in line';
  if (minutes < 60) return `About ${minutes} min wait`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (remainder === 0) return `About ${hours} hr wait`;
  return `About ${hours} hr ${remainder} min wait`;
}

/**
 * @param {{ counters?: Array<{ id: string, label: string, active?: boolean }> } | null | undefined} queueConfig
 */
export function getActiveCounters(queueConfig) {
  const counters = queueConfig?.counters ?? [];
  const active = counters.filter((counter) => counter.active !== false && counter.id && counter.label);
  return active.length > 0 ? active : [{ id: 'default', label: 'Service counter' }];
}

/**
 * @param {{ counters?: Array<{ id: string, label: string, active?: boolean }> } | null | undefined} queueConfig
 * @param {string | null | undefined} counterId
 */
export function resolveCounterLabel(queueConfig, counterId) {
  if (!counterId) return null;
  const match = (queueConfig?.counters ?? []).find((counter) => counter.id === counterId);
  return match?.label ?? null;
}
