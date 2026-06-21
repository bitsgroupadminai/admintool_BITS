import { memo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CHART_ANIMATION,
  CHART_MARGIN,
  DASHBOARD_CHART,
  dashboardTooltipStyle,
} from '@/constants/dashboardTheme';
import { DashboardEmptyChart } from './DashboardShell';

function hasChartData(data) {
  return Array.isArray(data) && data.some((item) => (item.count ?? 0) > 0);
}

function hasMultiSeriesData(data, keys) {
  return (
    Array.isArray(data) &&
    data.some((item) => keys.some((key) => (item[key] ?? 0) > 0))
  );
}

const tooltipProps = {
  contentStyle: dashboardTooltipStyle(),
  cursor: { fill: 'rgba(10, 102, 64, 0.04)' },
};

function attachBarClick(onItemClick) {
  if (!onItemClick) return undefined;
  return (payload) => {
    if (payload?.payload) onItemClick(payload.payload);
  };
}

export const ActivityTrendChart = memo(function ActivityTrendChart({
  data,
  height = 240,
  dataKey = 'count',
  onItemClick,
}) {
  if (!hasChartData(data)) {
    return <DashboardEmptyChart message="Activity will appear once requests start moving." />;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={CHART_MARGIN}>
        <defs>
          <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={DASHBOARD_CHART.primaryLight} stopOpacity={0.35} />
            <stop offset="100%" stopColor={DASHBOARD_CHART.primaryLight} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={DASHBOARD_CHART.grid} strokeDasharray="4 4" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: DASHBOARD_CHART.text }} interval="preserveStartEnd" />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: DASHBOARD_CHART.text }} width={32} />
        <Tooltip {...tooltipProps} />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={DASHBOARD_CHART.primary}
          strokeWidth={2}
          fill="url(#activityFill)"
          isAnimationActive={CHART_ANIMATION}
          onClick={onItemClick ? (point) => onItemClick(point?.payload ?? point) : undefined}
          style={onItemClick ? { cursor: 'pointer' } : undefined}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
});

export const StatusBarChart = memo(function StatusBarChart({
  data,
  height = 240,
  layout = 'vertical',
  onItemClick,
}) {
  if (!hasChartData(data)) {
    return <DashboardEmptyChart />;
  }

  const vertical = layout === 'vertical';

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout={vertical ? 'vertical' : 'horizontal'}
        margin={vertical ? { top: 4, right: 12, left: 4, bottom: 4 } : CHART_MARGIN}
      >
        <CartesianGrid stroke={DASHBOARD_CHART.grid} strokeDasharray="4 4" horizontal={!vertical} vertical={vertical} />
        {vertical ? (
          <>
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: DASHBOARD_CHART.text }} />
            <YAxis
              type="category"
              dataKey="label"
              width={92}
              tick={{ fontSize: 11, fill: DASHBOARD_CHART.text }}
            />
          </>
        ) : (
          <>
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: DASHBOARD_CHART.text }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: DASHBOARD_CHART.text }} width={32} />
          </>
        )}
        <Tooltip {...tooltipProps} />
        <Bar
          dataKey="count"
          radius={vertical ? [0, 8, 8, 0] : [8, 8, 0, 0]}
          fill={DASHBOARD_CHART.primary}
          isAnimationActive={CHART_ANIMATION}
          onClick={attachBarClick(onItemClick)}
          style={onItemClick ? { cursor: 'pointer' } : undefined}
        />
      </BarChart>
    </ResponsiveContainer>
  );
});

export const DonutBreakdownChart = memo(function DonutBreakdownChart({
  data,
  height = 240,
  onItemClick,
}) {
  if (!hasChartData(data)) {
    return <DashboardEmptyChart />;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="label"
          innerRadius={58}
          outerRadius={88}
          paddingAngle={2}
          isAnimationActive={CHART_ANIMATION}
          onClick={onItemClick ? (_, index) => onItemClick(data[index]) : undefined}
          style={onItemClick ? { cursor: 'pointer' } : undefined}
        >
          {data.map((entry) => (
            <Cell key={entry.label} fill={entry.fill ?? DASHBOARD_CHART.primary} />
          ))}
        </Pie>
        <Tooltip {...tooltipProps} />
      </PieChart>
    </ResponsiveContainer>
  );
});

