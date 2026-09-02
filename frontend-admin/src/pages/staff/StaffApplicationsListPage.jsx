import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { AdminListBuilder } from '@/components/ui/AdminListBuilder';
import { Badge } from '@/components/ui/badge';
import { staffApplicationsApi } from '@/api/staffApplications.api';
import { useSocketEvent } from '@/contexts/SocketContext';
import { WS_EVENTS } from '@/lib/socket';
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

export function StaffApplicationsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [applications, setApplications] = useState([]);
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const [loading, setLoading] = useState(true);

  const query = useMemo(() => {
    const page = Number.parseInt(searchParams.get('page') || '1', 10);
    const limit = Number.parseInt(searchParams.get('limit') || '10', 10);
    return {
      page: Number.isNaN(page) ? 1 : page,
      limit: Number.isNaN(limit) ? 10 : limit,
      status: searchParams.get('status') ?? '',
      serviceId: searchParams.get('serviceId') ?? '',
      offeringId: searchParams.get('offeringId') ?? '',
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
      if (query.slaBreached) params.slaBreached = query.slaBreached;
      if (query.search) params.search = query.search;

      const { data } = await staffApplicationsApi.list(params);
      setApplications(data.data.applications ?? []);
      setPagination(data.data.pagination ?? DEFAULT_PAGINATION);
    } catch (err) {
      toast.error(err.message || 'Failed to load assigned requests');
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
          to={`/staff/applications/${row.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0A6640] hover:text-[#084F31]"
        >
          <Eye className="h-4 w-4" />
          Review
        </Link>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#10B981]">
            Assigned requests
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#052E1C]">
            Your review queue
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-[#4B6358]">
            These are the service requests assigned to you by the admin team.
          </p>
        </div>

        <AdminListBuilder
          title="Assigned to you"
          description="Open a request to preview documents and update its status."
          searchValue={query.search}
          onSearchChange={(value) => updateQuery({ search: value, page: 1 })}
          searchPlaceholder="Search student name or email..."
          filters={[
            {
              key: 'status',
              value: query.status,
              onChange: (value) => updateQuery({ status: value, page: 1 }),
              options: APPLICATION_STATUS_OPTIONS.filter((option) => option.value !== 'draft'),
            },
            {
              key: 'slaBreached',
              value: query.slaBreached,
              onChange: (value) => updateQuery({ slaBreached: value, page: 1 }),
              options: APPLICATION_SLA_FILTER_OPTIONS,
            },
          ]}
          columns={columns}
          rows={applications}
          getRowKey={(row) => row.id}
          getRowHref={(row) => `/staff/applications/${row.id}`}
          loading={loading}
          emptyTitle="No assigned requests"
          emptyDescription="When admin assigns a request to you, it will appear here."
          pagination={pagination}
          sort={{ sortBy: query.sortBy, sortOrder: query.sortOrder }}
          onSortChange={handleSortChange}
          onPageChange={(page) => updateQuery({ page })}
          onLimitChange={(limit) => updateQuery({ limit, page: 1 })}
          pageSizeOptions={APPLICATION_PAGE_SIZE_OPTIONS}
        />
    </DashboardLayout>
  );
}
