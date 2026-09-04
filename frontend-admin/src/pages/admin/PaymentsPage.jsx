import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CreditCard,
  Eye,
  IndianRupee,
  Layers,
  Receipt,
  Trash2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { AdminListBuilder } from '@/components/ui/AdminListBuilder';
import { Badge } from '@/components/ui/badge';
import { useConfirm } from '@/components/ui/confirm-context';
import { paymentsApi } from '@/api/payments.api';
import { servicesApi } from '@/api/services.api';

const DEFAULT_PAGINATION = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false,
};

const PAYMENT_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'paid', label: 'Paid' },
  { value: 'created', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
];

const PAYMENT_STATUS_BADGE = {
  paid: 'complete',
  created: 'draft',
  failed: 'disabled',
};

function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN');
}

function timingLabel(timing) {
  if (timing === 'workflow_step') return 'At workflow step';
  return 'Before submit';
}

export function PaymentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [overview, setOverview] = useState(null);
  const [payments, setPayments] = useState([]);
  const [services, setServices] = useState([]);
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const [loading, setLoading] = useState(true);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [selectedPaymentId, setSelectedPaymentId] = useState(null);
  const [paymentDetail, setPaymentDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const confirm = useConfirm();

  const query = useMemo(() => {
    const page = Number.parseInt(searchParams.get('page') || '1', 10);
    const limit = Number.parseInt(searchParams.get('limit') || '20', 10);
    return {
      page: Number.isNaN(page) ? 1 : page,
      limit: Number.isNaN(limit) ? 20 : limit,
      status: searchParams.get('status') ?? '',
      serviceId: searchParams.get('serviceId') ?? '',
      applicationId: searchParams.get('applicationId') ?? '',
      search: searchParams.get('search') ?? '',
      sortBy: searchParams.get('sortBy') ?? 'createdAt',
      sortOrder: searchParams.get('sortOrder') ?? 'desc',
    };
  }, [searchParams]);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const { data } = await paymentsApi.getOverview();
      setOverview(data.data);
    } catch (err) {
      toast.error(err.message || 'Failed to load payment overview');
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  const loadPayments = useCallback(async () => {
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
      if (query.applicationId) params.applicationId = query.applicationId;
      if (query.search) params.search = query.search;

      const { data } = await paymentsApi.list(params);
      setPayments(data.data.payments ?? []);
      setPagination(data.data.pagination ?? DEFAULT_PAGINATION);
    } catch (err) {
      toast.error(err.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

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

  const openPaymentDetail = async (paymentId) => {
    setSelectedPaymentId(paymentId);
    setDetailLoading(true);
    try {
      const { data } = await paymentsApi.get(paymentId);
      setPaymentDetail(data.data.payment);
    } catch (err) {
      toast.error(err.message || 'Failed to load payment details');
      setSelectedPaymentId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closePaymentDetail = () => {
    setSelectedPaymentId(null);
    setPaymentDetail(null);
  };

  const handleDeletePayment = async (payment) => {
    const ok = await confirm({
      title: `Delete ${payment.label || 'this payment'}?`,
      description:
        'This permanently removes the payment record from CampusFlow. The student can pay again. This does not refund the charge in Razorpay.',
      confirmLabel: 'Delete payment',
      variant: 'danger',
    });
    if (!ok) return;

    setDeletingId(payment.id);
    try {
      await paymentsApi.remove(payment.id);
      toast.success('Payment deleted');
      if (selectedPaymentId === payment.id) closePaymentDetail();
      await Promise.all([loadPayments(), loadOverview()]);
    } catch (err) {
      toast.error(err.message || 'Could not delete payment');
    } finally {
      setDeletingId(null);
    }
  };

  const summary = overview?.summary;

  const columns = [
    {
      key: 'applicantName',
      label: 'Student',
      render: (row) => (
        <div>
          <p className="font-semibold text-[#052E1C]">{row.applicantName || '—'}</p>
          <p className="mt-0.5 text-xs text-[#4B6358]">{row.applicantEmail}</p>
        </div>
      ),
    },
    { key: 'serviceName', label: 'Service' },
    { key: 'offeringName', label: 'Option' },
    { key: 'label', label: 'Fee' },
    {
      key: 'amountDisplay',
      label: 'Amount',
      sortable: true,
      render: (row) => <span className="font-semibold text-[#052E1C]">{row.amountDisplay}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <Badge variant={PAYMENT_STATUS_BADGE[row.status] ?? 'default'}>{row.statusLabel}</Badge>
      ),
    },
    {
      key: 'paidAt',
      label: 'Paid at',
      sortable: true,
      render: (row) => formatDateTime(row.paidAt ?? row.createdAt),
    },
    {
      key: 'actions',
      label: '',
      cellClassName: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => openPaymentDetail(row.id)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0A6640] hover:text-[#084F31]"
          >
            <Eye className="h-4 w-4" />
            Details
          </button>
          <button
            type="button"
            onClick={() => handleDeletePayment(row)}
            disabled={deletingId === row.id}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 bg-white text-red-500 transition hover:bg-red-50 disabled:opacity-50"
            title="Delete payment"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#10B981]">
            Payments
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#052E1C]">
            Service fees & receipts
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-[#4B6358]">
            Track Razorpay collections, see which services require fees, and review every
            transaction.
          </p>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={IndianRupee}
            label="Total collected"
            value={summary?.totalCollectedDisplay ?? '—'}
            loading={overviewLoading}
          />
          <SummaryCard
            icon={Receipt}
            label="Successful payments"
            value={summary?.paidCount ?? '—'}
            loading={overviewLoading}
          />
          <SummaryCard
            icon={CreditCard}
            label="Pending checkout"
            value={summary?.pendingCount ?? '—'}
            loading={overviewLoading}
          />
          <SummaryCard
            icon={Layers}
            label="Fee-enabled services"
            value={summary?.feeEnabledServiceCount ?? '—'}
            loading={overviewLoading}
          />
        </div>

        <section className="mb-8 overflow-hidden rounded-2xl border border-[#C4E8D4] bg-white/85 shadow-[0_4px_24px_rgba(10,102,64,0.07)]">
          <div className="border-b border-[#E2EEE8] px-5 py-5 sm:px-6">
            <h2 className="text-lg font-bold text-[#052E1C]">Services with online fees</h2>
            <p className="mt-1 text-sm text-[#4B6358]">
              Offerings configured to collect payment via Razorpay.
            </p>
          </div>
          <div className="p-5 sm:p-6">
            {overviewLoading ? (
              <p className="text-sm text-[#4B6358]">Loading fee configuration...</p>
            ) : (overview?.feeEnabledServices ?? []).length === 0 ? (
              <p className="text-sm text-[#4B6358]">
                No offerings have fees enabled yet. Configure fees under Services → Offering →
                Details.
              </p>
            ) : (
              <div className="space-y-4">
                {overview.feeEnabledServices.map((service) => (
                  <div
                    key={service.serviceId}
                    className="rounded-xl border border-[#E2EEE8] bg-[#F9FCFB] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link
                        to={`/admin/services/${service.serviceId}`}
                        className="text-base font-bold text-[#0A6640] hover:underline"
                      >
                        {service.serviceName}
                      </Link>
                      <span className="text-xs font-semibold uppercase tracking-wide text-[#4B6358]">
                        {service.offerings.length} fee option
                        {service.offerings.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {service.offerings.map((offering) => (
                        <div
                          key={offering.offeringId}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#E2EEE8] bg-white px-3 py-2.5 text-sm"
                        >
                          <div>
                            <p className="font-semibold text-[#052E1C]">{offering.offeringName}</p>
                            <p className="mt-0.5 text-xs text-[#4B6358]">
                              {offering.feeLabel} · {timingLabel(offering.timing)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-[#052E1C]">{offering.amountDisplay}</p>
                            <p className="text-xs capitalize text-[#6B7280]">{offering.offeringStatus}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <AdminListBuilder
          title="All transactions"
          description="Every Razorpay order created for student service requests."
          searchValue={query.search}
          onSearchChange={(value) => updateQuery({ search: value, page: 1 })}
          searchPlaceholder="Search email, fee label, order or payment ID..."
          filters={[
            {
              key: 'status',
              value: query.status,
              onChange: (value) => updateQuery({ status: value, page: 1 }),
              options: PAYMENT_STATUS_OPTIONS,
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
          rows={payments}
          getRowKey={(row) => row.id}
          loading={loading}
          emptyTitle="No payments found"
          emptyDescription="Payments appear here when students pay service fees online."
          pagination={pagination}
          sort={{ sortBy: query.sortBy, sortOrder: query.sortOrder }}
          onSortChange={handleSortChange}
          onPageChange={(page) => updateQuery({ page })}
          onLimitChange={(limit) => updateQuery({ limit, page: 1 })}
          pageSizeOptions={[10, 20, 50]}
        />
      </div>

      {selectedPaymentId ? (
        <PaymentDetailModal
          loading={detailLoading}
          payment={paymentDetail}
          deleting={deletingId === paymentDetail?.id}
          onDelete={() => paymentDetail && handleDeletePayment(paymentDetail)}
          onClose={closePaymentDetail}
        />
      ) : null}
    </AdminLayout>
  );
}

function SummaryCard({ icon: Icon, label, value, loading }) {
  return (
    <div className="rounded-2xl border border-[#C4E8D4] bg-white/85 p-5 shadow-[0_4px_24px_rgba(10,102,64,0.06)]">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0FAF5] text-[#0A6640]">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#4B6358]">{label}</p>
          <p className="mt-1 text-2xl font-bold text-[#052E1C]">{loading ? '...' : value}</p>
        </div>
      </div>
    </div>
  );
}

function PaymentDetailModal({ payment, loading, deleting, onDelete, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#052E1C]/40 p-4 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#E2EEE8] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#E2EEE8] px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#10B981]">
              Payment details
            </p>
            <h3 className="mt-1 text-xl font-bold text-[#052E1C]">
              {payment?.label ?? 'Loading...'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#4B6358] hover:bg-[#F0FAF5]"
            aria-label="Close"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        {loading || !payment ? (
          <div className="px-5 py-8 text-sm text-[#4B6358]">Loading payment details...</div>
        ) : (
          <div className="space-y-6 px-5 py-6">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={PAYMENT_STATUS_BADGE[payment.status] ?? 'default'}>
                {payment.statusLabel}
              </Badge>
              <span className="text-2xl font-bold text-[#052E1C]">{payment.amountDisplay}</span>
            </div>

            <DetailGrid
              rows={[
                ['Student', `${payment.application?.applicantName ?? payment.applicantName} (${payment.applicantEmail})`],
                ['Service', payment.service?.name ?? payment.serviceName],
                ['Option', payment.offering?.name ?? payment.offeringName],
                ['Purpose', payment.purposeLabel],
                ['Request status', payment.application?.status ?? payment.applicationStatus],
                ['Paid at', formatDateTime(payment.paidAt)],
                ['Created at', formatDateTime(payment.createdAt)],
                ['Razorpay payment ID', payment.razorpayPaymentId ?? '—'],
                ['Razorpay order ID', payment.razorpayOrderId],
              ]}
            />

            {payment.offering?.paymentConfig?.enabled ? (
              <div className="rounded-xl border border-[#E2EEE8] bg-[#F9FCFB] p-4">
                <p className="text-sm font-semibold text-[#052E1C]">Fee configuration</p>
                <p className="mt-2 text-sm text-[#4B6358]">
                  {payment.offering.paymentConfig.label} ·{' '}
                  {timingLabel(payment.offering.paymentConfig.timing)}
                </p>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Link
                to={`/admin/applications/${payment.applicationId}`}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-[#0A6640] to-[#084F31] px-4 text-sm font-semibold text-white shadow-[0_2px_10px_rgba(10,102,64,0.28)] hover:opacity-95"
              >
                Open request
              </Link>
              {payment.service?.id ? (
                <Link
                  to={`/admin/services/${payment.service.id}`}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-[#C4E8D4] bg-white px-4 text-sm font-semibold text-[#0A6640] hover:bg-[#F0FAF5]"
                >
                  Open service
                </Link>
              ) : null}
              <button
                type="button"
                onClick={onDelete}
                disabled={deleting}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#FECACA] bg-white px-4 text-sm font-semibold text-[#B91C1C] hover:bg-[#FEF2F2] disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                {deleting ? 'Deleting...' : 'Delete payment'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailGrid({ rows }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-xl border border-[#E2EEE8] bg-[#F9FCFB] px-3 py-2.5">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">{label}</dt>
          <dd className="mt-1 break-all text-sm text-[#052E1C]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