export const ComparisonBarChart = memo(function ComparisonBarChart({
  data,
  height = 240,
  onItemClick,
}) {
  if (!hasChartData(data)) {
    return <DashboardEmptyChart />;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={CHART_MARGIN}>
        <CartesianGrid stroke={DASHBOARD_CHART.grid} strokeDasharray="4 4" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: DASHBOARD_CHART.text }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: DASHBOARD_CHART.text }} width={32} />
        <Tooltip {...tooltipProps} />
        <Bar
          dataKey="count"
          radius={[8, 8, 0, 0]}
          fill={DASHBOARD_CHART.primaryLight}
          isAnimationActive={CHART_ANIMATION}
          onClick={attachBarClick(onItemClick)}
          style={onItemClick ? { cursor: 'pointer' } : undefined}
        />
      </BarChart>
    </ResponsiveContainer>
  );
});

export const VolumeBarChart = memo(function VolumeBarChart({
  data,
  height = 240,
  onItemClick,
  idKey = 'serviceId',
}) {
  if (!hasChartData(data)) {
    return <DashboardEmptyChart message="Volume appears when requests are linked to services." />;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 4 }}>
        <CartesianGrid stroke={DASHBOARD_CHART.grid} strokeDasharray="4 4" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: DASHBOARD_CHART.text }} />
        <YAxis
          type="category"
          dataKey="label"
          width={108}
          tick={{ fontSize: 11, fill: DASHBOARD_CHART.text }}
        />
        <Tooltip {...tooltipProps} />
        <Bar
          dataKey="count"
          radius={[0, 8, 8, 0]}
          fill={DASHBOARD_CHART.primary}
          isAnimationActive={CHART_ANIMATION}
          onClick={attachBarClick(onItemClick)}
          style={onItemClick ? { cursor: 'pointer' } : undefined}
        />
      </BarChart>
    </ResponsiveContainer>
  );
});

export const DualTrendChart = memo(function DualTrendChart({
  data,
  height = 240,
  primaryKey = 'overdue',
  secondaryKey = 'onTrack',
  primaryLabel = 'Overdue',
  secondaryLabel = 'On track',
}) {
  if (!hasMultiSeriesData(data, [primaryKey, secondaryKey])) {
    return <DashboardEmptyChart message="Trend data will appear once activity accumulates." />;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={CHART_MARGIN}>
        <CartesianGrid stroke={DASHBOARD_CHART.grid} strokeDasharray="4 4" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: DASHBOARD_CHART.text }} interval="preserveStartEnd" />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: DASHBOARD_CHART.text }} width={32} />
        <Tooltip {...tooltipProps} />
        <Line type="monotone" dataKey={primaryKey} stroke="#B91C1C" strokeWidth={2} dot={false} name={primaryLabel} />
        <Line type="monotone" dataKey={secondaryKey} stroke="#0A6640" strokeWidth={2} dot={false} name={secondaryLabel} />
      </LineChart>
    </ResponsiveContainer>
  );
});

export const MetricTrendChart = memo(function MetricTrendChart({
  data,
  height = 220,
  dataKey = 'avgHours',
  label = 'Avg hours',
  allowDecimals = true,
}) {
  if (!hasMultiSeriesData(data, [dataKey])) {
    return <DashboardEmptyChart message="Trend data will appear once enough records resolve." />;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={CHART_MARGIN}>
        <CartesianGrid stroke={DASHBOARD_CHART.grid} strokeDasharray="4 4" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: DASHBOARD_CHART.text }} interval="preserveStartEnd" />
        <YAxis allowDecimals={allowDecimals} tick={{ fontSize: 11, fill: DASHBOARD_CHART.text }} width={40} />
        <Tooltip {...tooltipProps} />
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={DASHBOARD_CHART.primary}
          strokeWidth={2}
          dot={false}
          name={label}
        />
      </LineChart>
    </ResponsiveContainer>
  );
});

export function ChartLegend({ items }) {
  if (!items?.length) return null;

  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
      {items.map((item) => (
        <li key={item.label} className="inline-flex items-center gap-2 text-xs text-[#4B6358]">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: item.fill ?? DASHBOARD_CHART.primary }}
          />
          <span>{item.label}</span>
          <span className="font-semibold tabular-nums text-[#052E1C]">{item.count}</span>
        </li>
      ))}
    </ul>
  );
}
