import { useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdminListTableSkeleton } from '@/components/skeletons';
import { Select } from '@/components/ui/select';

export function AdminListBuilder({
  title,
  description,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  actions = null,
  columns,
  rows,
  getRowKey,
  loading,
  emptyTitle,
  emptyDescription,
  pagination,
  sort,
  onSortChange,
  onPageChange,
  onLimitChange,
  pageSizeOptions = [10, 20, 50],
}) {
  const [openFilterKey, setOpenFilterKey] = useState(null);

  return (
    <section className="overflow-hidden rounded-2xl border border-[#C4E8D4] bg-white/85 shadow-[0_4px_24px_rgba(10,102,64,0.07)]">
      <div className="border-b border-[#E2EEE8] px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight text-[#052E1C]">{title}</h2>
            {description && <p className="mt-1 text-sm text-[#4B6358]">{description}</p>}
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            {actions}
            <label className="relative block min-w-0 lg:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={searchPlaceholder}
                className="h-10 w-full rounded-xl border border-[#C4E8D4] bg-[#F0FAF5] pl-9 pr-3 text-sm text-[#052E1C] outline-none transition hover:border-[#6EE7B7] hover:bg-[#EDFAF3] focus:border-[#6EE7B7] focus:bg-white focus:ring-2 focus:ring-[#6EE7B7]/20"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {filters.map((filter) => (
                <label key={filter.key} className="relative">
                  {filter.type === 'text' ? (
                    <>
                      <input
                        value={filter.value}
                        onChange={(event) => filter.onChange(event.target.value)}
                        placeholder={filter.placeholder}
                        list={filter.datalistId}
                        className="h-10 w-52 rounded-xl border border-[#C4E8D4] bg-white px-3 text-sm font-medium text-[#4B6358] outline-none transition placeholder:text-[#A8BDB5] hover:bg-[#F0FAF5] focus:border-[#6EE7B7] focus:ring-2 focus:ring-[#6EE7B7]/20"
                      />
                      {filter.datalistId && (
                        <datalist id={filter.datalistId}>
                          {filter.options.map((option) => (
                            <option key={option.value || option.label} value={option.label} />
                          ))}
                        </datalist>
                      )}
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setOpenFilterKey((current) =>
                            current === filter.key ? null : filter.key,
                          )
                        }
                        className="flex h-10 min-w-40 items-center justify-between gap-3 rounded-xl border border-[#C4E8D4] bg-white py-0 pl-3 pr-3 text-sm font-medium text-[#4B6358] outline-none transition hover:bg-[#F0FAF5] focus:border-[#6EE7B7] focus:ring-2 focus:ring-[#6EE7B7]/20"
                      >
                        <span>
                          {filter.options.find((option) => option.value === filter.value)?.label ??
                            filter.options[0]?.label}
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 text-[#9CA3AF]" />
                      </button>
                      {openFilterKey === filter.key && (
                        <div className="absolute right-0 z-50 mt-2 min-w-full overflow-hidden rounded-xl border border-[#D1EEE0] bg-white py-1 shadow-[0_14px_45px_rgba(5,46,28,0.16)]">
                          {filter.options.map((option) => {
                            const selected = option.value === filter.value;
                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                  filter.onChange(option.value);
                                  setOpenFilterKey(null);
                                }}
                                className={cn(
                                  'flex w-full items-center justify-between gap-4 px-3 py-2 text-left text-sm transition',
                                  selected
                                    ? 'bg-[#D1FAE5] font-semibold text-[#052E1C]'
                                    : 'text-[#4B6358] hover:bg-[#F0FAF5] hover:text-[#052E1C]',
                                )}
                              >
                                {option.label}
                                {selected && <span className="h-1.5 w-1.5 rounded-full bg-[#0A6640]" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[#E2EEE8]">
          <thead className="bg-[#F0FAF5]/80">
            <tr>
              {columns.map((column) => {
                const active = sort?.sortBy === column.key;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    className={cn(
                      'px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-[#4B6358] sm:px-6',
                      column.className,
                    )}
                  >
                    {column.sortable ? (
                      <button
                        type="button"
                        onClick={() => onSortChange(column.key)}
                        className="inline-flex items-center gap-1.5 rounded-lg text-left transition hover:text-[#0A6640]"
                      >
                        {column.label}
                        <ChevronsUpDown
                          className={cn(
                            'h-3.5 w-3.5',
                            active ? 'text-[#0A6640]' : 'text-[#9CA3AF]',
                          )}
                        />
                      </button>
                    ) : (
                      column.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2EEE8] bg-white/70">
            {loading ? (
              <AdminListTableSkeleton columnCount={columns.length} />
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-14 text-center">
                  <p className="text-sm font-semibold text-[#052E1C]">{emptyTitle}</p>
                  {emptyDescription && (
                    <p className="mt-1 text-sm text-[#4B6358]">{emptyDescription}</p>
                  )}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={getRowKey(row)} className="transition hover:bg-[#F9FCFB]">
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        'whitespace-nowrap px-5 py-4 text-sm text-[#4B6358] sm:px-6',
                        column.cellClassName,
                      )}
                    >
                      {column.render ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-[#E2EEE8] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2 text-sm text-[#4B6358]">
          <span>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <span className="text-[#A8BDB5]">/</span>
          <span>{pagination.total} total</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={String(pagination.limit)}
            onChange={onLimitChange}
            size="sm"
            options={pageSizeOptions.map((limit) => ({
              value: String(limit),
              label: `${limit} / page`,
            }))}
            className="w-auto"
          />
          <button
            type="button"
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={!pagination.hasPrevPage}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#C4E8D4] bg-white px-3 text-sm font-semibold text-[#0A6640] transition hover:bg-[#F0FAF5] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </button>
          <button
            type="button"
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={!pagination.hasNextPage}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#C4E8D4] bg-white px-3 text-sm font-semibold text-[#0A6640] transition hover:bg-[#F0FAF5] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
