export const DASHBOARD_CHART = {
  primary: '#0A6640',
  primaryLight: '#10B981',
  primarySoft: '#6EE7B7',
  grid: '#E2EEE8',
  text: '#4B6358',
  textDark: '#052E1C',
  danger: '#B91C1C',
  warning: '#D97706',
  info: '#2563EB',
  palette: ['#0A6640', '#10B981', '#6EE7B7', '#2563EB', '#D97706', '#B91C1C'],
};

export const CHART_ANIMATION = false;

export const CHART_MARGIN = { top: 8, right: 8, left: -16, bottom: 0 };

export function dashboardTooltipStyle() {
  return {
    borderRadius: 12,
    border: '1px solid #E2EEE8',
    backgroundColor: '#FFFFFF',
    color: '#052E1C',
    fontSize: 12,
    boxShadow: 'none',
  };
}
