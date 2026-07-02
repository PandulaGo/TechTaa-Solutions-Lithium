import { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';
import type { ValidationRule } from '../types';
import Spinner from '../components/Spinner';
import { useToast } from '../ToastContext';
import { useConfirmDialog, ConfirmDialog } from '../components/ConfirmDialog';

export default function ValidationRulesPage() {
  const [rules, setRules] = useState<ValidationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { showToast } = useToast();
  const { confirm: confirmDialog, state: confirmState } = useConfirmDialog();

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const rls = await api.getValidationRules();
      setRules(Array.isArray(rls) ? rls : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filteredRules = useMemo(() => {
    if (!searchQuery) return rules;
    const query = searchQuery.toLowerCase();
    return rules.filter(rule =>
      rule.ruleType.toLowerCase().includes(query) ||
      rule.expectedValue.toLowerCase().includes(query) ||
      rule.comparisonType.toLowerCase().includes(query) ||
      (rule.isEnabled ? 'on' : 'off').includes(query) ||
      rule.apiEndpoint?.name.toLowerCase().includes(query)
    );
  }, [rules, searchQuery]);

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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Validation Rules</h2>
      </div>

      <div className="relative">
        <input
          type="text"
          placeholder="Search rules by endpoint name, type, expected value..."
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

      {loading ? (
        <Spinner text="Loading rules..." />
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 text-left text-gray-700 dark:text-gray-400">
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
              {filteredRules.map(rule => (
                <tr key={rule.id} className="border-b border-gray-200 dark:border-gray-800/50 hover:bg-gray-100/50 dark:hover:bg-gray-800/30">
                  <td className="p-3 text-gray-700 dark:text-gray-400">{rule.apiEndpoint?.name || `#${rule.apiEndpointId}`}</td>
                  <td className="p-3">{rule.ruleType}</td>
                  <td className="p-3 text-gray-700 dark:text-gray-400 font-mono text-xs truncate max-w-[200px]" title={rule.expectedValue}>{rule.expectedValue}</td>
                  <td className="p-3 text-gray-700 dark:text-gray-400">{rule.comparisonType}</td>
                  <td className="p-3 text-gray-700 dark:text-gray-400">{rule.order}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${rule.isEnabled ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-500'}`}>
                      {rule.isEnabled ? 'On' : 'Off'}
                    </span>
                  </td>
                  <td className="p-3">
                    <button onClick={() => handleDelete(rule.id)} className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-xs font-medium">Delete</button>
                  </td>
                </tr>
              ))}
              {filteredRules.length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-gray-500 dark:text-gray-600">
                  {searchQuery ? 'No rules match your search' : 'No validation rules yet'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog state={confirmState} />
    </div>
  );
}
