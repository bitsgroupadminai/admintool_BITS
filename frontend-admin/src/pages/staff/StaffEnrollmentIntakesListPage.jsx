import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { AdminListBuilder } from '@/components/ui/AdminListBuilder';
import { Badge } from '@/components/ui/badge';
import { staffEnrollmentIntakesApi } from '@/api/enrollmentIntakes.api';
import { useSocketEvent } from '@/contexts/SocketContext';
import { WS_EVENTS } from '@/lib/socket';
import { APPLICATION_PAGE_SIZE_OPTIONS } from '@/constants/applicationManagement.constants';

const DEFAULT_PAGINATION = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false,
};

export function StaffEnrollmentIntakesListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [intakes, setIntakes] = useState([]);
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const [loading, setLoading] = useState(true);

  const query = useMemo(() => {
    const page = Number.parseInt(searchParams.get('page') || '1', 10);
    const limit = Number.parseInt(searchParams.get('limit') || '10', 10);
    return {
      page: Number.isNaN(page) ? 1 : page,
      limit: Number.isNaN(limit) ? 10 : limit,
      search: searchParams.get('search') ?? '',
      sortBy: searchParams.get('sortBy') ?? 'createdAt',
      sortOrder: searchParams.get('sortOrder') ?? 'desc',
    };
  }, [searchParams]);

  const loadIntakes = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: query.page,
        limit: query.limit,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      };
      if (query.search) params.search = query.search;

      const { data } = await staffEnrollmentIntakesApi.list(params);
      setIntakes(data.data.intakes ?? []);
      setPagination(data.data.pagination ?? DEFAULT_PAGINATION);
    } catch (err) {
      toast.error(err.message || 'Failed to load enrollment intakes');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    loadIntakes();
  }, [loadIntakes]);

  useSocketEvent(WS_EVENTS.APPLICATION_UPDATED, () => {
    loadIntakes();
  }, [loadIntakes]);

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
      label: 'Applicant',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-semibold text-[#052E1C]">{row.applicantName}</p>
          <p className="mt-0.5 text-xs text-[#4B6358]">{row.applicantEmail}</p>
        </div>
      ),
    },
    { key: 'offeringName', label: 'Programme' },
    {
      key: 'status',
      label: 'Status',
      render: () => <Badge variant="incomplete">Awaiting authorization</Badge>,
    },
    {
      key: 'createdAt',
      label: 'Submitted',
      sortable: true,
      render: (row) => new Date(row.createdAt).toLocaleString(),
    },
    {
      key: 'actions',
      label: '',
      cellClassName: 'text-right',
      render: (row) => (
        <Link
          to={`/staff/enrollment-intakes/${row.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0A6640] hover:text-[#084F31]"
        >
          <Eye className="h-4 w-4" />
          View
        </Link>
      ),
    },
  ];

  return (
    <DashboardLayout
      title="Enrollment intakes"
      subtitle="New applicants waiting for admin authorization"
    >
      <AdminListBuilder
        title="Pending authorization"
        description="You are notified when students submit intake requests. Admin authorizes applicants."
        searchValue={query.search}
        onSearchChange={(value) => updateQuery({ search: value, page: 1 })}
        searchPlaceholder="Search applicant name or email..."
        columns={columns}
        rows={intakes}
        getRowKey={(row) => row.id}
        getRowHref={(row) => `/staff/enrollment-intakes/${row.id}`}
        loading={loading}
        emptyTitle="No pending intakes"
        emptyDescription="New enrollment requests will appear here when students start an application."
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
