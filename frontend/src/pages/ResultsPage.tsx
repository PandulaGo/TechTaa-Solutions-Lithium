import { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';
import type { ApiResult, ApiEndpoint, Collection, Schedule, ValidationRule } from '../types';
import Spinner from '../components/Spinner';

export default function ResultsPage() {
  const [results, setResults] = useState<ApiResult[]>([]);
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [validationRules, setValidationRules] = useState<ValidationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [filter, setFilter] = useState({ collectionId: '', endpointId: '', isSuccess: '' });
  const [page, setPage] = useState(1);

  useEffect(() => { load(); }, [filter, page]);
  useEffect(() => {
    api.getEndpoints().then(eps => setEndpoints(Array.isArray(eps) ? eps : []));
    api.getCollections().then(cols => setCollections(Array.isArray(cols) ? cols : []));
    api.getSchedules().then(scheds => setSchedules(Array.isArray(scheds) ? scheds : []));
    api.getValidationRules().then(rules => setValidationRules(Array.isArray(rules) ? rules : []));
  }, []);

  const scheduleMap = useMemo(() => {
    const map = new Map<number, Schedule>();
    for (const s of schedules) {
      map.set(s.apiEndpointId, s);
    }
    return map;
  }, [schedules]);

  const validationMap = useMemo(() => {
    const map = new Map<number, ValidationRule[]>();
    for (const r of validationRules) {
      const existing = map.get(r.apiEndpointId) || [];
      existing.push(r);
      map.set(r.apiEndpointId, existing);
    }
    return map;
  }, [validationRules]);

  const load = async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize: 50 };
      if (filter.collectionId) params.collectionId = Number(filter.collectionId);
      if (filter.endpointId) params.endpointId = Number(filter.endpointId);
      if (filter.isSuccess !== '') params.isSuccess = filter.isSuccess === 'true';
      const res = await api.getResults(params);
      setResults(Array.isArray(res) ? res : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const formatHeaders = (headers: string | null) => {
    if (!headers) return null;
    try { return JSON.parse(headers); } catch { return null; }
  };

  const formatBody = (body: string | null) => {
    if (!body) return body;
    try { return JSON.stringify(JSON.parse(body), null, 2); } catch { return body; }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Results / History</h2>

      <div className="flex gap-3 items-center">
        <select className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm" value={filter.collectionId} onChange={e => { setFilter({ ...filter, collectionId: e.target.value, endpointId: '' }); setPage(1); }}>
          <option value="">All Collections</option>
          {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm" value={filter.endpointId} onChange={e => { setFilter({ ...filter, endpointId: e.target.value }); setPage(1); }}>
          <option value="">All Endpoints</option>
          {endpoints.filter(ep => !filter.collectionId || ep.collectionId === Number(filter.collectionId)).map(ep => <option key={ep.id} value={ep.id}>{ep.name}</option>)}
        </select>
        <select className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm" value={filter.isSuccess} onChange={e => { setFilter({ ...filter, isSuccess: e.target.value }); setPage(1); }}>
          <option value="">All Results</option>
          <option value="true">Passed Only</option>
          <option value="false">Failed Only</option>
        </select>
        <div className="flex gap-1">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:text-gray-200">Prev</button>
          <span className="text-xs px-2 py-1 text-gray-700 dark:text-gray-400">Page {page}</span>
          <button onClick={() => setPage(p => p + 1)} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:text-gray-200">Next</button>
        </div>
      </div>

      {loading ? (
        <Spinner text="Loading results..." />
      ) : <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800 text-left text-gray-700 dark:text-gray-400">
              <th className="p-3">Collection</th>
              <th className="p-3">Endpoint</th>
              <th className="p-3">Status</th>
              <th className="p-3">Code</th>
              <th className="p-3">Latency</th>
              <th className="p-3">Schedule</th>
              <th className="p-3">Validation</th>
              <th className="p-3">Result</th>
              <th className="p-3">Error</th>
              <th className="p-3">Time</th>
            </tr>
          </thead>
          <tbody>
            {results.map(r => {
              const collection = collections.find(c => c.id === r.apiEndpoint?.collectionId);
              const schedule = scheduleMap.get(r.apiEndpointId);
              const rules = validationMap.get(r.apiEndpointId) || [];
              return (
              <>
                <tr
                  key={r.id}
                  className="border-b border-gray-200 dark:border-gray-800/50 hover:bg-gray-100/50 dark:hover:bg-gray-800/30 cursor-pointer"
                  onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                >
                  <td className="p-3 text-gray-700 dark:text-gray-400">{collection?.name || '—'}</td>
                  <td className="p-3">{r.apiEndpoint?.name || `#${r.apiEndpointId}`}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded border ${r.statusCode >= 200 && r.statusCode < 300 ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/50 dark:text-green-400 dark:border-green-700' : 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/50 dark:text-red-400 dark:border-red-700'}`}>
                      {r.statusCode}
                    </span>
                  </td>
                  <td className="p-3">{r.statusCode}</td>
                  <td className="p-3 text-gray-700 dark:text-gray-400">{r.responseTimeMs} ms</td>
                  <td className="p-3">
                    {schedule ? (
                      <span className={`text-xs px-2 py-0.5 rounded border ${schedule.isEnabled ? 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/50 dark:text-teal-400 dark:border-teal-700' : 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:border-gray-700'}`}>
                        {schedule.isEnabled ? 'On' : 'Off'}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="p-3">
                    {rules.length > 0 ? (
                      <span className="text-xs px-2 py-0.5 rounded border bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/50 dark:text-orange-400 dark:border-orange-700">
                        {rules.length} rule{rules.length !== 1 ? 's' : ''}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="p-3">
                    {r.isSuccess ? (
                      <span className="text-green-600 dark:text-green-400">✓ Pass</span>
                    ) : (
                      <span className="text-red-600 dark:text-red-400">✗ Fail</span>
                    )}
                  </td>
                  <td className="p-3 text-red-600 dark:text-red-400 text-xs max-w-40 truncate">{r.errorMessage || '—'}</td>
                  <td className="p-3 text-gray-600 dark:text-gray-500 text-xs">{new Date(r.executedAt).toLocaleString()}</td>
                </tr>
                {expanded === r.id && (
                  <tr key={`exp-${r.id}`} className="bg-gray-50 dark:bg-gray-900">
                    <td colSpan={10} className="p-4">
                      <div className="space-y-3">
                        <div>
                          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-400 mb-1">Response Headers</h4>
                          <pre className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded p-3 text-xs text-gray-700 dark:text-gray-300 overflow-auto max-h-32">
                            {formatHeaders(r.responseHeaders) ? JSON.stringify(formatHeaders(r.responseHeaders), null, 2) : '—'}
                          </pre>
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-400 mb-1">Response Body</h4>
                          <pre className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded p-3 text-xs text-gray-700 dark:text-gray-300 overflow-auto max-h-64 whitespace-pre-wrap">
                            {formatBody(r.responseBody) || '—'}
                          </pre>
                        </div>
                        {r.requestBody && (
                          <div>
                            <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-400 mb-1">Request Body</h4>
                            <pre className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded p-3 text-xs text-gray-700 dark:text-gray-300 overflow-auto max-h-32 whitespace-pre-wrap">
                              {formatBody(r.requestBody)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
              );
            })}
            {results.length === 0 && (
              <tr><td colSpan={10} className="p-6 text-center text-gray-500 dark:text-gray-600">No results yet</td></tr>
            )}
          </tbody>
        </table>
      </div>}
    </div>
);
}
