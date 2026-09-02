import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Download, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { AdminListBuilder } from '@/components/ui/AdminListBuilder';
import { Badge } from '@/components/ui/badge';
import { applicationsApi } from '@/api/applications.api';
import { exportsApi } from '@/api/exports.api';
import { useSocketEvent } from '@/contexts/SocketContext';
import { WS_EVENTS } from '@/lib/socket';
import { servicesApi } from '@/api/services.api';
import { downloadAxiosBlob } from '@/utils/fileDownload';
import {
  APPLICATION_PAGE_SIZE_OPTIONS,
  APPLICATION_STATUS_BADGE_VARIANT,
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_OPTIONS,
  APPLICATION_SLA_FILTER_OPTIONS,
} from '@/constants/applicationManagement.constants';

const DEFAULT_PAGINATION = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false,
};

export function ApplicationsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [applications, setApplications] = useState([]);
  const [services, setServices] = useState([]);
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const query = useMemo(() => {
    const page = Number.parseInt(searchParams.get('page') || '1', 10);
    const limit = Number.parseInt(searchParams.get('limit') || '10', 10);
    return {
      page: Number.isNaN(page) ? 1 : page,
      limit: Number.isNaN(limit) ? 10 : limit,
      status: searchParams.get('status') ?? '',
      serviceId: searchParams.get('serviceId') ?? '',
      offeringId: searchParams.get('offeringId') ?? '',
      staffId: searchParams.get('staffId') ?? '',
      slaBreached: searchParams.get('slaBreached') ?? '',
      search: searchParams.get('search') ?? '',
      sortBy: searchParams.get('sortBy') ?? 'updatedAt',
      sortOrder: searchParams.get('sortOrder') ?? 'desc',
    };
  }, [searchParams]);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: query.page,
        limit: query.limit,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      };
      if (query.status) params.status = query.status;
      if (query.serviceId) params.serviceId = query.serviceId;
      if (query.offeringId) params.offeringId = query.offeringId;
      if (query.staffId) params.staffId = query.staffId;
      if (query.slaBreached) params.slaBreached = query.slaBreached;
      if (query.search) params.search = query.search;

      const { data } = await applicationsApi.list(params);
      setApplications(data.data.applications ?? []);
      setPagination(data.data.pagination ?? DEFAULT_PAGINATION);
    } catch (err) {
      toast.error(err.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  useSocketEvent(WS_EVENTS.APPLICATION_UPDATED, () => {
    loadApplications();
  }, [loadApplications]);

  useEffect(() => {
    servicesApi
      .list()
      .then(({ data }) => setServices(data.data.services ?? []))
      .catch(() => {});
  }, []);

  const updateQuery = (updates) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (!value) next.delete(key);
      else next.set(key, String(value));
    });
    setSearchParams(next);
  };

  const handleSortChange = (sortBy) => {
    updateQuery({
      sortBy,
      sortOrder: query.sortBy === sortBy && query.sortOrder === 'asc' ? 'desc' : 'asc',
      page: 1,
    });
  };

  const handleExport = async (format) => {
    setExporting(true);
    try {
      const filters = { format };
      if (query.status) filters.status = query.status;
      if (query.serviceId) filters.serviceId = query.serviceId;
      if (query.offeringId) filters.offeringId = query.offeringId;

      const response = await exportsApi.applications(filters);
      downloadAxiosBlob(response, `service-requests.${format}`);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (err) {
      toast.error(err.message || 'Failed to export requests');
    } finally {
      setExporting(false);
    }
  };

  const columns = [
    {
      key: 'applicantName',
      label: 'Student',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-semibold text-[#052E1C]">{row.applicantName}</p>
          <p className="mt-0.5 text-xs text-[#4B6358]">{row.applicantEmail}</p>
        </div>
      ),
    },
    { key: 'serviceName', label: 'Service' },
    { key: 'offeringName', label: 'Option' },
    {
      key: 'assignedTo',
      label: 'Assigned to',
      render: (row) =>
        row.assignedTo ? (
          <div>
            <p className="font-medium text-[#052E1C]">{row.assignedTo.name}</p>
            <p className="mt-0.5 text-xs text-[#4B6358]">{row.assignedTo.email}</p>
          </div>
        ) : (
          <span className="text-[#9CA3AF]">Unassigned</span>
        ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (row) => (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={APPLICATION_STATUS_BADGE_VARIANT[row.status] ?? 'default'}>
            {APPLICATION_STATUS_LABELS[row.status] ?? row.status}
          </Badge>
          {row.slaBreached || row.slaOverdue ? (
            <Badge variant="disabled">SLA breach</Badge>
          ) : null}
        </div>
      ),
    },
    { key: 'documentCount', label: 'Documents' },
    {
      key: 'updatedAt',
      label: 'Updated',
      sortable: true,
      render: (row) => new Date(row.updatedAt).toLocaleString(),
    },
    {
      key: 'actions',
      label: '',
      cellClassName: 'text-right',
      render: (row) => (
        <Link
          to={`/admin/applications/${row.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0A6640] hover:text-[#084F31]"
        >
          <Eye className="h-4 w-4" />
          Review
        </Link>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#10B981]">
            Requests
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#052E1C]">
            Student service requests
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-[#4B6358]">
            Review submitted requests, open uploaded documents, and update request status.
          </p>
        </div>

        <AdminListBuilder
          title="Incoming requests"
          description="Submitted and in-review requests appear here by default. Export respects active status and service filters."
          searchValue={query.search}
          onSearchChange={(value) => updateQuery({ search: value, page: 1 })}
          searchPlaceholder="Search student name or email..."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {['csv', 'xlsx', 'json'].map((format) => (
                <button
                  key={format}
                  type="button"
                  disabled={exporting}
                  onClick={() => handleExport(format)}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#C4E8D4] bg-white px-3 text-sm font-semibold text-[#0A6640] transition hover:bg-[#F0FAF5] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Download className="h-3.5 w-3.5" />
                  {format.toUpperCase()}
                </button>
              ))}
            </div>
          }
          filters={[
            {
              key: 'status',
              value: query.status,
              onChange: (value) => updateQuery({ status: value, page: 1 }),
              options: APPLICATION_STATUS_OPTIONS,
            },
            {
              key: 'slaBreached',
              value: query.slaBreached,
              onChange: (value) => updateQuery({ slaBreached: value, page: 1 }),
              options: APPLICATION_SLA_FILTER_OPTIONS,
            },
            {
              key: 'serviceId',
              value: query.serviceId,
              onChange: (value) => updateQuery({ serviceId: value, page: 1 }),
              options: [
                { value: '', label: 'All services' },
                ...services.map((service) => ({ value: service.id, label: service.name })),
              ],
            },
          ]}
          columns={columns}
          rows={applications}
          getRowKey={(row) => row.id}
          getRowHref={(row) => `/admin/applications/${row.id}`}
          loading={loading}
          emptyTitle="No requests found"
          emptyDescription="Students will appear here after they submit a service request."
          pagination={pagination}
          sort={{ sortBy: query.sortBy, sortOrder: query.sortOrder }}
          onSortChange={handleSortChange}
          onPageChange={(page) => updateQuery({ page })}
          onLimitChange={(limit) => updateQuery({ limit, page: 1 })}
          pageSizeOptions={APPLICATION_PAGE_SIZE_OPTIONS}
        />
      </div>
    </AdminLayout>
  );
}
