import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { DashboardStats } from '../types';
import Spinner from '../components/Spinner';

interface RecentCollection {
  collectionId: number;
  collectionName: string;
  endpointCount: number;
  passCount: number;
  failCount: number;
  averageLatencyMs: number;
  lastRunAt: string;
}

interface RecentEndpoint {
  id: number;
  name: string;
  method: string;
  url: string;
  statusCode: number;
  responseTimeMs: number;
  isSuccess: boolean;
  executedAt: string;
}

interface DashboardData extends DashboardStats {
  recentCollections: RecentCollection[];
  recentEndpoints: RecentEndpoint[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
    return () => { mounted.current = false; };
  }, []);

  const loadData = async () => {
    try {
      const result = await api.getDashboard();
      setData(result);
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
      ) : data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard label="Endpoints" value={data.totalEndpoints} color="text-blue-600 dark:text-blue-400" bgColor="bg-blue-50 dark:bg-blue-950/40" />
            <StatCard label="Passed" value={data.passCount} color="text-green-600 dark:text-green-400" bgColor="bg-green-50 dark:bg-green-950/40" />
            <StatCard label="Failed" value={data.failCount} color="text-red-600 dark:text-red-400" bgColor="bg-red-50 dark:bg-red-950/40" />
            <StatCard label="Avg Latency" value={`${data.averageLatencyMs} ms`} color="text-yellow-600 dark:text-yellow-400" bgColor="bg-yellow-50 dark:bg-yellow-950/40" />
            <StatCard label="Schedules" value={data.totalSchedules} color="text-teal-600 dark:text-teal-400" bgColor="bg-teal-50 dark:bg-teal-950/40" />
            <StatCard label="Validations" value={data.totalValidationRules} color="text-orange-600 dark:text-orange-400" bgColor="bg-orange-50 dark:bg-orange-950/40" />
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-purple-100 dark:bg-purple-900/60">
              <h3 className="text-sm font-semibold text-purple-800 dark:text-purple-200">Recently Run Collections</h3>
              <button
                onClick={() => navigate('/results')}
                className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
              >
                View All Results →
              </button>
            </div>
            {data.recentCollections.length === 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-600 text-sm">No collections run yet</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 text-left text-gray-700 dark:text-gray-400">
                    <th className="p-3">Collection</th>
                    <th className="p-3">Endpoints</th>
                    <th className="p-3">Passed</th>
                    <th className="p-3">Failed</th>
                    <th className="p-3">Avg Latency</th>
                    <th className="p-3">Last Run</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentCollections.map((col) => (
                    <tr key={col.collectionId} className="border-b border-gray-200 dark:border-gray-800/50 hover:bg-gray-100/50 dark:hover:bg-gray-800/30">
                      <td className="p-3 font-medium text-gray-900 dark:text-gray-100">{col.collectionName}</td>
                      <td className="p-3 text-gray-700 dark:text-gray-400">{col.endpointCount}</td>
                      <td className="p-3 text-green-600 dark:text-green-400">{col.passCount}</td>
                      <td className="p-3 text-red-600 dark:text-red-400">{col.failCount}</td>
                      <td className="p-3 text-gray-700 dark:text-gray-400">{col.averageLatencyMs} ms</td>
                      <td className="p-3 text-gray-600 dark:text-gray-500 text-xs">
                        {new Date(col.lastRunAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-purple-100 dark:bg-purple-900/60">
              <h3 className="text-sm font-semibold text-purple-800 dark:text-purple-200">Recently Run Endpoints</h3>
              <button
                onClick={() => navigate('/results')}
                className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
              >
                View All Results →
              </button>
            </div>
            {data.recentEndpoints.length === 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-600 text-sm">No endpoints run yet</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 text-left text-gray-700 dark:text-gray-400">
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
                  {data.recentEndpoints.map((ep) => (
                    <tr key={ep.id} className="border-b border-gray-200 dark:border-gray-800/50 hover:bg-gray-100/50 dark:hover:bg-gray-800/30">
                      <td className="p-3 text-gray-900 dark:text-gray-100">{ep.name}</td>
                      <td className="p-3">
                        <MethodBadge method={ep.method} />
                      </td>
                      <td className="p-3 text-gray-700 dark:text-gray-400 truncate max-w-48">{ep.url}</td>
                      <td className="p-3">
                        {ep.isSuccess ? (
                          <span className="text-green-600 dark:text-green-400">✓ Pass</span>
                        ) : (
                          <span className="text-red-600 dark:text-red-400">✗ Fail</span>
                        )}
                      </td>
                      <td className="p-3">
                        <StatusCodeBadge code={ep.statusCode} />
                      </td>
                      <td className="p-3 text-gray-700 dark:text-gray-400">{ep.responseTimeMs} ms</td>
                      <td className="p-3 text-gray-600 dark:text-gray-500 text-xs">
                        {new Date(ep.executedAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, color, bgColor }: { label: string; value: number | string; color: string; bgColor?: string }) {
  return (
    <div className={`${bgColor || 'bg-white dark:bg-gray-900'} border border-gray-200 dark:border-gray-800 rounded-lg p-4`}>
      <p className="text-xs font-bold text-gray-500 dark:text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/50 dark:text-green-400 dark:border-green-700',
    POST: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/50 dark:text-blue-400 dark:border-blue-700',
    PUT: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-400 dark:border-yellow-700',
    DELETE: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/50 dark:text-red-400 dark:border-red-700',
    PATCH: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/50 dark:text-purple-400 dark:border-purple-700',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded border ${colors[method] || 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-700'}`}>
      {method}
    </span>
  );
}

function StatusCodeBadge({ code }: { code: number }) {
  const isSuccess = code >= 200 && code < 300;
  return (
    <span className={`text-xs px-2 py-0.5 rounded border ${isSuccess ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/50 dark:text-green-400 dark:border-green-700' : 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/50 dark:text-red-400 dark:border-red-700'}`}>
      {code}
    </span>
  );
}
