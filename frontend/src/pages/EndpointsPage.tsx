import { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { ApiEndpoint, Collection, KeyValue } from '../types';
import KeyValueEditor from '../components/KeyValueEditor';

export default function EndpointsPage() {
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selected, setSelected] = useState<ApiEndpoint | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', method: 'GET', url: '', body: '', bodyType: 'json',
    authType: 'None', authConfig: '{}', collectionId: undefined as number | undefined,
  });
  const [headers, setHeaders] = useState<KeyValue[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [eps, cols] = await Promise.all([api.getEndpoints(), api.getCollections()]);
      setEndpoints(Array.isArray(eps) ? eps : []);
      setCollections(Array.isArray(cols) ? cols : []);
    } catch (e) { console.error(e); }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === endpoints.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(endpoints.map(e => e.id)));
    }
  };

  const handleSave = async () => {
    const headersJson = JSON.stringify(Object.fromEntries(headers.filter(h => h.key).map(h => [h.key, h.value])));
    const data = { ...form, headers: headersJson, collectionId: form.collectionId || null };
    try {
      if (selected) {
        await api.updateEndpoint(selected.id, data);
      } else {
        await api.createEndpoint(data);
      }
      setShowForm(false);
      setSelected(null);
      resetForm();
      loadAll();
    } catch (e) { console.error(e); }
  };

  const handleEdit = (ep: ApiEndpoint) => {
    setSelected(ep);
    setForm({
      name: ep.name, description: ep.description || '', method: ep.method, url: ep.url,
      body: ep.body || '', bodyType: ep.bodyType || 'json', authType: ep.authType || 'None',
      authConfig: ep.authConfig || '{}', collectionId: ep.collectionId ?? undefined,
    });
    const parsed = ep.headers ? (() => { try { return JSON.parse(ep.headers); } catch { return {}; } })() : {};
    setHeaders(Object.entries(parsed).map(([k, v]) => ({ key: k, value: v as string })));
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this endpoint?')) return;
    await api.deleteEndpoint(id);
    loadAll();
  };

  const handleRun = async (id: number) => {
    try {
      const res = await api.runEndpoint(id);
      alert(`Status: ${res.statusCode} | Time: ${res.responseTimeMs}ms | ${res.isSuccess ? 'PASS' : 'FAIL'}`);
    } catch (e) { console.error(e); }
  };

  const handleBulkRun = async () => {
    try {
      const results = await api.bulkRun(Array.from(selectedIds));
      const summary = results.map((r: any) => `${r.apiEndpointId}: ${r.statusCode} ${r.isSuccess ? '✓' : '✗'}`).join('\n');
      alert(`Bulk run complete:\n${summary}`);
      loadAll();
    } catch (e) { console.error(e); }
  };

  const resetForm = () => {
    setForm({ name: '', description: '', method: 'GET', url: '', body: '', bodyType: 'json', authType: 'None', authConfig: '{}', collectionId: undefined });
    setHeaders([]);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-100">Endpoints</h2>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <button onClick={handleBulkRun} className="bg-purple-700 hover:bg-purple-600 text-white text-sm px-3 py-1.5 rounded">
              Run Selected ({selectedIds.size})
            </button>
          )}
          <button onClick={() => { setSelected(null); resetForm(); setShowForm(!showForm); }} className="bg-purple-700 hover:bg-purple-600 text-white text-sm px-3 py-1.5 rounded">
            + New Endpoint
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-300">{selected ? 'Edit' : 'Create'} Endpoint</h3>
          <div className="grid grid-cols-2 gap-3">
            <input className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm" placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <select className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm" value={form.collectionId ?? ''} onChange={e => setForm({ ...form, collectionId: e.target.value ? Number(e.target.value) : undefined })}>
              <option value="">No Collection</option>
              {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <input className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm" placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <div className="flex gap-3">
            <select className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm min-w-[100px]" value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}>
              {['GET','POST','PUT','DELETE','PATCH','HEAD','OPTIONS'].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <input className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm" placeholder="URL" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} />
          </div>

          <details className="bg-gray-800/50 rounded p-3">
            <summary className="text-sm text-gray-400 cursor-pointer">Headers</summary>
            <div className="mt-2">
              <KeyValueEditor pairs={headers} onChange={setHeaders} />
            </div>
          </details>

          <details className="bg-gray-800/50 rounded p-3">
            <summary className="text-sm text-gray-400 cursor-pointer">Body</summary>
            <div className="mt-2 space-y-2">
              <select className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm" value={form.bodyType} onChange={e => setForm({ ...form, bodyType: e.target.value })}>
                <option value="json">JSON</option>
                <option value="form-data">Form Data</option>
                <option value="urlencoded">x-www-form-urlencoded</option>
                <option value="raw">Raw Text</option>
              </select>
              <textarea className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm h-32 font-mono" placeholder='{"key": "value"}' value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} />
            </div>
          </details>

          <details className="bg-gray-800/50 rounded p-3">
            <summary className="text-sm text-gray-400 cursor-pointer">Authentication</summary>
            <div className="mt-2 space-y-2">
              <select className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm" value={form.authType} onChange={e => setForm({ ...form, authType: e.target.value })}>
                <option value="None">None</option>
                <option value="Bearer">Bearer Token</option>
                <option value="Basic">Basic Auth</option>
                <option value="ApiKey">API Key</option>
                <option value="OAuth2">OAuth 2.0</option>
              </select>
              <textarea className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm h-24 font-mono" placeholder='{"token": "your-token"}' value={form.authConfig} onChange={e => setForm({ ...form, authConfig: e.target.value })} />
            </div>
          </details>

          <div className="flex gap-2">
            <button onClick={handleSave} className="bg-purple-700 hover:bg-purple-600 text-white text-sm px-4 py-1.5 rounded">{selected ? 'Update' : 'Create'}</button>
            <button onClick={() => { setShowForm(false); setSelected(null); }} className="text-gray-400 text-sm px-3 py-1.5">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left text-gray-400">
              <th className="p-3 w-8">
                <input type="checkbox" checked={selectedIds.size === endpoints.length && endpoints.length > 0} onChange={toggleSelectAll} />
              </th>
              <th className="p-3">Name</th>
              <th className="p-3">Method</th>
              <th className="p-3">URL</th>
              <th className="p-3">Collection</th>
              <th className="p-3">Auth</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {endpoints.map(ep => (
              <tr key={ep.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="p-3">
                  <input type="checkbox" checked={selectedIds.has(ep.id)} onChange={() => toggleSelect(ep.id)} />
                </td>
                <td className="p-3 cursor-pointer" onClick={() => handleEdit(ep)}>{ep.name}</td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-0.5 rounded border ${
                    {GET:'bg-green-900/50 text-green-400 border-green-700',POST:'bg-blue-900/50 text-blue-400 border-blue-700',PUT:'bg-yellow-900/50 text-yellow-400 border-yellow-700',DELETE:'bg-red-900/50 text-red-400 border-red-700'}[ep.method] || 'bg-gray-800 text-gray-400'
                  }`}>{ep.method}</span>
                </td>
                <td className="p-3 text-gray-400 truncate max-w-64">{ep.url}</td>
                <td className="p-3 text-gray-500">{ep.collection?.name || '—'}</td>
                <td className="p-3 text-gray-500">{ep.authType || 'None'}</td>
                <td className="p-3 flex gap-2">
                  <button onClick={() => handleRun(ep.id)} className="text-green-400 hover:text-green-300 text-xs">Run</button>
                  <button onClick={() => handleEdit(ep)} className="text-blue-400 hover:text-blue-300 text-xs">Edit</button>
                  <button onClick={() => handleDelete(ep.id)} className="text-red-400 hover:text-red-300 text-xs">Del</button>
                </td>
              </tr>
            ))}
            {endpoints.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-gray-600">No endpoints yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
