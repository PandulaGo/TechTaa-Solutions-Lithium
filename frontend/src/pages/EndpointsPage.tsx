import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { ApiEndpoint, Collection, KeyValue, Schedule, ValidationRule } from '../types';
import KeyValueEditor from '../components/KeyValueEditor';
import Spinner from '../components/Spinner';
import { useToast } from '../ToastContext';
import { useEnvironment } from '../EnvironmentContext';
import { useConfirmDialog, ConfirmDialog } from '../components/ConfirmDialog';

interface CollectionGroup {
  collection: Collection | null;
  endpoints: ApiEndpoint[];
}

export default function EndpointsPage() {
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [validationRules, setValidationRules] = useState<ValidationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ApiEndpoint | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', method: 'GET', url: '', body: '', bodyType: 'json',
    authType: 'None', authConfig: '{}', collectionId: undefined as number | undefined,
  });
  const [headers, setHeaders] = useState<KeyValue[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [expandedCollections, setExpandedCollections] = useState<Set<number | 'uncategorized'>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleCollection, setScheduleCollection] = useState<Collection | null>(null);
  const [scheduleForm, setScheduleForm] = useState({ intervalSeconds: 60, isEnabled: true });
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationEndpoint, setValidationEndpoint] = useState<ApiEndpoint | null>(null);
  const [validationForm, setValidationForm] = useState({ ruleType: 'StatusCode', expectedValue: '200', comparisonType: 'Equals', order: 0, isEnabled: true });
  const [editingRule, setEditingRule] = useState<ValidationRule | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'hasSchedule' | 'hasValidation' | 'hasBoth'>('all');
  const [schedulerRunning, setSchedulerRunning] = useState(false);
  const { showToast } = useToast();
  const { activeEnvironmentId } = useEnvironment();
  const { confirm: confirmDialog, state: confirmState } = useConfirmDialog();
  const navigate = useNavigate();

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [eps, cols, scheds, rules, schedStatus] = await Promise.all([
        api.getEndpoints(),
        api.getCollections(),
        api.getSchedules(),
        api.getValidationRules(),
        api.getSchedulerStatus(),
      ]);
      setEndpoints(Array.isArray(eps) ? eps : []);
      setCollections(Array.isArray(cols) ? cols : []);
      setSchedules(Array.isArray(scheds) ? scheds : []);
      setValidationRules(Array.isArray(rules) ? rules : []);
      setSchedulerRunning(schedStatus.running);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const scheduleMap = useMemo(() => {
    const map = new Map<number, Schedule>();
    for (const s of schedules) {
      map.set(s.collectionId, s);
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
    for (const [key, rules] of map.entries()) {
      map.set(key, rules.sort((a, b) => a.order - b.order));
    }
    return map;
  }, [validationRules]);

  const groupedEndpoints = useMemo(() => {
    const groups: CollectionGroup[] = [];
    const collectionMap = new Map<number, ApiEndpoint[]>();
    const uncategorized: ApiEndpoint[] = [];

    const filteredEndpoints = endpoints.filter(ep => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = (
          ep.name.toLowerCase().includes(query) ||
          ep.url.toLowerCase().includes(query) ||
          ep.method.toLowerCase().includes(query) ||
          ep.description?.toLowerCase().includes(query) ||
          ep.authType?.toLowerCase().includes(query)
        );
        if (!matchesSearch) return false;
      }

      // Type filter
      const hasSchedule = ep.collectionId ? scheduleMap.has(ep.collectionId) : false;
      const hasValidation = (validationMap.get(ep.id) || []).length > 0;

      if (filterType === 'hasSchedule' && !hasSchedule) return false;
      if (filterType === 'hasValidation' && !hasValidation) return false;
      if (filterType === 'hasBoth' && (!hasSchedule || !hasValidation)) return false;

      return true;
    });

    for (const ep of filteredEndpoints) {
      if (ep.collectionId) {
        const list = collectionMap.get(ep.collectionId) || [];
        list.push(ep);
        collectionMap.set(ep.collectionId, list);
      } else {
        uncategorized.push(ep);
      }
    }

    for (const col of collections) {
      const eps = collectionMap.get(col.id);
      if (eps && eps.length > 0) {
        groups.push({ collection: col, endpoints: eps });
      }
    }

    if (uncategorized.length > 0) {
      groups.push({ collection: null, endpoints: uncategorized });
    }

    return groups;
  }, [endpoints, collections, searchQuery, scheduleMap, validationMap, filterType]);

  const toggleCollection = (id: number | 'uncategorized') => {
    setExpandedCollections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    const ids = new Set<number | 'uncategorized'>();
    for (const g of groupedEndpoints) {
      ids.add(g.collection ? g.collection.id : 'uncategorized');
    }
    setExpandedCollections(ids);
  };

  const collapseAll = () => {
    setExpandedCollections(new Set());
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectCollection = (eps: ApiEndpoint[]) => {
    const ids = eps.map(e => e.id);
    const allSelected = ids.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        ids.forEach(id => next.delete(id));
      } else {
        ids.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const handleSave = async () => {
    const headersJson = JSON.stringify(Object.fromEntries(headers.filter(h => h.key).map(h => [h.key, h.value])));
    const data = { ...form, headers: headersJson, collectionId: form.collectionId || null };
    try {
      if (selected) {
        await api.updateEndpoint(selected.id, data);
        showToast('Endpoint updated successfully', 'success');
      } else {
        await api.createEndpoint(data);
        showToast('Endpoint created successfully', 'success');
      }
      setShowForm(false);
      setSelected(null);
      resetForm();
      loadAll();
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Failed to save endpoint', 'error');
    }
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
    const confirmed = await confirmDialog('Delete this endpoint?', 'Confirm Delete', { confirmText: 'Delete', cancelText: 'Cancel', variant: 'danger' });
    if (!confirmed) return;
    try {
      await api.deleteEndpoint(id);
      showToast('Endpoint deleted successfully', 'success');
      loadAll();
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Failed to delete endpoint', 'error');
    }
  };

  const handleRun = async (id: number) => {
    try {
      const res = await api.runEndpoint(id, activeEnvironmentId ?? undefined);
      const title = res.isSuccess ? 'Test Passed' : 'Test Failed';
      const type = res.isSuccess ? 'success' : 'error';
      showToast(`Status: ${res.statusCode} | Time: ${res.responseTimeMs}ms`, type, title);
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Failed to run endpoint', 'error');
    }
  };

  const handleRunCollection = async (collectionId: number) => {
    try {
      const { runId } = await api.runCollection(collectionId, activeEnvironmentId ?? undefined);
      navigate(`/?runId=${runId}`);
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Failed to run collection', 'error');
    }
  };

  const handleBulkRun = async () => {
    try {
      const { runId } = await api.bulkRun(Array.from(selectedIds), activeEnvironmentId ?? undefined);
      navigate(`/?runId=${runId}`);
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Bulk run failed', 'error');
    }
  };

  const handleBulkDeleteGroup = async (eps: ApiEndpoint[]) => {
    const toDelete = selectedIds.size > 0
      ? eps.filter(ep => selectedIds.has(ep.id))
      : eps;
    if (toDelete.length === 0) {
      showToast('No endpoints selected', 'error');
      return;
    }
    const confirmed = await confirmDialog(
      `Delete ${toDelete.length} endpoint${toDelete.length !== 1 ? 's' : ''}? This cannot be undone.`,
      'Delete Endpoints',
      { confirmText: 'Delete', cancelText: 'Cancel', variant: 'danger' }
    );
    if (!confirmed) return;
    try {
      await api.batchDeleteEndpoints(toDelete.map(ep => ep.id));
      setSelectedIds(new Set());
      showToast(`${toDelete.length} endpoint${toDelete.length !== 1 ? 's' : ''} deleted`, 'success');
      loadAll();
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Failed to delete endpoints', 'error');
    }
  };

  const handleToggleScheduler = async () => {
    try {
      if (schedulerRunning) {
        await api.stopScheduler();
        setSchedulerRunning(false);
        showToast('Scheduler stopped — no schedules will run', 'success');
      } else {
        await api.startScheduler();
        setSchedulerRunning(true);
        showToast('Scheduler started', 'success');
      }
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Failed to toggle scheduler', 'error');
    }
  };

  const resetForm = () => {
    setForm({ name: '', description: '', method: 'GET', url: '', body: '', bodyType: 'json', authType: 'None', authConfig: '{}', collectionId: undefined });
    setHeaders([]);
  };

  const methodBadgeClass = (method: string) =>
    ({GET:'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/50 dark:text-green-400 dark:border-green-700',POST:'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/50 dark:text-blue-400 dark:border-blue-700',PUT:'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-400 dark:border-yellow-700',DELETE:'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/50 dark:text-red-400 dark:border-red-700'}[method] || 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-700');

  const formatInterval = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  const handleOpenScheduleModal = (col: Collection) => {
    const existingSchedule = scheduleMap.get(col.id);
    setScheduleCollection(col);
    if (existingSchedule) {
      setScheduleForm({ intervalSeconds: existingSchedule.intervalSeconds, isEnabled: existingSchedule.isEnabled });
    } else {
      setScheduleForm({ intervalSeconds: 60, isEnabled: true });
    }
    setShowScheduleModal(true);
  };

  const handleSaveSchedule = async () => {
    if (!scheduleCollection) return;
    const existingSchedule = scheduleMap.get(scheduleCollection.id);
    try {
      if (existingSchedule) {
        await api.updateSchedule(existingSchedule.id, scheduleForm);
        showToast('Schedule updated successfully', 'success');
      } else {
        await api.createSchedule(scheduleCollection.id, scheduleForm);
        showToast('Schedule created successfully', 'success');
      }
      setShowScheduleModal(false);
      setScheduleCollection(null);
      loadAll();
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Failed to save schedule', 'error');
    }
  };

  const handleOpenValidationModal = (ep: ApiEndpoint) => {
    setValidationEndpoint(ep);
    setEditingRule(null);
    setValidationForm({ ruleType: 'StatusCode', expectedValue: '200', comparisonType: 'Equals', order: 0, isEnabled: true });
    setShowValidationModal(true);
  };

  const handleSaveValidationRule = async () => {
    if (!validationEndpoint) return;
    try {
      if (editingRule) {
        await api.updateValidationRule(editingRule.id, validationForm);
        showToast('Validation rule updated successfully', 'success');
      } else {
        await api.createValidationRule(validationEndpoint.id, validationForm);
        showToast('Validation rule created successfully', 'success');
      }
      setEditingRule(null);
      setValidationForm({ ruleType: 'StatusCode', expectedValue: '200', comparisonType: 'Equals', order: 0, isEnabled: true });
      loadAll();
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Failed to save validation rule', 'error');
    }
  };

  const handleEditValidationRule = (rule: ValidationRule) => {
    setEditingRule(rule);
    setValidationForm({
      ruleType: rule.ruleType,
      expectedValue: rule.expectedValue,
      comparisonType: rule.comparisonType,
      order: rule.order,
      isEnabled: rule.isEnabled,
    });
  };

  const handleDeleteValidationRule = async (ruleId: number) => {
    const confirmed = await confirmDialog('Delete this validation rule?', 'Confirm Delete', { confirmText: 'Delete', cancelText: 'Cancel', variant: 'danger' });
    if (!confirmed) return;
    try {
      await api.deleteValidationRule(ruleId);
      showToast('Validation rule deleted successfully', 'success');
      if (editingRule && editingRule.id === ruleId) {
        setEditingRule(null);
        setValidationForm({ ruleType: 'StatusCode', expectedValue: '200', comparisonType: 'Equals', order: 0, isEnabled: true });
      }
      loadAll();
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Failed to delete validation rule', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Endpoints</h2>
        <div className="flex gap-2 items-center">
          {selectedIds.size > 0 && (
            <button onClick={handleBulkRun} className="bg-purple-700 hover:bg-purple-600 text-white text-sm px-3 py-1.5 rounded">
              Run Selected ({selectedIds.size})
            </button>
          )}
          <button
            onClick={handleToggleScheduler}
            className={`text-xs px-3 py-1.5 rounded border transition-colors ${
              schedulerRunning
                ? 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-400 dark:border-green-700 dark:hover:bg-green-900/80'
                : 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-900/80'
            }`}
          >
            {schedulerRunning ? '■ Stop Schedules' : '▶ Start Schedules'}
          </button>
          <button onClick={expandAll} className="text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 text-sm px-2 py-1.5">
            Expand All
          </button>
          <button onClick={collapseAll} className="text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 text-sm px-2 py-1.5">
            Collapse All
          </button>
          <button onClick={() => { setSelected(null); resetForm(); setShowForm(true); }} className="bg-purple-700 hover:bg-purple-600 text-white text-sm px-3 py-1.5 rounded">
            + New Endpoint
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setFilterType('all')}
          className={`text-xs px-3 py-1.5 rounded transition-colors ${
            filterType === 'all'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilterType('hasSchedule')}
          className={`text-xs px-3 py-1.5 rounded transition-colors ${
            filterType === 'hasSchedule'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          Has Schedule
        </button>
        <button
          onClick={() => setFilterType('hasValidation')}
          className={`text-xs px-3 py-1.5 rounded transition-colors ${
            filterType === 'hasValidation'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          Has Validation
        </button>
        <button
          onClick={() => setFilterType('hasBoth')}
          className={`text-xs px-3 py-1.5 rounded transition-colors ${
            filterType === 'hasBoth'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          Has Both
        </button>
      </div>

      <div className="relative">
        <input
          type="text"
          placeholder="Search endpoints by name, URL, method..."
          className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 pl-10 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-xl p-6 w-[600px] max-w-[90vw] max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {selected ? 'Edit' : 'Create'} Endpoint
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Name</label>
                  <input className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm" placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Collection</label>
                  <select className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm" value={form.collectionId ?? ''} onChange={e => setForm({ ...form, collectionId: e.target.value ? Number(e.target.value) : undefined })}>
                    <option value="">No Collection</option>
                    {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Description</label>
                <input className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm" placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="flex gap-3">
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Method</label>
                  <select className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm min-w-[100px]" value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}>
                    {['GET','POST','PUT','DELETE','PATCH','HEAD','OPTIONS'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">URL</label>
                  <input className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm" placeholder="URL" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} />
                </div>
              </div>

              <details className="bg-gray-100 dark:bg-gray-800/50 rounded p-3">
                <summary className="text-sm text-gray-700 dark:text-gray-400 cursor-pointer">Headers</summary>
                <div className="mt-2">
                  <KeyValueEditor pairs={headers} onChange={setHeaders} />
                </div>
              </details>

              <details className="bg-gray-100 dark:bg-gray-800/50 rounded p-3">
                <summary className="text-sm text-gray-700 dark:text-gray-400 cursor-pointer">Body</summary>
                <div className="mt-2 space-y-2">
                  <select className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm" value={form.bodyType} onChange={e => setForm({ ...form, bodyType: e.target.value })}>
                    <option value="json">JSON</option>
                    <option value="form-data">Form Data</option>
                    <option value="urlencoded">x-www-form-urlencoded</option>
                    <option value="raw">Raw Text</option>
                  </select>
                  <textarea className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm h-32 font-mono" placeholder='{"key": "value"}' value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} />
                </div>
              </details>

              <details className="bg-gray-100 dark:bg-gray-800/50 rounded p-3">
                <summary className="text-sm text-gray-700 dark:text-gray-400 cursor-pointer">Authentication</summary>
                <div className="mt-2 space-y-2">
                  <select className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm" value={form.authType} onChange={e => setForm({ ...form, authType: e.target.value })}>
                    <option value="None">None</option>
                    <option value="Bearer">Bearer Token</option>
                    <option value="Basic">Basic Auth</option>
                    <option value="ApiKey">API Key</option>
                    <option value="OAuth2">OAuth 2.0</option>
                  </select>
                  <textarea className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm h-24 font-mono" placeholder='{"token": "your-token"}' value={form.authConfig} onChange={e => setForm({ ...form, authConfig: e.target.value })} />
                </div>
              </details>

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => { setShowForm(false); setSelected(null); }} className="text-gray-700 dark:text-gray-400 text-sm px-3 py-1.5">Cancel</button>
                <button onClick={handleSave} className="bg-purple-700 hover:bg-purple-600 text-white text-sm px-4 py-1.5 rounded">{selected ? 'Update' : 'Create'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <Spinner text="Loading endpoints..." />
      ) : (
        <div className="space-y-3">
          {groupedEndpoints.length === 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 text-center text-gray-500 dark:text-gray-600">
              {searchQuery ? 'No endpoints match your search' : 'No endpoints yet'}
            </div>
          )}
          {groupedEndpoints.map(group => {
            const collectionId = group.collection ? group.collection.id : 'uncategorized';
            const isExpanded = expandedCollections.has(collectionId);
            const collectionName = group.collection ? group.collection.name : 'Uncategorized';
            const allInGroupSelected = group.endpoints.every(ep => selectedIds.has(ep.id));
            const someInGroupSelected = group.endpoints.some(ep => selectedIds.has(ep.id));

            return (
              <div key={String(collectionId)} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div
                  className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => toggleCollection(collectionId)}
                >
                  <input
                    type="checkbox"
                    checked={allInGroupSelected}
                    ref={el => { if (el) el.indeterminate = someInGroupSelected && !allInGroupSelected; }}
                    onChange={(e) => { e.stopPropagation(); toggleSelectCollection(group.endpoints); }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{collectionName}</span>
                  <span className="text-xs text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/50 px-2 py-0.5 rounded font-medium">
                    {group.endpoints.length} endpoint{group.endpoints.length !== 1 ? 's' : ''}
                  </span>
                  {group.collection && (() => {
                    const colSchedule = scheduleMap.get(group.collection!.id);
                    return colSchedule ? (
                      <span className={`text-xs px-2 py-0.5 rounded border ${colSchedule.isEnabled ? 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/50 dark:text-teal-400 dark:border-teal-700' : 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:border-gray-700'}`}>
                        ⏱ {formatInterval(colSchedule.intervalSeconds)}
                      </span>
                    ) : null;
                  })()}
                  <div className="ml-auto flex items-center gap-1">
                    {group.collection && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRunCollection(group.collection!.id); }}
                        className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 text-xs font-medium px-2 py-1"
                      >
                        Run
                      </button>
                    )}
                    {group.collection && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleOpenScheduleModal(group.collection!); }}
                        className="text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 text-xs font-medium px-2 py-1"
                      >
                        {scheduleMap.get(group.collection.id) ? 'Edit Schedule' : '+ Schedule'}
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleBulkDeleteGroup(group.endpoints); }}
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-xs font-medium px-2 py-1"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {isExpanded && (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-800 text-left text-gray-700 dark:text-gray-400">
                        <th className="p-3 w-8"></th>
                        <th className="p-3">Name</th>
                        <th className="p-3">Method</th>
                        <th className="p-3">URL</th>
                        <th className="p-3">Auth</th>
                        <th className="p-3">Validation</th>
                        <th className="p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.endpoints.map(ep => {
                        const rules = validationMap.get(ep.id) || [];
                        return (
                          <tr key={ep.id} className="border-b border-gray-200 dark:border-gray-800/50 hover:bg-gray-100/50 dark:hover:bg-gray-800/30">
                            <td className="p-3">
                              <input type="checkbox" checked={selectedIds.has(ep.id)} onChange={() => toggleSelect(ep.id)} />
                            </td>
                            <td className="p-3 cursor-pointer text-gray-900 dark:text-gray-100" onClick={() => handleEdit(ep)}>{ep.name}</td>
                            <td className="p-3">
                              <span className={`text-xs px-2 py-0.5 rounded border ${methodBadgeClass(ep.method)}`}>{ep.method}</span>
                            </td>
                            <td className="p-3 text-gray-700 dark:text-gray-400 truncate max-w-64">{ep.url}</td>
                            <td className="p-3 text-gray-600 dark:text-gray-500">{ep.authType || 'None'}</td>
                            <td className="p-3 text-gray-600 dark:text-gray-500">
                              {rules.length > 0 ? (
                                <span className="text-xs px-2 py-0.5 rounded border bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/50 dark:text-orange-400 dark:border-orange-700">
                                  {rules.length} rule{rules.length !== 1 ? 's' : ''}
                                </span>
                              ) : ''}
                            </td>
                            <td className="p-3 flex gap-2">
                              <button onClick={() => handleRun(ep.id)} className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 text-xs font-medium">Run</button>
                              <button onClick={() => handleEdit(ep)} className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-xs font-medium">Edit</button>
                              <button onClick={() => handleOpenValidationModal(ep)} className="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 text-xs font-medium">Validation</button>
                              <button onClick={() => handleDelete(ep.id)} className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-xs font-medium">Del</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      )}
      <ConfirmDialog state={confirmState} />

      {showScheduleModal && scheduleCollection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-xl p-6 w-96 max-w-[90vw]">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Schedule: {scheduleCollection.name}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Interval (seconds)</label>
                <input
                  type="number"
                  min={1}
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm"
                  value={scheduleForm.intervalSeconds}
                  onChange={e => setScheduleForm({ ...scheduleForm, intervalSeconds: Number(e.target.value) })}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="scheduleEnabled"
                  checked={scheduleForm.isEnabled}
                  onChange={e => setScheduleForm({ ...scheduleForm, isEnabled: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="scheduleEnabled" className="text-sm text-gray-700 dark:text-gray-300">Enabled</label>
              </div>
              {scheduleMap.get(scheduleCollection.id) && (
                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                  <div>Last Run: {scheduleMap.get(scheduleCollection.id)!.lastRunAt ? new Date(scheduleMap.get(scheduleCollection.id)!.lastRunAt!).toLocaleString() : 'Never'}</div>
                  <div>Next Run: {scheduleMap.get(scheduleCollection.id)!.nextRunAt ? new Date(scheduleMap.get(scheduleCollection.id)!.nextRunAt!).toLocaleString() : 'Never'}</div>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => { setShowScheduleModal(false); setScheduleCollection(null); }}
                  className="text-gray-700 dark:text-gray-400 text-sm px-3 py-1.5"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSchedule}
                  className="bg-purple-700 hover:bg-purple-600 text-white text-sm px-4 py-1.5 rounded"
                >
                  {scheduleMap.get(scheduleCollection.id) ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showValidationModal && validationEndpoint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-xl p-6 w-[500px] max-w-[90vw] max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Validation Rules: {validationEndpoint.name}
            </h3>
            
            {/* Existing Rules List */}
            {(validationMap.get(validationEndpoint.id) || []).length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Existing Rules</h4>
                <div className="space-y-2">
                  {(validationMap.get(validationEndpoint.id) || []).map(rule => (
                    <div
                      key={rule.id}
                      className={`p-3 rounded border ${
                        editingRule?.id === rule.id
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {rule.ruleType} {rule.comparisonType} {rule.expectedValue}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Order: {rule.order} | {rule.isEnabled ? 'Enabled' : 'Disabled'}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditValidationRule(rule)}
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-xs font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteValidationRule(rule.id)}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-xs font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add/Edit Rule Form */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {editingRule ? 'Edit Rule' : 'Add New Rule'}
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Rule Type</label>
                  <select
                    className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm"
                    value={validationForm.ruleType}
                    onChange={e => setValidationForm({ ...validationForm, ruleType: e.target.value })}
                  >
                    <option value="StatusCode">Status Code</option>
                    <option value="ResponseTime">Response Time</option>
                    <option value="JsonPath">JSON Path</option>
                    <option value="BodyContains">Body Contains</option>
                    <option value="HeaderExists">Header Exists</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Comparison</label>
                  <select
                    className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm"
                    value={validationForm.comparisonType}
                    onChange={e => setValidationForm({ ...validationForm, comparisonType: e.target.value })}
                  >
                    <option value="Equals">Equals</option>
                    <option value="NotEquals">Not Equals</option>
                    <option value="GreaterThan">Greater Than</option>
                    <option value="LessThan">Less Than</option>
                    <option value="Contains">Contains</option>
                    <option value="NotContains">Not Contains</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Expected Value</label>
                  <input
                    type="text"
                    className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm"
                    value={validationForm.expectedValue}
                    onChange={e => setValidationForm({ ...validationForm, expectedValue: e.target.value })}
                    placeholder={validationForm.ruleType === 'JsonPath' ? '$.data.status' : '200'}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Order</label>
                  <input
                    type="number"
                    min={0}
                    className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm"
                    value={validationForm.order}
                    onChange={e => setValidationForm({ ...validationForm, order: Number(e.target.value) })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="validationEnabled"
                    checked={validationForm.isEnabled}
                    onChange={e => setValidationForm({ ...validationForm, isEnabled: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="validationEnabled" className="text-sm text-gray-700 dark:text-gray-300">Enabled</label>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  {editingRule && (
                    <button
                      onClick={() => {
                        setEditingRule(null);
                        setValidationForm({ ruleType: 'StatusCode', expectedValue: '200', comparisonType: 'Equals', order: 0, isEnabled: true });
                      }}
                      className="text-gray-700 dark:text-gray-400 text-sm px-3 py-1.5"
                    >
                      Cancel Edit
                    </button>
                  )}
                  <button
                    onClick={() => { setShowValidationModal(false); setValidationEndpoint(null); setEditingRule(null); }}
                    className="text-gray-700 dark:text-gray-400 text-sm px-3 py-1.5"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleSaveValidationRule}
                    className="bg-purple-700 hover:bg-purple-600 text-white text-sm px-4 py-1.5 rounded"
                  >
                    {editingRule ? 'Update Rule' : 'Add Rule'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

