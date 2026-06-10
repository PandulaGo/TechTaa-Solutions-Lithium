import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import type { DashboardStats, ApiEndpoint, ApiResult } from '../types';
import Spinner from '../components/Spinner';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  const [latestResults, setLatestResults] = useState<Map<number, ApiResult>>(new Map());
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => { mounted.current = false; clearInterval(interval); };
  }, []);

  const loadData = async () => {
    try {
      const [dStats, dEndpoints, dResults] = await Promise.all([
        api.getDashboard(),
        api.getEndpoints(),
        api.getResults({ pageSize: 200 }),
      ]);
      setStats(dStats);

      const epMap = new Map<number, ApiEndpoint>();
      (Array.isArray(dEndpoints) ? dEndpoints : []).forEach((ep: ApiEndpoint) => epMap.set(ep.id, ep));
      setEndpoints(Array.from(epMap.values()));

      const latest = new Map<number, ApiResult>();
      const results = Array.isArray(dResults) ? dResults : [];
      for (const r of results) {
        if (!latest.has(r.apiEndpointId)) {
          latest.set(r.apiEndpointId, r);
        }
      }
      setLatestResults(latest);
    } catch (e) {
      console.error('Failed to load dashboard', e);
    } finally {
      if (mounted.current) setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h2>

      {loading ? (
        <Spinner text="Loading dashboard..." />
      ) : stats && (
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Endpoints" value={stats.totalEndpoints} color="text-blue-400" />
          <StatCard label="Passed" value={stats.passCount} color="text-green-400" />
          <StatCard label="Failed" value={stats.failCount} color="text-red-400" />
          <StatCard label="Avg Latency" value={`${stats.averageLatencyMs.toFixed(0)} ms`} color="text-yellow-400" />
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800 text-left text-gray-600 dark:text-gray-400">
              <th className="p-3">Name</th>
              <th className="p-3">Method</th>
              <th className="p-3">URL</th>
              <th className="p-3">Status</th>
              <th className="p-3">Code</th>
              <th className="p-3">Latency</th>
              <th className="p-3">Last Run</th>
            </tr>
          </thead>
          <tbody>
            {endpoints.map((ep) => {
              const result = latestResults.get(ep.id);
              return (
                <tr key={ep.id} className="border-b border-gray-200 dark:border-gray-800/50 hover:bg-gray-100/50 dark:hover:bg-gray-800/30">
                  <td className="p-3">{ep.name}</td>
                  <td className="p-3">
                    <MethodBadge method={ep.method} />
                  </td>
                  <td className="p-3 text-gray-600 dark:text-gray-400 truncate max-w-48">{ep.url}</td>
                  <td className="p-3">
                    {result ? (
                      result.isSuccess ? (
                        <span className="text-green-400">✓ Pass</span>
                      ) : (
                        <span className="text-red-400">✗ Fail</span>
                      )
                    ) : (
                      <span className="text-gray-400 dark:text-gray-600">—</span>
                    )}
                  </td>
                  <td className="p-3">
                    {result ? (
                      <StatusCodeBadge code={result.statusCode} />
                    ) : (
                      <span className="text-gray-400 dark:text-gray-600">—</span>
                    )}
                  </td>
                  <td className="p-3 text-gray-600 dark:text-gray-400">
                    {result ? `${result.responseTimeMs} ms` : '—'}
                  </td>
                  <td className="p-3 text-gray-500 dark:text-gray-500 text-xs">
                    {result ? new Date(result.executedAt).toLocaleTimeString() : 'Never'}
                  </td>
                </tr>
              );
            })}
            {endpoints.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-400 dark:text-gray-600">No endpoints yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
      <p className="text-xs text-gray-500 dark:text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: 'bg-green-900/50 text-green-400 border-green-700',
    POST: 'bg-blue-900/50 text-blue-400 border-blue-700',
    PUT: 'bg-yellow-900/50 text-yellow-400 border-yellow-700',
    DELETE: 'bg-red-900/50 text-red-400 border-red-700',
    PATCH: 'bg-purple-900/50 text-purple-400 border-purple-700',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded border ${colors[method] || 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
      {method}
    </span>
  );
}

function StatusCodeBadge({ code }: { code: number }) {
  const isSuccess = code >= 200 && code < 300;
  return (
    <span className={`text-xs px-2 py-0.5 rounded border ${isSuccess ? 'bg-green-900/50 text-green-400 border-green-700' : 'bg-red-900/50 text-red-400 border-red-700'}`}>
      {code}
    </span>
  );
}
