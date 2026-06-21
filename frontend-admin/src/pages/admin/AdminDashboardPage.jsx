import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Clock3,
  Layers,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import {
  ActivityTrendChart,
  ChartLegend,
  ComparisonBarChart,
  DonutBreakdownChart,
  StatusBarChart,
  VolumeBarChart,
} from '@/components/dashboard/DashboardCharts';
import { DashboardDeepAnalytics } from '@/components/dashboard/DashboardDeepAnalytics';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import {
  DashboardChartCard,
  DashboardInsightBanner,
  DashboardListCard,
  DashboardMetricCard,
  DashboardPageHeader,
  DashboardSnapshotCard,
} from '@/components/dashboard/DashboardShell';
import { AdminDashboardSkeleton } from '@/components/skeletons';
import { analyticsApi } from '@/api/analytics.api';
import { useSocketEvent } from '@/contexts/SocketContext';
import { useDashboardFilters } from '@/hooks/useDashboardFilters';
import { WS_EVENTS } from '@/lib/socket';
import {
  buildApplicationsLink,
  buildEnrollmentIntakesLink,
  buildAppointmentsLink,
  buildQueueLink,
  mergeDashboardFilters,
} from '@/utils/dashboardLinks';
import { downloadAnalyticsCsv, printAnalyticsPdf } from '@/utils/dashboardExport';

