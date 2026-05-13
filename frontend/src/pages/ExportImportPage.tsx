import { useEffect, useState, useRef } from 'react';
import { api } from '../services/api';
import type { ApiEndpoint } from '../types';

export default function ExportImportPage() {
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getEndpoints().then(eps => setEndpoints(Array.isArray(eps) ? eps : []));
  }, []);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleExport = async () => {
    if (selectedIds.size === 0) { setMessage('Select at least one endpoint'); return; }
    try {
      const data = await api.exportEndpoints(Array.from(selectedIds));
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'lithium-export.json';
      a.click();
      URL.revokeObjectURL(url);
      setMessage(`Exported ${selectedIds.size} endpoint(s)`);
    } catch (e: any) { setMessage('Export failed: ' + e.message); }
  };

  const handleImport = async () => {
    fileRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const result = await api.importEndpoints(data);
      setMessage(`Imported ${result.imported} endpoint(s)`);
      const eps = await api.getEndpoints();
      setEndpoints(Array.isArray(eps) ? eps : []);
    } catch (e: any) { setMessage('Import failed: ' + e.message); }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-100">Export / Import</h2>

      {message && (
        <div className={`text-sm px-4 py-2 rounded ${message.startsWith('Import failed') || message.startsWith('Export failed') ? 'bg-red-900/30 text-red-400 border border-red-800' : 'bg-green-900/30 text-green-400 border border-green-800'}`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Export Endpoints</h3>
          <p className="text-xs text-gray-500 mb-3">Select endpoints to export as JSON. Includes schedules and validation rules.</p>
          <div className="max-h-64 overflow-auto space-y-1 mb-3">
            {endpoints.map(ep => (
              <label key={ep.id} className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 cursor-pointer">
                <input type="checkbox" checked={selectedIds.has(ep.id)} onChange={() => toggleSelect(ep.id)} />
                {ep.name}
              </label>
            ))}
            {endpoints.length === 0 && <p className="text-gray-600 text-xs">No endpoints</p>}
          </div>
          <button onClick={handleExport} disabled={selectedIds.size === 0} className="bg-purple-700 hover:bg-purple-600 disabled:bg-gray-800 disabled:text-gray-600 text-white text-sm px-4 py-1.5 rounded">
            Export Selected ({selectedIds.size})
          </button>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Import Endpoints</h3>
          <p className="text-xs text-gray-500 mb-3">Import endpoints from a previously exported JSON file. Collections will be auto-created if they don't exist.</p>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
          <button onClick={handleImport} className="bg-purple-700 hover:bg-purple-600 text-white text-sm px-4 py-1.5 rounded">
            Import from File
          </button>
        </div>
      </div>
    </div>
  );
}
