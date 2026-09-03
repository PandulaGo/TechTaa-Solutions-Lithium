import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { ApiEndpoint } from '../types';
import Spinner from '../components/Spinner';
import { useToast } from '../ToastContext';
import { useConfirmDialog, ConfirmDialog } from '../components/ConfirmDialog';
import { useMultiOptionDialog, MultiOptionDialog } from '../components/MultiOptionDialog';
import { useEnvironment } from '../EnvironmentContext';

export default function ExportImportPage() {
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const { confirm: confirmDialog, state: confirmState } = useConfirmDialog();
  const { show: showMultiOption, state: multiOptionState } = useMultiOptionDialog();
  const { activeEnvironmentId } = useEnvironment();
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    api.getEndpoints().then(eps => { setEndpoints(Array.isArray(eps) ? eps : []); setLoading(false); });
  }, []);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleExport = async () => {
    if (selectedIds.size === 0) { showToast('Select at least one endpoint', 'error'); return; }

    const result = await showMultiOption(
      `${selectedIds.size} endpoint${selectedIds.size !== 1 ? 's' : ''} selected. What would you like to do?`,
      'Export Endpoints',
      { option1Text: 'Export & Run', option2Text: 'Run Only (Temporary)', cancelText: 'Cancel' }
    );

    try {
      if (result === 'option1') {
        // Export JSON + run endpoints
        const data = await api.exportEndpoints(Array.from(selectedIds));
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'lithium-export.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 100);
        showToast(`Exported ${selectedIds.size} endpoint(s)`, 'success');

        // Run the selected endpoints
        const { runId } = await api.bulkRunEndpoints(Array.from(selectedIds), activeEnvironmentId ?? undefined);
        navigate(`/?runId=${runId}`);
      } else if (result === 'option2') {
        // Run endpoints only (no export)
        const { runId } = await api.bulkRunEndpoints(Array.from(selectedIds), activeEnvironmentId ?? undefined);
        navigate(`/?runId=${runId}`);
      }
    } catch (e: any) {
      showToast(e.message || 'Operation failed', 'error');
    }
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) { showToast('Select at least one endpoint', 'error'); return; }
    const confirmed = await confirmDialog(
      `Delete ${selectedIds.size} endpoint${selectedIds.size !== 1 ? 's' : ''}? This cannot be undone.`,
      'Delete Endpoints',
      { confirmText: 'Delete', cancelText: 'Cancel', variant: 'danger' }
    );
    if (!confirmed) return;
    try {
      await api.batchDeleteEndpoints(Array.from(selectedIds));
      setSelectedIds(new Set());
      showToast(`Deleted ${selectedIds.size} endpoint(s)`, 'success');
      const eps = await api.getEndpoints();
      setEndpoints(Array.isArray(eps) ? eps : []);
    } catch (e: any) { showToast('Delete failed: ' + e.message, 'error'); }
  };

  const handleImport = async () => {
    fileRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      let endpointCount = 0;
      let collectionNames: string[] = [];
      if (data.collections && Array.isArray(data.collections)) {
        for (const col of data.collections) {
          collectionNames.push(col.name);
          endpointCount += col.endpoints ? col.endpoints.length : 0;
        }
      } else if (data.endpoints && Array.isArray(data.endpoints)) {
        endpointCount = data.endpoints.length;
        const names = new Set<string>();
        for (const ep of data.endpoints) {
          if (ep.collectionName) names.add(ep.collectionName);
        }
        collectionNames = Array.from(names);
      }

      const summary = `${endpointCount} endpoint${endpointCount !== 1 ? 's' : ''}${collectionNames.length > 0 ? ` in ${collectionNames.length} collection${collectionNames.length !== 1 ? 's' : ''} (${collectionNames.join(', ')})` : ''}. How would you like to import?`;

      const result = await showMultiOption(
        summary,
        'Import Endpoints',
        { option1Text: 'Save to Database', option2Text: 'Run Only (Temporary)', cancelText: 'Cancel' }
      );

      if (result === 'option1') {
        // Save permanently
        const importResult = await api.importEndpoints(data);
        showToast(`Imported ${importResult.imported} endpoint(s)`, 'success');
        const eps = await api.getEndpoints();
        setEndpoints(Array.isArray(eps) ? eps : []);
      } else if (result === 'option2') {
        // Import temporarily and run
        const { runId, imported } = await api.importAndRun(data, activeEnvironmentId ?? undefined);
        showToast(`Imported ${imported} endpoint(s) — running temporarily (auto-cleaned after run)`, 'success');
        navigate(`/?runId=${runId}`);
      }
    } catch (e: any) { showToast('Import failed: ' + e.message, 'error'); }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Export / Import</h2>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Export Endpoints</h3>
          <p className="text-xs text-gray-600 dark:text-gray-500 mb-3">Select endpoints to export as JSON. Includes schedules and validation rules.</p>
          <div className="max-h-64 overflow-auto mb-3">
            {loading ? (
              <Spinner text="Loading endpoints..." />
            ) : endpoints.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-600 text-xs">No endpoints</p>
            ) : (
              <>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:text-gray-200 cursor-pointer border-b border-gray-200 dark:border-gray-800 pb-1 mb-1">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === endpoints.length}
                    onChange={() => {
                      if (selectedIds.size === endpoints.length) {
                        setSelectedIds(new Set());
                      } else {
                        setSelectedIds(new Set(endpoints.map(ep => ep.id)));
                      }
                    }}
                  />
                  Select All ({endpoints.length})
                </label>
                <div className="space-y-1">
                  {endpoints.map(ep => (
                    <label key={ep.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:text-gray-200 cursor-pointer">
                      <input type="checkbox" checked={selectedIds.has(ep.id)} onChange={() => toggleSelect(ep.id)} />
                      {ep.name}
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={handleExport} disabled={selectedIds.size === 0} className="bg-purple-700 hover:bg-purple-600 disabled:bg-gray-100 dark:bg-gray-800 disabled:text-gray-500 dark:text-gray-600 text-white text-sm px-4 py-1.5 rounded">
              Export Selected ({selectedIds.size})
            </button>
            <button onClick={handleDelete} disabled={selectedIds.size === 0} className="bg-red-600 hover:bg-red-500 disabled:bg-gray-100 dark:bg-gray-800 disabled:text-gray-500 dark:text-gray-600 text-white text-sm px-4 py-1.5 rounded">
              Delete Selected ({selectedIds.size})
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Import Endpoints</h3>
          <p className="text-xs text-gray-600 dark:text-gray-500 mb-3">Import endpoints from a previously exported JSON file. Collections will be auto-created if they don't exist.</p>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
          <button onClick={handleImport} className="bg-purple-700 hover:bg-purple-600 text-white text-sm px-4 py-1.5 rounded">
            Import from File
          </button>
        </div>
      </div>

      <details className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
        <summary className="text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">Sample Import JSON Format</summary>
        <p className="text-xs text-gray-600 dark:text-gray-500 mt-2 mb-3">Use this structure to build your own import file. Remove any fields you don't need.</p>
        <pre className="bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded p-4 text-xs text-gray-700 dark:text-gray-300 overflow-auto max-h-[600px] whitespace-pre leading-relaxed">
{`{
  "endpoints": [
    {
      "name": "Get Users",
      "description": "Fetches list of users",
      "method": "GET",
      "url": "https://api.example.com/v1/users",
      "headers": "{\\"Authorization\\":\\"Bearer {&#123;token}\\",\\"Accept\\":\\"application/json\\"}",
      "body": null,
      "bodyType": null,
      "authType": "Bearer",
      "authConfig": "{\\"token\\":\\"your-bearer-token-here\\"}",
      "collectionName": "User Service",
      "schedule": {
        "intervalSeconds": 300,
        "isEnabled": true
      },
      "validationRules": [
        {
          "ruleType": "StatusCode",
          "expectedValue": "200",
          "comparisonType": "Equals",
          "order": 1,
          "isEnabled": true
        },
        {
          "ruleType": "ResponseTime",
          "expectedValue": "5000",
          "comparisonType": "LessThan",
          "order": 2,
          "isEnabled": true
        },
        {
          "ruleType": "JsonPath",
          "expectedValue": "$.total > 0",
          "comparisonType": "Equals",
          "order": 3,
          "isEnabled": true
        }
      ]
    },
    {
      "name": "Create Order",
      "description": "Creates a new order with the given payload",
      "method": "POST",
      "url": "https://api.example.com/v1/orders",
      "headers": "{\\"Authorization\\":\\"Bearer {&#123;token}\\",\\"Content-Type\\":\\"application/json\\"}",
      "body": "{\\"customerId\\": 42, \\"items\\": [{\\"productId\\": 1, \\"quantity\\": 2}], \\"shippingAddress\\": {\\"street\\": \\"123 Main St\\", \\"city\\": \\"New York\\", \\"zip\\": \\"10001\\"}}",
      "bodyType": "json",
      "authType": "Bearer",
      "authConfig": "{\\"token\\":\\"your-bearer-token-here\\"}",
      "collectionName": "Order Service",
      "schedule": {
        "intervalSeconds": 60,
        "isEnabled": true
      },
      "validationRules": [
        {
          "ruleType": "StatusCode",
          "expectedValue": "201",
          "comparisonType": "Equals",
          "order": 1,
          "isEnabled": true
        },
        {
          "ruleType": "BodyContains",
          "expectedValue": "orderId",
          "comparisonType": "Contains",
          "order": 2,
          "isEnabled": true
        }
      ]
    },
    {
      "name": "Health Check",
      "description": "Basic health check endpoint",
      "method": "GET",
      "url": "https://api.example.com/health",
      "headers": null,
      "body": null,
      "bodyType": null,
      "authType": "None",
      "authConfig": null,
      "collectionName": "System",
      "schedule": {
        "intervalSeconds": 10,
        "isEnabled": true
      },
      "validationRules": [
        {
          "ruleType": "StatusCode",
          "expectedValue": "200",
          "comparisonType": "Equals",
          "order": 1,
          "isEnabled": true
        },
        {
          "ruleType": "ResponseTime",
          "expectedValue": "1000",
          "comparisonType": "LessThan",
          "order": 2,
          "isEnabled": true
        }
      ]
    }
  ]
}`}
        </pre>
      </details>
      <ConfirmDialog state={confirmState} />
      <MultiOptionDialog state={multiOptionState} />
    </div>
  );
}