function formatStatus(status) {
  return status.replace(/_/g, ' ');
}

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const { filters, setFilters, resetFilters } = useDashboardFilters();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const loadDashboard = useCallback(({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    analyticsApi
      .adminDashboard(filters)
      .then(({ data }) => setAnalytics(data.data.analytics))
      .catch(() => {})
      .finally(() => {
        if (!silent) setLoading(false);
      });
  }, [filters]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useSocketEvent(
    WS_EVENTS.DASHBOARD_UPDATED,
    ({ scope }) => {
      if (!scope || scope === 'all' || scope === 'admin') {
        loadDashboard({ silent: true });
      }
    },
    [loadDashboard],
  );

  useSocketEvent(WS_EVENTS.APPLICATION_UPDATED, () => {
    loadDashboard({ silent: true });
  }, [loadDashboard]);

  const summary = analytics?.summary ?? {};
  const charts = analytics?.charts ?? {};
  const applicationsBase = mergeDashboardFilters(filters);

  const weeklyComparison = useMemo(
    () => [
      { label: 'Previous 7 days', count: summary.weeklyPrevious ?? 0 },
      { label: 'Last 7 days', count: summary.weeklyCurrent ?? 0 },
    ],
    [summary.weeklyCurrent, summary.weeklyPrevious],
  );

  const goToApplications = useCallback(
    (extra = {}) => {
      navigate(buildApplicationsLink('admin', applicationsBase, extra));
    },
    [applicationsBase, navigate],
  );

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const response = await analyticsApi.exportAdminDashboard(filters, 'csv');
      await downloadAnalyticsCsv(response, 'admin-dashboard-report.csv');
      toast.success('CSV report downloaded');
    } catch (err) {
      toast.error(err.message || 'Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    if (!analytics) {
      toast.error('Dashboard data is still loading');
      return;
    }

    const opened = printAnalyticsPdf({
      title: 'Admin Operations Dashboard',
      filters: analytics.filters,
      summary: analytics.summary,
      charts: analytics.charts,
    });

    if (opened) {
      toast.success('Print dialog opened — choose Save as PDF to download');
    } else {
      toast.error('Could not open PDF export. Allow pop-ups and try again.');
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <DashboardPageHeader
          eyebrow="Admin Console"
          title="Operations dashboard"
          description="Live institute metrics with date filters, deep analytics, drill-down links, and exportable reports."
          action={
            <Link
              to="/admin/services"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#C4E8D4] bg-gradient-to-r from-[#0A6640] to-[#084F31] px-5 text-sm font-semibold text-white transition hover:opacity-95"
            >
              <Layers className="h-4 w-4" />
              Manage services
            </Link>
          }
        />

        <div className="mb-6">
          <DashboardFilters
            filters={filters}
            onChange={setFilters}
            onReset={resetFilters}
            onExportCsv={handleExportCsv}
            onExportPdf={handleExportPdf}
            showStaffFilter
            exporting={exporting}
          />
        </div>

        {loading ? (
          <AdminDashboardSkeleton />
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <DashboardMetricCard
                index={1}
                label="Total requests"
                value={summary.totalRequests ?? 0}
                hint={`${summary.completionRate ?? 0}% resolved · ${summary.avgTurnaroundHours ?? 0}h avg turnaround`}
                icon={ClipboardList}
                variant="emerald"
                href={buildApplicationsLink('admin', applicationsBase)}
              />
              <DashboardMetricCard
                index={2}
                label="Pending authorization"
                value={summary.pendingAuthorization ?? 0}
                hint="Enrollment intakes awaiting approval"
                icon={UserCheck}
                variant="amber"
                href={buildEnrollmentIntakesLink()}
              />
              <DashboardMetricCard
                index={3}
                label="Under review"
                value={summary.inReview ?? 0}
                hint={`${summary.needsCorrection ?? 0} need correction · ${summary.correctionRate ?? 0}% correction rate`}
                icon={Clock3}
                variant="blue"
                href={buildApplicationsLink('admin', applicationsBase, { status: 'in_review' })}
              />
              <DashboardMetricCard
                index={4}
                label="SLA breaches"
                value={summary.slaBreached ?? 0}
                hint="In-review requests past due"
                icon={AlertTriangle}
                variant="rose"
                href={buildApplicationsLink('admin', applicationsBase, { slaBreached: 'true' })}
              />
            </div>

            {(summary.slaBreached ?? 0) > 0 ? (
              <DashboardInsightBanner
                tone="warning"
                title="SLA breaches need action"
                description={`${summary.slaBreached} in-review request${summary.slaBreached === 1 ? '' : 's'} past due. Extend deadlines or escalate to staff from the request detail page.`}
                action={
                  <Link
                    to={buildApplicationsLink('admin', applicationsBase, { slaBreached: 'true' })}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-[#0A6640]"
                  >
                    Review breached requests
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                }
              />
            ) : (summary.pendingAuthorization ?? 0) > 0 ? (
              <DashboardInsightBanner
                tone="warning"
                title="Authorization queue needs attention"
                description={`${summary.pendingAuthorization} enrollment intake${summary.pendingAuthorization === 1 ? '' : 's'} waiting for admin approval.`}
                action={
                  <Link
                    to={buildEnrollmentIntakesLink()}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-[#0A6640]"
                  >
                    Review intakes
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                }
              />
            ) : (
              <DashboardInsightBanner
                title="Institute pulse"
                description={`${summary.waitingQueue ?? 0} students waiting in queue · ${summary.upcomingAppointments ?? 0} upcoming appointments · ${summary.avgQueueWaitMinutes ?? 0} min avg queue wait.`}
                action={
                  <div className="flex flex-wrap items-center gap-4">
                    <Link
                      to={buildQueueLink('admin')}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-[#0A6640]"
                    >
                      Queue monitor
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      to={buildAppointmentsLink('admin')}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-[#0A6640]"
                    >
                      Appointments
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                }
              />
            )}

            <div className="grid gap-4 xl:grid-cols-12">
              <DashboardChartCard
                className="xl:col-span-8"
                title="Request activity"
                description={`Daily request updates from ${filters.from} to ${filters.to}.`}
              >
                <ActivityTrendChart data={charts.activityTrend} />
              </DashboardChartCard>

              <DashboardChartCard
                className="xl:col-span-4"
                title="Outcome mix"
                description="Approved, rejected, and still in progress."
              >
                <DonutBreakdownChart
                  data={charts.outcomeBreakdown}
                  height={220}
                  onItemClick={(item) => goToApplications(item.status ? { status: item.status } : {})}
                />
                <ChartLegend items={charts.outcomeBreakdown} />
              </DashboardChartCard>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <DashboardChartCard
                title="Pipeline by status"
                description="Click a bar to open the filtered request list."
              >
                <StatusBarChart
                  data={charts.statusBreakdown}
                  layout="horizontal"
                  height={220}
                  onItemClick={(item) => goToApplications({ status: item.status })}
                />
              </DashboardChartCard>

              <DashboardChartCard
                title="SLA health"
                description="In-review requests on track vs overdue."
              >
                <DonutBreakdownChart
                  data={charts.slaHealth}
                  height={220}
                  onItemClick={(item) =>
                    goToApplications(
                      item.filterKey === 'slaOverdue'
                        ? { slaBreached: 'true' }
                        : { status: 'in_review', slaBreached: 'false' },
                    )
                  }
                />
                <ChartLegend items={charts.slaHealth} />
              </DashboardChartCard>

              <DashboardChartCard
                title="Weekly momentum"
                description="Updated requests compared to the prior week."
              >
                <ComparisonBarChart data={weeklyComparison} height={220} />
              </DashboardChartCard>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <DashboardChartCard
                title="Service workload"
                description="Top services by active request volume."
              >
                <VolumeBarChart
                  data={charts.serviceVolume}
                  height={220}
                  onItemClick={(item) => goToApplications({ serviceId: item.serviceId })}
                />
              </DashboardChartCard>

              <DashboardChartCard
                title="Front-desk load"
                description="Queue and appointment pressure right now."
              >
                <ComparisonBarChart data={charts.operationsLoad} height={220} />
              </DashboardChartCard>

              <DashboardChartCard
                title="Staff assignment load"
                description="Requests currently assigned per staff member."
              >
                <VolumeBarChart
                  data={charts.staffWorkload}
                  height={220}
                  idKey="staffId"
                  onItemClick={(item) => goToApplications({ staffId: item.staffId })}
                />
              </DashboardChartCard>
            </div>

            <DashboardDeepAnalytics
              scope="admin"
              filters={filters}
              charts={charts}
              summary={summary}
            />

            <div className="grid gap-4 xl:grid-cols-12">
              <DashboardChartCard
                className="xl:col-span-7"
                title="Enrollment authorization trend"
                description="New authorization requests submitted in the selected period."
              >
                <ActivityTrendChart data={charts.intakeTrend} height={220} />
              </DashboardChartCard>

              <div className="grid gap-4 xl:col-span-5">
                <DashboardSnapshotCard
                  title="Platform snapshot"
                  items={analytics?.platformSnapshot ?? []}
                />
                <DashboardMetricCard
                  index={5}
                  label="Queue + visits"
                  value={(summary.waitingQueue ?? 0) + (summary.upcomingAppointments ?? 0)}
                  hint={`${summary.appointmentUtilizationRate ?? 0}% appointment utilization`}
                  icon={CalendarDays}
                  variant="teal"
                  href={buildQueueLink('admin')}
                />
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
              <DashboardListCard
                title="Recent requests"
                emptyMessage="No requests yet. Students will appear here after their first submission."
                action={
                  <Link to={buildApplicationsLink('admin', applicationsBase)} className="text-xs font-semibold text-[#0A6640]">
                    View all
                  </Link>
                }
              >
                {(analytics?.recentRequests ?? []).length > 0 ? (
                  <ul className="space-y-3">
                    {(analytics?.recentRequests ?? []).map((item) => (
                      <li key={item.id}>
                        <Link
                          to={`/admin/applications/${item.id}`}
                          className="block rounded-xl border border-[#E2EEE8] bg-[#F9FCFB] px-4 py-3 transition hover:border-[#C4E8D4] hover:bg-[#F0FAF5]"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-[#052E1C]">{item.applicantName}</p>
                              <p className="mt-1 text-xs text-[#4B6358]">
                                {item.serviceName} · {item.offeringName}
                              </p>
                            </div>
                            <span className="rounded-full border border-[#C4E8D4] bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#0A6640]">
                              {formatStatus(item.status)}
                            </span>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </DashboardListCard>

              <DashboardMetricCard
                index={6}
                label="Active offerings"
                value={summary.activeOfferings ?? 0}
                hint={`${summary.staffCount ?? 0} staff members supporting operations`}
                icon={Users}
                variant="violet"
                href="/admin/services"
              />
            </div>

            <DashboardInsightBanner
              title="Keep configuration aligned with demand"
              description="Review workflows, SLAs, and queue rules as your service volume grows."
              action={
                <Link
                  to="/admin/services"
                  className="inline-flex items-center gap-2 rounded-xl border border-[#C4E8D4] bg-white px-4 py-2 text-sm font-semibold text-[#0A6640]"
                >
                  <TrendingUp className="h-4 w-4" />
                  Open configuration
                </Link>
              }
            />
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
