import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  Mail,
  RefreshCw,
  Server,
  Wifi,
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { monitoringApi } from '@/api/monitoring.api';

const REFRESH_MS = 30_000;

const DEPENDENCY_META = {
  mongodb: { label: 'MongoDB', icon: Database, description: 'Primary application database' },
  redis: { label: 'Redis', icon: Server, description: 'Sessions and cache' },
  queue: { label: 'Job queue', icon: Activity, description: 'BullMQ / Redis job backend' },
  email: { label: 'Email (SMTP)', icon: Mail, description: 'Transactional email delivery' },
  websocket: { label: 'WebSocket', icon: Wifi, description: 'Real-time notifications' },
};

function statusVariant(status) {
  if (status === 'healthy' || status === 'up') return 'active';
  if (status === 'degraded' || status === 'not_configured') return 'draft';
  return 'disabled';
}

function statusLabel(status) {
  if (status === 'not_configured') return 'Not configured';
  return String(status ?? 'unknown').replace(/_/g, ' ');
}

function formatUptime(seconds) {
  const total = Math.max(0, Number(seconds) || 0);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours || days) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return parts.join(' ');
}

export function SystemHealthPage() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState(null);

  const loadHealth = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const { data } = await monitoringApi.health();
      setHealth(data.data.health);
      setLastFetchedAt(new Date());
    } catch (err) {
      toast.error(err.message || 'Failed to load system health');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadHealth();
    const timer = setInterval(() => loadHealth({ silent: true }), REFRESH_MS);
    return () => clearInterval(timer);
  }, [loadHealth]);

  const dependencies = health?.dependencies ?? {};
  const queues = health?.queues ?? null;

  return (
    <AdminLayout>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#10B981]">
              Observability
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#052E1C]">
              System health
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[#4B6358]">
              Live dependency status for database, cache, queues, email, and realtime. Prometheus
              metrics are also exposed at <code className="rounded bg-[#F0FAF5] px-1.5 py-0.5 text-xs">/metrics</code>.
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadHealth({ silent: true })}
            disabled={refreshing}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#C4E8D4] bg-white px-4 text-sm font-semibold text-[#0A6640] hover:bg-[#F0FAF5] disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {loading && !health ? (
          <div className="flex items-center gap-2 text-sm text-[#4B6358]">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading health report...
          </div>
        ) : (
          <div className="space-y-6">
            <section className="overflow-hidden rounded-2xl border border-[#C4E8D4] bg-white/85 p-6 shadow-[0_4px_24px_rgba(10,102,64,0.07)]">
              <div className="flex flex-wrap items-center gap-3">
                {health?.status === 'healthy' ? (
                  <CheckCircle2 className="h-6 w-6 text-[#0A6640]" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-[#D97706]" />
                )}
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-[#052E1C]">Overall status</h2>
                    <Badge variant={statusVariant(health?.status)}>
                      {statusLabel(health?.status)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-[#4B6358]">
                    Uptime {formatUptime(health?.uptimeSeconds)}
                    {lastFetchedAt
                      ? ` · Checked ${lastFetchedAt.toLocaleTimeString()}`
                      : null}
                    {' · Auto-refresh every 30s'}
                  </p>
                </div>
              </div>
            </section>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(DEPENDENCY_META).map(([key, meta]) => {
                const info = dependencies[key] ?? { status: 'unknown' };
                const Icon = meta.icon;
                return (
                  <section
                    key={key}
                    className="rounded-2xl border border-[#C4E8D4] bg-white/85 p-5 shadow-[0_4px_24px_rgba(10,102,64,0.07)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F0FAF5] text-[#0A6640]">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-[#052E1C]">{meta.label}</h3>
                          <p className="text-xs text-[#4B6358]">{meta.description}</p>
                        </div>
                      </div>
                      <Badge variant={statusVariant(info.status)}>{statusLabel(info.status)}</Badge>
                    </div>
                    <dl className="mt-4 space-y-1.5 text-xs text-[#4B6358]">
                      {typeof info.latencyMs === 'number' ? (
                        <div className="flex justify-between gap-2">
                          <dt>Latency</dt>
                          <dd className="font-medium text-[#052E1C]">{info.latencyMs} ms</dd>
                        </div>
                      ) : null}
                      {typeof info.connectedUsers === 'number' ? (
                        <div className="flex justify-between gap-2">
                          <dt>Connected users</dt>
                          <dd className="font-medium text-[#052E1C]">{info.connectedUsers}</dd>
                        </div>
                      ) : null}
                      {typeof info.connectedSockets === 'number' ? (
                        <div className="flex justify-between gap-2">
                          <dt>Sockets</dt>
                          <dd className="font-medium text-[#052E1C]">{info.connectedSockets}</dd>
                        </div>
                      ) : null}
                      {info.error ? (
                        <div className="rounded-lg bg-[#FEF2F2] px-2 py-1.5 text-[#B91C1C]">
                          {info.error}
                        </div>
                      ) : null}
                      {info.cached ? (
                        <p className="text-[#9CA3AF]">Result cached (SMTP probe)</p>
                      ) : null}
                    </dl>
                  </section>
                );
              })}
            </div>

            {queues ? (
              <section className="overflow-hidden rounded-2xl border border-[#C4E8D4] bg-white/85 shadow-[0_4px_24px_rgba(10,102,64,0.07)]">
                <div className="border-b border-[#E2EEE8] px-6 py-4">
                  <h2 className="text-base font-bold text-[#052E1C]">Background queue depths</h2>
                  <p className="mt-1 text-sm text-[#4B6358]">
                    Waiting, active, and failed jobs across BullMQ queues
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-[#E2EEE8] text-sm">
                    <thead className="bg-[#F0FAF5]/80">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-[#4B6358]">
                          Queue
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-[#4B6358]">
                          Waiting
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-[#4B6358]">
                          Active
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-[#4B6358]">
                          Failed
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-[#4B6358]">
                          Delayed
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2EEE8]">
                      {Object.entries(queues).map(([name, counts]) => (
                        <tr key={name} className="hover:bg-[#F9FCFB]">
                          <td className="px-6 py-3 font-medium text-[#052E1C]">{name}</td>
                          <td className="px-6 py-3 text-[#4B6358]">{counts.waiting ?? 0}</td>
                          <td className="px-6 py-3 text-[#4B6358]">{counts.active ?? 0}</td>
                          <td className="px-6 py-3 text-[#4B6358]">{counts.failed ?? 0}</td>
                          <td className="px-6 py-3 text-[#4B6358]">{counts.delayed ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
