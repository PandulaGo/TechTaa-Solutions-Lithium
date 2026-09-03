import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import type { DashboardStats } from '../types';
import Spinner from '../components/Spinner';

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
  recentEndpoints: RecentEndpoint[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeRun, setActiveRun] = useState<any | null>(null);
  const [recentRuns, setRecentRuns] = useState<any[]>([]);
  const mounted = useRef(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [exportingRunId, setExportingRunId] = useState<number | null>(null);
  const navigate = useNavigate();

  const runIdParam = searchParams.get('runId');

  useEffect(() => {
    loadData();
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (runIdParam) {
      const runId = Number(runIdParam);
      if (!isNaN(runId)) {
        pollRun(runId);
      }
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [runIdParam]);

  const loadData = async () => {
    try {
      const [result, runs] = await Promise.all([
        api.getDashboard(),
        api.getCollectionRuns(),
      ]);
      if (mounted.current) {
        setData(result);
        setRecentRuns(Array.isArray(runs) ? runs : []);
      }
    } catch (e) {
      console.error('Failed to load dashboard', e);
    } finally {
      if (mounted.current) setLoading(false);
    }
  };

  const pollRun = (runId: number) => {
    if (pollRef.current) clearInterval(pollRef.current);

    const fetchRun = async () => {
      try {
        const run = await api.getCollectionRun(runId);
        if (mounted.current) setActiveRun(run);
        if (run.status === 'Completed') {
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
          loadData();
        }
      } catch {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
        if (mounted.current) setActiveRun(null);
      }
    };

    fetchRun();
    pollRef.current = setInterval(fetchRun, 500);
  };

  const dismissRun = () => {
    setSearchParams({});
    setActiveRun(null);
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const handleExport = async (runId: number) => {
    setExportingRunId(runId);
    try {
      await api.exportCollectionRunResponses(runId);
    } finally {
      if (mounted.current) setExportingRunId(null);
    }
  };

  const isRunLive = activeRun && activeRun.status === 'Running';

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h2>

      {loading ? (
        <Spinner text="Loading dashboard..." />
      ) : data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard label="Endpoints" value={data.totalEndpoints} color="text-blue-700 dark:text-blue-400" bgColor="bg-blue-200 dark:bg-blue-950/40" />
            <StatCard label="Passed" value={data.passCount} color="text-green-700 dark:text-green-400" bgColor="bg-green-200 dark:bg-green-950/40" />
            <StatCard label="Failed" value={data.failCount} color="text-red-700 dark:text-red-400" bgColor="bg-red-200 dark:bg-red-950/40" />
            <StatCard label="Avg Latency" value={`${data.averageLatencyMs} ms`} color="text-yellow-700 dark:text-yellow-400" bgColor="bg-yellow-200 dark:bg-yellow-950/40" />
            <StatCard label="Schedules" value={data.totalSchedules} color="text-teal-700 dark:text-teal-400" bgColor="bg-teal-200 dark:bg-teal-950/40" />
            <StatCard label="Validations" value={data.totalValidationRules} color="text-orange-700 dark:text-orange-400" bgColor="bg-orange-200 dark:bg-orange-950/40" />
          </div>

          {/* Live Collection Run Progress */}
          {activeRun && (
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-indigo-200 dark:bg-indigo-900/60">
                <h3 className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">
                  {isRunLive ? '▶ Live Collection Run' : '✓ Collection Run Complete'}
                </h3>
                <button onClick={dismissRun} className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                  Dismiss
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{activeRun.collectionName}</span>
                    {activeRun.isAdHoc && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">(ad-hoc selection)</span>
                    )}
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${isRunLive ? 'bg-indigo-200 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-400' : 'bg-green-200 text-green-800 dark:bg-green-900/50 dark:text-green-400'}`}>
                    {isRunLive ? '● Running' : '✓ Completed'}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                    <span>{activeRun.completedCount}/{activeRun.totalEndpoints} endpoints</span>
                    <span>{activeRun.totalEndpoints > 0 ? Math.round(activeRun.completedCount / activeRun.totalEndpoints * 100) : 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-300 ${activeRun.failCount > 0 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${activeRun.totalEndpoints > 0 ? (activeRun.completedCount / activeRun.totalEndpoints * 100) : 0}%` }}
                    />
                  </div>
                </div>

                {/* Counts */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-gray-100 dark:bg-gray-800/50 rounded p-3 text-center">
                    <p className="text-2xl font-bold text-gray-800 dark:text-gray-300">{activeRun.totalEndpoints}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">Total</p>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-800/50 rounded p-3 text-center">
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{activeRun.completedCount}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">Completed</p>
                  </div>
                  <div className="bg-green-100 dark:bg-green-950/30 rounded p-3 text-center">
                    <p className="text-2xl font-bold text-green-700 dark:text-green-400">{activeRun.successCount}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">Passed</p>
                  </div>
                  <div className="bg-red-100 dark:bg-red-950/30 rounded p-3 text-center">
                    <p className="text-2xl font-bold text-red-700 dark:text-red-400">{activeRun.failCount}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">Failed</p>
                  </div>
                </div>

                {/* Per-endpoint results table */}
                {activeRun.results && activeRun.results.length > 0 && (
                  <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800">
                        <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-gray-600 dark:text-gray-400">
                          <th className="p-2 text-xs font-medium">Endpoint</th>
                          <th className="p-2 text-xs font-medium w-20">Status</th>
                          <th className="p-2 text-xs font-medium w-16">Code</th>
                          <th className="p-2 text-xs font-medium w-20">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeRun.results.map((r: any) => (
                          <tr key={r.id} className="border-b border-gray-100 dark:border-gray-800/50">
                            <td className="p-2 text-xs text-gray-900 dark:text-gray-100 truncate max-w-64">{r.endpointName}</td>
                            <td className="p-2 text-xs">
                              {r.status === 'Pending' && <span className="text-gray-400">⬜ Pending</span>}
                              {r.status === 'Running' && <span className="text-indigo-500">⟳ Running</span>}
                              {r.status === 'Completed' && r.isSuccess && <span className="text-green-700 dark:text-green-400">✓ Pass</span>}
                              {r.status === 'Completed' && !r.isSuccess && <span className="text-red-700 dark:text-red-400">✗ Fail</span>}
                            </td>
                            <td className="p-2 text-xs text-gray-700 dark:text-gray-400">{r.statusCode || '-'}</td>
                            <td className="p-2 text-xs text-gray-700 dark:text-gray-400">{r.responseTimeMs ? `${r.responseTimeMs}ms` : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeRun.completedAt && (
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Completed at {new Date(activeRun.completedAt).toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Recent Collection Runs compact list */}
          {recentRuns.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-purple-200 dark:bg-purple-900/60">
                <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-200">Recent Collection Runs</h3>
                <button
                  onClick={() => navigate('/results')}
                  className="text-xs text-purple-700 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300"
                >
                  View All Results →
                </button>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 text-left text-gray-700 dark:text-gray-400">
                    <th className="p-3">Run</th>
                    <th className="p-3">Collection</th>
                    <th className="p-3">Total</th>
                    <th className="p-3">Passed</th>
                    <th className="p-3">Failed</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Time</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {recentRuns.map((run) => (
                    <tr
                      key={run.id}
                      className="border-b border-gray-200 dark:border-gray-800/50 hover:bg-gray-200/50 dark:hover:bg-gray-800/30 cursor-pointer"
                      onClick={() => setSearchParams({ runId: String(run.id) })}
                    >
                      <td className="p-3 text-gray-500 dark:text-gray-500 text-xs">#{run.id}</td>
                      <td className="p-3 font-medium text-gray-900 dark:text-gray-100">{run.collectionName}{run.isAdHoc ? ' (ad-hoc)' : ''}</td>
                      <td className="p-3 text-gray-700 dark:text-gray-400">{run.totalEndpoints}</td>
                      <td className="p-3 text-green-700 dark:text-green-400">{run.successCount}</td>
                      <td className="p-3 text-red-700 dark:text-red-400">{run.failCount}</td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-0.5 rounded ${run.status === 'Completed' ? 'bg-green-200 text-green-800 dark:bg-green-900/50 dark:text-green-400' : 'bg-indigo-200 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-400'}`}>
                          {run.status}
                        </span>
                      </td>
                      <td className="p-3 text-gray-500 dark:text-gray-500 text-xs">
                        {new Date(run.startedAt).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleExport(run.id); }}
                          disabled={exportingRunId === run.id}
                          className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/50 dark:text-purple-400 dark:hover:bg-purple-800/50 disabled:opacity-50"
                        >
                          {exportingRunId === run.id ? '...' : 'Export'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-purple-200 dark:bg-purple-900/60">
              <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-200">Recent Endpoints Runs</h3>
              <button
                onClick={() => navigate('/results')}
                className="text-xs text-purple-700 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300"
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
                    <tr key={ep.id} className="border-b border-gray-200 dark:border-gray-800/50 hover:bg-gray-200/50 dark:hover:bg-gray-800/30">
                      <td className="p-3 text-gray-900 dark:text-gray-100">{ep.name}</td>
                      <td className="p-3">
                        <MethodBadge method={ep.method} />
                      </td>
                      <td className="p-3 text-gray-700 dark:text-gray-400 truncate max-w-48">{ep.url}</td>
                      <td className="p-3">
                        {ep.isSuccess ? (
                          <span className="text-green-700 dark:text-green-400">✓ Pass</span>
                        ) : (
                          <span className="text-red-700 dark:text-red-400">✗ Fail</span>
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

      {exportingRunId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl p-6 flex items-center gap-3">
            <svg className="animate-spin h-5 w-5 text-purple-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm text-gray-700 dark:text-gray-300">Preparing response data...</span>
          </div>
        </div>
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
