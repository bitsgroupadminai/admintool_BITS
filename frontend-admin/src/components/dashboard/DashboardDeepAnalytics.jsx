import { useNavigate } from 'react-router-dom';
import {
  ActivityTrendChart,
  ChartLegend,
  ComparisonBarChart,
  DonutBreakdownChart,
  DualTrendChart,
  MetricTrendChart,
  StatusBarChart,
  VolumeBarChart,
} from '@/components/dashboard/DashboardCharts';
import { DashboardChartCard } from '@/components/dashboard/DashboardShell';
import { buildApplicationsLink, mergeDashboardFilters } from '@/utils/dashboardLinks';

/**
 * Shared deep analytics sections for admin and staff dashboards.
 */
export function DashboardDeepAnalytics({ scope, filters, charts, summary }) {
  const navigate = useNavigate();
  const applicationsBase = mergeDashboardFilters(filters);

  const goToApplications = (extra = {}) => {
    navigate(buildApplicationsLink(scope, applicationsBase, extra));
  };

  const goToService = (item) => {
    if (item?.serviceId) {
      goToApplications({ serviceId: item.serviceId });
    }
  };

  const goToOffering = (item) => {
    if (item?.offeringId) {
      goToApplications({ offeringId: item.offeringId });
    }
  };

  const goToStaff = (item) => {
    if (scope === 'admin' && item?.staffId) {
      goToApplications({ staffId: item.staffId });
    }
  };

  const goToStatus = (item) => {
    if (item?.status && item.status !== 'in_progress') {
      goToApplications({ status: item.status });
    }
  };

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <DashboardChartCard
          title="Workflow funnel"
          description="Request volume at each pipeline stage in the selected period."
        >
          <StatusBarChart
            data={charts.statusFunnel}
            layout="horizontal"
            height={220}
            onItemClick={(item) => goToStatus(item)}
          />
        </DashboardChartCard>

        <DashboardChartCard
          title="Workflow bottlenecks"
          description="Steps with the most active requests and review actions."
        >
          <VolumeBarChart
            data={charts.workflowBottlenecks}
            height={220}
            idKey="stepId"
            onItemClick={() => goToApplications({ status: 'in_review' })}
          />
        </DashboardChartCard>

        <DashboardChartCard
          title="Turnaround time"
          description={`Average ${summary.avgTurnaroundHours ?? 0}h to resolve approved or rejected requests.`}
        >
          <MetricTrendChart
            data={charts.turnaroundTrend}
            dataKey="avgHours"
            label="Avg turnaround (hours)"
          />
        </DashboardChartCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <DashboardChartCard
          title="SLA trends"
          description="Daily in-review workload on track vs overdue."
        >
          <DualTrendChart data={charts.slaTrend} />
        </DashboardChartCard>

        <DashboardChartCard
          title="Correction rate"
          description={`${summary.correctionRate ?? 0}% of filtered requests currently need correction.`}
        >
          <ActivityTrendChart
            data={charts.correctionTrend}
            height={220}
            onItemClick={() => goToApplications({ status: 'needs_correction' })}
          />
        </DashboardChartCard>

        <DashboardChartCard
          title="Rejection reasons"
          description="Most common rejection notes recorded in workflow history."
        >
          <DonutBreakdownChart
            data={charts.rejectionReasons}
            height={220}
            onItemClick={() => goToApplications({ status: 'rejected' })}
          />
          <ChartLegend items={charts.rejectionReasons} />
        </DashboardChartCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <DashboardChartCard
          title="Queue wait time"
          description={`Average wait ${summary.avgQueueWaitMinutes ?? 0} minutes before tickets are called.`}
        >
          <MetricTrendChart
            data={charts.queueWaitTrend}
            dataKey="avgWaitMinutes"
            label="Avg wait (minutes)"
            allowDecimals={false}
          />
        </DashboardChartCard>

        <DashboardChartCard
          title="Queue status mix"
          description="Current queue ticket distribution."
        >
          <ComparisonBarChart data={charts.queueStatusBreakdown} height={220} />
        </DashboardChartCard>

        <DashboardChartCard
          title="Appointment utilization"
          description={`${summary.appointmentUtilizationRate ?? 0}% of scheduled slots completed.`}
        >
          <DonutBreakdownChart data={charts.appointmentUtilization} height={220} />
          <ChartLegend items={charts.appointmentUtilization} />
        </DashboardChartCard>
      </div>

      {scope === 'admin' && charts.offeringFunnel?.length ? (
        <DashboardChartCard
          title="Funnel by offering"
          description="Top offerings with stage breakdown. Click a bar to open filtered requests."
        >
          <div className="space-y-4">
            {charts.offeringFunnel.map((offering) => (
              <div key={offering.offeringId} className="rounded-xl border border-[#E2EEE8] bg-[#F9FCFB] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[#052E1C]">{offering.label}</p>
                  <button
                    type="button"
                    onClick={() => goToOffering(offering)}
                    className="text-xs font-semibold text-[#0A6640] hover:underline"
                  >
                    View requests
                  </button>
                </div>
                <StatusBarChart
                  data={offering.funnel}
                  layout="horizontal"
                  height={160}
                  onItemClick={(item) =>
                    goToApplications({
                      offeringId: offering.offeringId,
                      status: mapFunnelStatus(item.label),
                    })
                  }
                />
              </div>
            ))}
          </div>
        </DashboardChartCard>
      ) : null}

      {scope === 'admin' && charts.staffWorkload?.length ? (
        <DashboardChartCard
          title="Staff workload analytics"
          description="Assigned volume, resolutions, SLA breaches, and average turnaround by staff."
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[#E2EEE8] text-left text-xs uppercase tracking-wide text-[#4B6358]">
                  <th className="px-3 py-2">Staff</th>
                  <th className="px-3 py-2">Assigned</th>
                  <th className="px-3 py-2">Resolved</th>
                  <th className="px-3 py-2">SLA breaches</th>
                  <th className="px-3 py-2">Avg turnaround</th>
                </tr>
              </thead>
              <tbody>
                {charts.staffWorkload.map((row) => (
                  <tr
                    key={row.staffId}
                    className="border-b border-[#E2EEE8]/80 cursor-pointer hover:bg-[#F0FAF5]"
                    onClick={() => goToStaff(row)}
                  >
                    <td className="px-3 py-3 font-medium text-[#052E1C]">{row.label}</td>
                    <td className="px-3 py-3 tabular-nums">{row.assigned}</td>
                    <td className="px-3 py-3 tabular-nums">{row.resolved}</td>
                    <td className="px-3 py-3 tabular-nums">{row.slaBreached}</td>
                    <td className="px-3 py-3 tabular-nums">{row.avgTurnaroundHours}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DashboardChartCard>
      ) : null}

      {scope === 'admin' ? (
        <div className="grid gap-4 md:grid-cols-2">
          <DashboardChartCard
            title="Service volume"
            description="Click a service bar to drill into its requests."
          >
            <VolumeBarChart
              data={charts.serviceVolume}
              height={220}
              onItemClick={goToService}
            />
          </DashboardChartCard>

          <DashboardChartCard
            title="Offering volume"
            description="Click an offering bar to drill into its requests."
          >
            <VolumeBarChart
              data={charts.offeringVolume}
              height={220}
              idKey="offeringId"
              onItemClick={goToOffering}
            />
          </DashboardChartCard>
        </div>
      ) : null}
    </>
  );
}

function mapFunnelStatus(label) {
  const map = {
    Submitted: 'submitted',
    'In review': 'in_review',
    Correction: 'needs_correction',
    Approved: 'admitted',
    Rejected: 'rejected',
  };
  return map[label];
}
