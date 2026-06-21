import { useEffect, useState } from 'react';
import { Clock, User } from 'lucide-react';
import { applicationLifecycleApi } from '@/api/applications.lifecycle.api';

/**
 * @param {Object} props
 * @param {string} props.applicationId
 * @param {'admin' | 'staff'} [props.role]
 */
export function ApplicationAuditLog({ applicationId, role = 'admin' }) {
  const [entries, setEntries] = useState([]);
  const [configVersion, setConfigVersion] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!applicationId) return;
    applicationLifecycleApi
      .getAuditLog(applicationId, role)
      .then(({ data }) => {
        setEntries(data.data.entries ?? []);
        setConfigVersion(data.data.configurationVersion);
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [applicationId, role]);

  if (loading) {
    return <p className="text-sm text-[#4B6358]">Loading audit log...</p>;
  }

  return (
    <div className="space-y-4">
      {configVersion != null && (
        <p className="rounded-lg border border-[#C4E8D4] bg-[#F0FAF5] px-4 py-3 text-sm text-[#4B6358]">
          This request uses workflow configuration <strong>v{configVersion}</strong>.
          New requests use the latest offering configuration.
        </p>
      )}
      {entries.length === 0 ? (
        <p className="text-sm text-[#4B6358]">No activity recorded yet.</p>
      ) : (
        <ol className="space-y-3">
          {entries.map((entry) => (
            <li
              key={entry.id ?? `${entry.createdAt}-${entry.outcome}`}
              className="flex gap-3 rounded-xl border border-[#E2EEE8] bg-white px-4 py-3"
            >
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#10B981]" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#052E1C]">
                  {entry.stepName}: {entry.outcome}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#6B7280]">
                  <User className="h-3 w-3" />
                  {entry.actedByName || 'System'}
                  {entry.actedByRole ? ` · ${entry.actedByRole}` : ''}
                  · {new Date(entry.createdAt).toLocaleString()}
                </p>
                {entry.note ? (
                  <p className="mt-2 text-sm text-[#4B6358]">{entry.note}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
