import { useCallback, useMemo, useState } from 'react';

const DAY_MS = 24 * 60 * 60 * 1000;

export function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

export function defaultDateRange(days = 14) {
  const to = new Date();
  const from = new Date(to.getTime() - (days - 1) * DAY_MS);
  return { from: toIsoDate(from), to: toIsoDate(to) };
}

export const DATE_PRESETS = [
  { id: '7d', label: 'Last 7 days', days: 7 },
  { id: '14d', label: 'Last 14 days', days: 14 },
  { id: '30d', label: 'Last 30 days', days: 30 },
  { id: '90d', label: 'Last 90 days', days: 90 },
];

export function useDashboardFilters(initial = defaultDateRange()) {
  const [filters, setFiltersState] = useState(initial);

  const setFilters = useCallback((updates) => {
    setFiltersState((current) => {
      const next = { ...current, ...updates };
      Object.keys(next).forEach((key) => {
        if (!next[key]) delete next[key];
      });
      return next;
    });
  }, []);

  const applyPreset = useCallback((days) => {
    setFilters(defaultDateRange(days));
  }, [setFilters]);

  const resetFilters = useCallback(() => {
    setFiltersState(defaultDateRange());
  }, []);

  const defaultRange = defaultDateRange();

  const hasActiveFilters = useMemo(
    () =>
      Boolean(
        filters.serviceId ||
          filters.offeringId ||
          filters.status ||
          filters.staffId ||
          filters.from !== defaultRange.from ||
          filters.to !== defaultRange.to,
      ),
    [filters, defaultRange.from, defaultRange.to],
  );

  return { filters, setFilters, applyPreset, resetFilters, hasActiveFilters };
}
