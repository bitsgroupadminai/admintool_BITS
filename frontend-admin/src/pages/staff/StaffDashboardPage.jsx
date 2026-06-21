import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock3,
  ListChecks,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { StaffDashboardSkeleton } from '@/components/skeletons';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import {
  ActivityTrendChart,
  ChartLegend,
  ComparisonBarChart,
  DonutBreakdownChart,
  StatusBarChart,
} from '@/components/dashboard/DashboardCharts';
import { DashboardDeepAnalytics } from '@/components/dashboard/DashboardDeepAnalytics';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import {
  DashboardChartCard,
  DashboardInsightBanner,
  DashboardListCard,
  DashboardMetricCard,
} from '@/components/dashboard/DashboardShell';
import { analyticsApi } from '@/api/analytics.api';
import { useSocketEvent } from '@/contexts/SocketContext';
import { useDashboardFilters } from '@/hooks/useDashboardFilters';
import { WS_EVENTS } from '@/lib/socket';
import { buildApplicationsLink, mergeDashboardFilters } from '@/utils/dashboardLinks';
import { downloadAnalyticsCsv, printAnalyticsPdf } from '@/utils/dashboardExport';

function formatStatus(status) {
  return status.replace(/_/g, ' ');
}

export function StaffDashboardPage() {
  const navigate = useNavigate();
  const { filters, setFilters, resetFilters } = useDashboardFilters();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const loadDashboard = useCallback(({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    analyticsApi
      .staffDashboard(filters)
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
      if (!scope || scope === 'all' || scope === 'staff') {
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

  const workloadSummary = useMemo(
    () => [
      { label: 'Approved', count: summary.admitted ?? 0, fill: '#0A6640', status: 'admitted' },
      { label: 'Rejected', count: summary.rejected ?? 0, fill: '#B91C1C', status: 'rejected' },
      { label: 'Resolved this week', count: summary.resolvedThisWeek ?? 0, fill: '#10B981' },
    ],
    [summary.admitted, summary.rejected, summary.resolvedThisWeek],
  );

  const goToApplications = useCallback(
    (extra = {}) => {
      navigate(buildApplicationsLink('staff', applicationsBase, extra));
    },
    [applicationsBase, navigate],
  );

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const response = await analyticsApi.exportStaffDashboard(filters, 'csv');
      await downloadAnalyticsCsv(response, 'staff-dashboard-report.csv');
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
      title: 'Staff Dashboard',
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
    <DashboardLayout
      title="Staff dashboard"
      subtitle="Your assigned workload with filters, deep analytics, drill-down links, and exportable reports."
    >
      <div className="mb-6">
        <DashboardFilters
          filters={filters}
          onChange={setFilters}
          onReset={resetFilters}
          onExportCsv={handleExportCsv}
          onExportPdf={handleExportPdf}
          exporting={exporting}
        />
      </div>

      {loading ? (
        <StaffDashboardSkeleton />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <DashboardMetricCard
              index={1}
              label="Assigned to you"
              value={summary.total ?? 0}
              hint={`${summary.completionRate ?? 0}% completed · ${summary.avgTurnaroundHours ?? 0}h avg turnaround`}
              icon={ClipboardList}
              variant="emerald"
              href={buildApplicationsLink('staff', applicationsBase)}
            />
            <DashboardMetricCard
              index={2}
              label="Needs correction"
              value={summary.needsCorrection ?? 0}
              hint={`${summary.correctionRate ?? 0}% correction rate`}
              icon={Clock3}
              variant="amber"
              href={buildApplicationsLink('staff', applicationsBase, { status: 'needs_correction' })}
            />
            <DashboardMetricCard
              index={3}
              label="Under review"
              value={summary.inReview ?? 0}
              hint={`${summary.submitted ?? 0} newly submitted`}
              icon={ListChecks}
              variant="blue"
              href={buildApplicationsLink('staff', applicationsBase, { status: 'in_review' })}
            />
            <DashboardMetricCard
              index={4}
              label="SLA breaches"
              value={summary.slaBreached ?? 0}
              hint="Past due while in review"
              icon={AlertTriangle}
              variant="rose"
              href={buildApplicationsLink('staff', applicationsBase, { slaBreached: 'true' })}
            />
          </div>

          {(summary.slaBreached ?? 0) > 0 ? (
            <DashboardInsightBanner
              tone="warning"
              title="SLA breaches on your queue"
              description={`${summary.slaBreached} assigned request${summary.slaBreached === 1 ? '' : 's'} past due. Extend the deadline or escalate from the request detail page.`}
              action={
                <Link
                  to={buildApplicationsLink('staff', applicationsBase, { slaBreached: 'true' })}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#0A6640]"
                >
                  Review breached requests
                  <ArrowRight className="h-4 w-4" />
                </Link>
              }
            />
          ) : (
            <DashboardInsightBanner
              title="Your review queue"
              description={`${summary.resolvedThisWeek ?? 0} requests resolved this week · ${summary.admitted ?? 0} approved · ${summary.rejected ?? 0} rejected · ${summary.avgQueueWaitMinutes ?? 0} min avg queue wait.`}
              action={
                <Link
                  to={buildApplicationsLink('staff', applicationsBase)}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#0A6640] px-4 text-sm font-semibold text-white hover:bg-[#084F31]"
                >
                  Open assigned requests
                  <ArrowRight className="h-4 w-4" />
                </Link>
              }
            />
          )}

          <div className="grid gap-4 xl:grid-cols-12">
            <DashboardChartCard
              className="xl:col-span-8"
              title="Assigned activity"
              description={`Daily movement on your assigned requests from ${filters.from} to ${filters.to}.`}
            >
              <ActivityTrendChart data={charts.activityTrend} />
            </DashboardChartCard>

            <DashboardChartCard
              className="xl:col-span-4"
              title="Outcome split"
              description="Approved, rejected, and still active."
            >
              <DonutBreakdownChart
                data={charts.outcomeBreakdown}
                height={220}
                onItemClick={(item) => goToApplications(item.status ? { status: item.status } : {})}
              />
              <ChartLegend items={charts.outcomeBreakdown} />
            </DashboardChartCard>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <DashboardChartCard
              title="Status pipeline"
              description="Click a bar to open filtered assigned requests."
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
              description="On-track vs overdue in-review work."
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
              title="Priority mix"
              description="Where your attention is needed most."
            >
              <DonutBreakdownChart
                data={charts.priorityMix}
                height={220}
                onItemClick={(item) => goToApplications(item.status ? { status: item.status } : {})}
              />
              <ChartLegend items={charts.priorityMix} />
            </DashboardChartCard>

            <DashboardChartCard
              title="Resolved this week"
              description="Daily approvals and rejections in the selected period."
            >
              <ComparisonBarChart data={charts.completionTrend} height={220} />
            </DashboardChartCard>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <DashboardChartCard
              title="Weekly throughput"
              description="Resolved outcomes compared with active workload."
            >
              <ComparisonBarChart
                data={workloadSummary}
                height={220}
                onItemClick={(item) => (item.status ? goToApplications({ status: item.status }) : undefined)}
              />
            </DashboardChartCard>

            <DashboardChartCard
              title="New vs in review"
              description="Fresh submissions against active review work."
            >
              <ComparisonBarChart
                data={[
                  { label: 'New', count: summary.submitted ?? 0, status: 'submitted' },
                  { label: 'In review', count: summary.inReview ?? 0, status: 'in_review' },
                  { label: 'Correction', count: summary.needsCorrection ?? 0, status: 'needs_correction' },
                ]}
                height={220}
                onItemClick={(item) => goToApplications({ status: item.status })}
              />
            </DashboardChartCard>

            <DashboardMetricCard
              index={5}
              label="Resolved this week"
              value={summary.resolvedThisWeek ?? 0}
              hint={`${summary.appointmentUtilizationRate ?? 0}% appointment utilization`}
              icon={CheckCircle2}
              variant="teal"
              href={buildApplicationsLink('staff', applicationsBase, { status: 'admitted' })}
            />
          </div>

          <DashboardDeepAnalytics
            scope="staff"
            filters={filters}
            charts={charts}
            summary={summary}
          />

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
            <DashboardListCard
              title="Recent assigned requests"
              emptyMessage="No assigned requests yet. New work will appear here when admin assigns requests to you."
              action={
                <Link to={buildApplicationsLink('staff', applicationsBase)} className="text-xs font-semibold text-[#0A6640]">
                  View all
                </Link>
              }
            >
              {(analytics?.recentAssigned ?? []).length > 0 ? (
                <ul className="space-y-3">
                  {(analytics?.recentAssigned ?? []).map((item) => (
                    <li key={item.id}>
                      <Link
                        to={`/staff/applications/${item.id}`}
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

            <div className="grid gap-4">
              <DashboardInsightBanner
                title="Front-desk tools"
                description="Manage walk-ins and scheduled visits alongside request reviews."
                action={
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to="/staff/queue"
                      className="inline-flex h-10 items-center rounded-xl border border-[#C4E8D4] bg-white px-4 text-sm font-semibold text-[#0A6640]"
                    >
                      Queue board
                    </Link>
                    <Link
                      to="/staff/appointments"
                      className="inline-flex h-10 items-center rounded-xl border border-[#C4E8D4] bg-white px-4 text-sm font-semibold text-[#0A6640]"
                    >
                      Appointments
                    </Link>
                  </div>
                }
              />
              <DashboardMetricCard
                index={6}
                label="Completion rate"
                value={`${summary.completionRate ?? 0}%`}
                hint="Share of assigned requests already resolved"
                icon={TrendingUp}
                variant="violet"
                href={buildApplicationsLink('staff', applicationsBase)}
              />
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
