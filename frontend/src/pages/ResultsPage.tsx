import { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { ApiResult, ApiEndpoint } from '../types';

export default function ResultsPage() {
  const [results, setResults] = useState<ApiResult[]>([]);
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [filter, setFilter] = useState({ endpointId: '', isSuccess: '' });
  const [page, setPage] = useState(1);

  useEffect(() => { load(); }, [filter, page]);
  useEffect(() => { api.getEndpoints().then(eps => setEndpoints(Array.isArray(eps) ? eps : [])); }, []);

  const load = async () => {
    try {
      const params: any = { page, pageSize: 50 };
      if (filter.endpointId) params.endpointId = Number(filter.endpointId);
      if (filter.isSuccess !== '') params.isSuccess = filter.isSuccess === 'true';
      const res = await api.getResults(params);
      setResults(Array.isArray(res) ? res : []);
    } catch (e) { console.error(e); }
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
      <h2 className="text-xl font-bold text-gray-100">Results / History</h2>

      <div className="flex gap-3 items-center">
        <select className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm" value={filter.endpointId} onChange={e => { setFilter({ ...filter, endpointId: e.target.value }); setPage(1); }}>
          <option value="">All Endpoints</option>
          {endpoints.map(ep => <option key={ep.id} value={ep.id}>{ep.name}</option>)}
        </select>
        <select className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm" value={filter.isSuccess} onChange={e => { setFilter({ ...filter, isSuccess: e.target.value }); setPage(1); }}>
          <option value="">All Results</option>
          <option value="true">Passed Only</option>
          <option value="false">Failed Only</option>
        </select>
        <div className="flex gap-1">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} className="text-xs px-2 py-1 bg-gray-800 rounded text-gray-400 hover:text-gray-200">Prev</button>
          <span className="text-xs px-2 py-1 text-gray-400">Page {page}</span>
          <button onClick={() => setPage(p => p + 1)} className="text-xs px-2 py-1 bg-gray-800 rounded text-gray-400 hover:text-gray-200">Next</button>
        </div>
      </div>

      <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left text-gray-400">
              <th className="p-3">Endpoint</th>
              <th className="p-3">Status</th>
              <th className="p-3">Code</th>
              <th className="p-3">Latency</th>
              <th className="p-3">Result</th>
              <th className="p-3">Error</th>
              <th className="p-3">Time</th>
            </tr>
          </thead>
          <tbody>
            {results.map(r => (
              <>
                <tr
                  key={r.id}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer"
                  onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                >
                  <td className="p-3">{r.apiEndpoint?.name || `#${r.apiEndpointId}`}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded border ${r.statusCode >= 200 && r.statusCode < 300 ? 'bg-green-900/50 text-green-400 border-green-700' : 'bg-red-900/50 text-red-400 border-red-700'}`}>
                      {r.statusCode}
                    </span>
                  </td>
                  <td className="p-3">{r.statusCode}</td>
                  <td className="p-3 text-gray-400">{r.responseTimeMs} ms</td>
                  <td className="p-3">
                    {r.isSuccess ? (
                      <span className="text-green-400">✓ Pass</span>
                    ) : (
                      <span className="text-red-400">✗ Fail</span>
                    )}
                  </td>
                  <td className="p-3 text-red-400 text-xs max-w-40 truncate">{r.errorMessage || '—'}</td>
                  <td className="p-3 text-gray-500 text-xs">{new Date(r.executedAt).toLocaleString()}</td>
                </tr>
                {expanded === r.id && (
                  <tr key={`exp-${r.id}`} className="bg-gray-850">
                    <td colSpan={7} className="p-4">
                      <div className="space-y-3">
                        <div>
                          <h4 className="text-xs font-semibold text-gray-400 mb-1">Response Headers</h4>
                          <pre className="bg-gray-950 border border-gray-800 rounded p-3 text-xs text-gray-300 overflow-auto max-h-32">
                            {formatHeaders(r.responseHeaders) ? JSON.stringify(formatHeaders(r.responseHeaders), null, 2) : '—'}
                          </pre>
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-gray-400 mb-1">Response Body</h4>
                          <pre className="bg-gray-950 border border-gray-800 rounded p-3 text-xs text-gray-300 overflow-auto max-h-64 whitespace-pre-wrap">
                            {formatBody(r.responseBody) || '—'}
                          </pre>
                        </div>
                        {r.requestBody && (
                          <div>
                            <h4 className="text-xs font-semibold text-gray-400 mb-1">Request Body</h4>
                            <pre className="bg-gray-950 border border-gray-800 rounded p-3 text-xs text-gray-300 overflow-auto max-h-32 whitespace-pre-wrap">
                              {formatBody(r.requestBody)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
            {results.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-gray-600">No results yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
