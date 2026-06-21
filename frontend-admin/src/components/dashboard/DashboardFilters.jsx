import { useEffect, useMemo, useState } from 'react';
import { Download, FileText, RotateCcw } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { Select } from '@/components/ui/select';
import { DATE_PRESETS } from '@/hooks/useDashboardFilters';
import { servicesApi } from '@/api/services.api';
import { offeringsApi } from '@/api/offerings.api';
import { userApi } from '@/api/user.api';
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_OPTIONS,
} from '@/constants/applicationManagement.constants';

export function DashboardFilters({
  filters,
  onChange,
  onReset,
  onExportCsv,
  onExportPdf,
  showStaffFilter = false,
  exporting = false,
}) {
  const [services, setServices] = useState([]);
  const [offerings, setOfferings] = useState([]);
  const [staff, setStaff] = useState([]);

  useEffect(() => {
    servicesApi
      .list()
      .then(({ data }) => setServices(data.data.services ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!filters.serviceId) {
      setOfferings([]);
      return;
    }
    offeringsApi
      .list(filters.serviceId)
      .then(({ data }) => setOfferings(data.data.offerings ?? []))
      .catch(() => setOfferings([]));
  }, [filters.serviceId]);

  useEffect(() => {
    if (!showStaffFilter) return;
    userApi
      .listStaff()
      .then(({ data }) => setStaff(data.data.staff ?? []))
      .catch(() => {});
  }, [showStaffFilter]);

  const serviceOptions = useMemo(
    () => services.map((service) => ({ value: service.id, label: service.name })),
    [services],
  );

  const offeringOptions = useMemo(
    () => offerings.map((offering) => ({ value: offering.id, label: offering.name })),
    [offerings],
  );

  const statusOptions = useMemo(
    () =>
      APPLICATION_STATUS_OPTIONS.filter(
        (option) =>
          option.value &&
          option.value !== 'all' &&
          !['draft', 'pending_authorization'].includes(option.value),
      ).map((option) => ({
        value: option.value,
        label: APPLICATION_STATUS_LABELS[option.value] ?? option.label,
      })),
    [],
  );

  const staffOptions = useMemo(
    () => staff.map((member) => ({ value: member.id, label: member.name })),
    [staff],
  );

  return (
    <section className="rounded-2xl border border-[#E2EEE8] bg-gradient-to-br from-white via-[#FAFCFB] to-[#F6FAF5] p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#10B981]">Filters</p>
          <p className="mt-1 text-sm text-[#4B6358]">Refine metrics by date range, service, status, and staff.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {DATE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onChange(buildPresetRange(preset.days))}
              className="rounded-lg border border-[#C4E8D4] bg-white px-3 py-1.5 text-xs font-semibold text-[#0A6640] hover:bg-[#F0FAF5]"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-[#4B6358]">From</span>
          <DatePicker value={filters.from} onChange={(value) => onChange({ from: value })} size="sm" />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-[#4B6358]">To</span>
          <DatePicker
            value={filters.to}
            onChange={(value) => onChange({ to: value })}
            minDate={filters.from}
            size="sm"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-[#4B6358]">Service</span>
          <Select
            value={filters.serviceId ?? ''}
            onChange={(value) =>
              onChange({
                serviceId: value || undefined,
                offeringId: undefined,
              })
            }
            placeholder="All services"
            options={serviceOptions}
            size="sm"
            aria-label="Service"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-[#4B6358]">Offering</span>
          <Select
            value={filters.offeringId ?? ''}
            onChange={(value) => onChange({ offeringId: value || undefined })}
            placeholder="All offerings"
            options={offeringOptions}
            disabled={!filters.serviceId}
            size="sm"
            aria-label="Offering"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-[#4B6358]">Status</span>
          <Select
            value={filters.status ?? ''}
            onChange={(value) => onChange({ status: value || undefined })}
            placeholder="All statuses"
            options={statusOptions}
            size="sm"
            aria-label="Status"
          />
        </label>
        {showStaffFilter ? (
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-[#4B6358]">Staff</span>
            <Select
              value={filters.staffId ?? ''}
              onChange={(value) => onChange({ staffId: value || undefined })}
              placeholder="All staff"
              options={staffOptions}
              size="sm"
              aria-label="Staff"
            />
          </label>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#C4E8D4] bg-white px-4 text-sm font-semibold text-[#0A6640]"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </button>
        <button
          type="button"
          onClick={onExportCsv}
          disabled={exporting}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#C4E8D4] bg-white px-4 text-sm font-semibold text-[#0A6640] disabled:opacity-60"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
        <button
          type="button"
          onClick={onExportPdf}
          disabled={exporting}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#C4E8D4] bg-white px-4 text-sm font-semibold text-[#0A6640] disabled:opacity-60"
        >
          <FileText className="h-4 w-4" />
          Export PDF
        </button>
      </div>
    </section>
  );
}

function buildPresetRange(days) {
  const to = new Date();
  const from = new Date(to.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}
