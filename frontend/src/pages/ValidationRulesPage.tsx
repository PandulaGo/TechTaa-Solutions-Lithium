import { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { ValidationRule, ApiEndpoint } from '../types';
import Spinner from '../components/Spinner';
import { useToast } from '../ToastContext';
import { useConfirmDialog, ConfirmDialog } from '../components/ConfirmDialog';

export default function ValidationRulesPage() {
  const [rules, setRules] = useState<ValidationRule[]>([]);
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEndpointId, setFilterEndpointId] = useState<number | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ endpointId: 0, ruleType: 'StatusCode', expectedValue: '200', comparisonType: 'Equals', order: 0, isEnabled: true });
  const { showToast } = useToast();
  const { confirm: confirmDialog, state: confirmState } = useConfirmDialog();

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [rls, eps] = await Promise.all([
        api.getValidationRules(filterEndpointId),
        api.getEndpoints(),
      ]);
      setRules(Array.isArray(rls) ? rls : []);
      setEndpoints(Array.isArray(eps) ? eps : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!form.endpointId) return;
    try {
      await api.createValidationRule(form.endpointId, form);
      showToast('Validation rule created successfully', 'success');
      setShowForm(false);
      loadAll();
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Failed to create rule', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirmDialog('Delete this validation rule?', 'Confirm Delete', { confirmText: 'Delete', cancelText: 'Cancel', variant: 'danger' });
    if (!confirmed) return;
    try {
      await api.deleteValidationRule(id);
      showToast('Validation rule deleted successfully', 'success');
      loadAll();
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Failed to delete rule', 'error');
    }
  };

  const ruleTypes = ['StatusCode', 'ResponseTime', 'JsonPath', 'BodyContains', 'HeaderExists'];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Validation Rules</h2>
        <button onClick={() => setShowForm(!showForm)} className="bg-purple-700 hover:bg-purple-600 text-white text-sm px-3 py-1.5 rounded">
          + New Rule
        </button>
      </div>

      <div className="flex gap-2">
        <button onClick={() => { setFilterEndpointId(undefined); setTimeout(loadAll, 0); }} className={`text-xs px-3 py-1 rounded ${!filterEndpointId ? 'bg-purple-900/50 text-purple-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>All</button>
        {endpoints.map(ep => (
          <button key={ep.id} onClick={() => { setFilterEndpointId(ep.id); setTimeout(loadAll, 0); }} className={`text-xs px-3 py-1 rounded ${filterEndpointId === ep.id ? 'bg-purple-900/50 text-purple-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>{ep.name}</button>
        ))}
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Create Rule</h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-500 block mb-1">Endpoint</label>
              <select className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm" value={form.endpointId} onChange={e => setForm({ ...form, endpointId: Number(e.target.value) })}>
                <option value={0}>Select...</option>
                {endpoints.map(ep => <option key={ep.id} value={ep.id}>{ep.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-500 block mb-1">Rule Type</label>
              <select className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm" value={form.ruleType} onChange={e => setForm({ ...form, ruleType: e.target.value })}>
                {ruleTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-500 block mb-1">Comparison</label>
              <select className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm" value={form.comparisonType} onChange={e => setForm({ ...form, comparisonType: e.target.value })}>
                <option>Equals</option>
                <option>NotEquals</option>
                <option>GreaterThan</option>
                <option>LessThan</option>
                <option>Contains</option>
                <option>NotContains</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-500 dark:text-gray-500 block mb-1">Expected Value</label>
              <input className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm" value={form.expectedValue} onChange={e => setForm({ ...form, expectedValue: e.target.value })} />
            </div>
            <div className="w-24">
              <label className="text-xs text-gray-500 dark:text-gray-500 block mb-1">Order</label>
              <input className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm" type="number" value={form.order} onChange={e => setForm({ ...form, order: Number(e.target.value) })} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="bg-purple-700 hover:bg-purple-600 text-white text-sm px-4 py-1.5 rounded">Create</button>
            <button onClick={() => setShowForm(false)} className="text-gray-600 dark:text-gray-400 text-sm px-3 py-1.5">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <Spinner text="Loading rules..." />
      ) : <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800 text-left text-gray-600 dark:text-gray-400">
              <th className="p-3">Endpoint</th>
              <th className="p-3">Type</th>
              <th className="p-3">Expected</th>
              <th className="p-3">Compare</th>
              <th className="p-3">Order</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rules.map(rule => (
              <tr key={rule.id} className="border-b border-gray-200 dark:border-gray-800/50 hover:bg-gray-100/50 dark:hover:bg-gray-800/30">
                <td className="p-3">{endpoints.find(ep => ep.id === rule.apiEndpointId)?.name || `#${rule.apiEndpointId}`}</td>
                <td className="p-3">{rule.ruleType}</td>
                <td className="p-3 text-gray-600 dark:text-gray-400">{rule.expectedValue}</td>
                <td className="p-3 text-gray-600 dark:text-gray-400">{rule.comparisonType}</td>
                <td className="p-3 text-gray-600 dark:text-gray-400">{rule.order}</td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${rule.isEnabled ? 'bg-green-900/50 text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500'}`}>
                    {rule.isEnabled ? 'On' : 'Off'}
                  </span>
                </td>
                <td className="p-3">
                  <button onClick={() => handleDelete(rule.id)} className="text-red-400 hover:text-red-300 text-xs">Delete</button>
                </td>
              </tr>
            ))}
            {rules.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-gray-400 dark:text-gray-600">No rules yet</td></tr>
            )}
          </tbody>
        </table>
      </div>}
      <ConfirmDialog state={confirmState} />
    </div>
  );
}
