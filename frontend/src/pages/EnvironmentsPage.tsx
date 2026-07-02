import { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { Environment, EnvironmentVariable } from '../types';
import Spinner from '../components/Spinner';
import { useToast } from '../ToastContext';
import { useConfirmDialog, ConfirmDialog } from '../components/ConfirmDialog';

export default function EnvironmentsPage() {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Environment | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [expandedEnvs, setExpandedEnvs] = useState<Set<number>>(new Set());
  const [varForm, setVarForm] = useState<{ [envId: number]: { key: string; value: string } }>({});
  const [editingVar, setEditingVar] = useState<{ envId: number; varId: number } | null>(null);
  const { showToast } = useToast();
  const { confirm: confirmDialog, state: confirmState } = useConfirmDialog();

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const envs = await api.getEnvironments();
      const envsWithVars = await Promise.all(
        (Array.isArray(envs) ? envs : []).map(async (env: Environment) => {
          const vars = await api.getEnvironmentVariables(env.id);
          return { ...env, variables: Array.isArray(vars) ? vars : [] };
        })
      );
      setEnvironments(envsWithVars);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    try {
      if (selected) {
        await api.updateEnvironment(selected.id, form);
        showToast('Environment updated successfully', 'success');
      } else {
        await api.createEnvironment(form);
        showToast('Environment created successfully', 'success');
      }
      setShowForm(false);
      setSelected(null);
      setForm({ name: '', description: '' });
      loadAll();
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Failed to save environment', 'error');
    }
  };

  const handleEdit = (env: Environment) => {
    setSelected(env);
    setForm({ name: env.name, description: env.description || '' });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirmDialog('Delete this environment and all its variables?', 'Confirm Delete', { confirmText: 'Delete', cancelText: 'Cancel', variant: 'danger' });
    if (!confirmed) return;
    try {
      await api.deleteEnvironment(id);
      showToast('Environment deleted successfully', 'success');
      loadAll();
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Failed to delete environment', 'error');
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      await api.setEnvironmentDefault(id);
      showToast('Default environment updated', 'success');
      loadAll();
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Failed to set default', 'error');
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedEnvs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const getVarForm = (envId: number) => varForm[envId] || { key: '', value: '' };
  const setVarFormForEnv = (envId: number, data: { key: string; value: string }) => {
    setVarForm(prev => ({ ...prev, [envId]: data }));
  };

  const handleAddVariable = async (envId: number) => {
    const vf = getVarForm(envId);
    if (!vf.key.trim()) return;
    try {
      if (editingVar && editingVar.envId === envId) {
        await api.updateEnvironmentVariable(envId, editingVar.varId, { key: vf.key, value: vf.value });
        showToast('Variable updated', 'success');
        setEditingVar(null);
      } else {
        await api.createEnvironmentVariable(envId, { key: vf.key, value: vf.value });
        showToast('Variable added', 'success');
      }
      setVarFormForEnv(envId, { key: '', value: '' });
      loadAll();
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Failed to save variable', 'error');
    }
  };

  const handleEditVariable = (envId: number, variable: EnvironmentVariable) => {
    setEditingVar({ envId, varId: variable.id });
    setVarFormForEnv(envId, { key: variable.key, value: variable.value });
  };

  const handleDeleteVariable = async (envId: number, varId: number) => {
    const confirmed = await confirmDialog('Delete this variable?', 'Confirm Delete', { confirmText: 'Delete', cancelText: 'Cancel', variant: 'danger' });
    if (!confirmed) return;
    try {
      await api.deleteEnvironmentVariable(envId, varId);
      showToast('Variable deleted', 'success');
      if (editingVar && editingVar.varId === varId) {
        setEditingVar(null);
        setVarFormForEnv(envId, { key: '', value: '' });
      }
      loadAll();
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Failed to delete variable', 'error');
    }
  };

  const cancelVarEdit = (envId: number) => {
    setEditingVar(null);
    setVarFormForEnv(envId, { key: '', value: '' });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Environments</h2>
        <button onClick={() => { setSelected(null); setForm({ name: '', description: '' }); setShowForm(!showForm); }} className="bg-purple-700 hover:bg-purple-600 text-white text-sm px-3 py-1.5 rounded">
          + New Environment
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-xl p-6 w-96 max-w-[90vw]">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {selected ? 'Edit' : 'Create'} Environment
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Name</label>
                <input className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm" placeholder="e.g. Production, Staging, Dev" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Description</label>
                <input className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm" placeholder="Optional description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => { setShowForm(false); setSelected(null); }} className="text-gray-700 dark:text-gray-400 text-sm px-3 py-1.5">Cancel</button>
                <button onClick={handleSave} className="bg-purple-700 hover:bg-purple-600 text-white text-sm px-4 py-1.5 rounded">{selected ? 'Update' : 'Create'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Use <code className="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-purple-600 dark:text-purple-400 font-mono">{`{{variable_name}}`}</code> syntax in endpoint URLs, headers, body, and auth config to reference environment variables.
        </p>
      </div>

      {loading ? (
        <Spinner text="Loading environments..." />
      ) : (
        <div className="space-y-3">
          {environments.length === 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 text-center text-gray-500 dark:text-gray-600">
              No environments yet. Create one to start using variables.
            </div>
          )}
          {environments.map(env => {
            const isExpanded = expandedEnvs.has(env.id);
            const vf = getVarForm(env.id);
            const isEditing = editingVar?.envId === env.id;

            return (
              <div key={env.id} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div
                  className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => toggleExpand(env.id)}
                >
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{env.name}</span>
                  {env.isDefault && (
                    <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">Default</span>
                  )}
                  <span className="text-xs text-gray-500 dark:text-gray-500 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">
                    {env.variables?.length || 0} variable{(env.variables?.length || 0) !== 1 ? 's' : ''}
                  </span>
                  <div className="ml-auto flex gap-2" onClick={e => e.stopPropagation()}>
                    {!env.isDefault && (
                      <button onClick={() => handleSetDefault(env.id)} className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 text-xs font-medium">Set Default</button>
                    )}
                    <button onClick={() => handleEdit(env)} className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-xs font-medium">Edit</button>
                    <button onClick={() => handleDelete(env.id)} className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-xs font-medium">Del</button>
                  </div>
                </div>
                {isExpanded && (
                  <div className="p-4 space-y-3">
                    {env.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">{env.description}</p>
                    )}

                    {(env.variables?.length || 0) > 0 && (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-800 text-left text-gray-700 dark:text-gray-400">
                            <th className="p-2">Key</th>
                            <th className="p-2">Value</th>
                            <th className="p-2 w-20">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {env.variables?.map(v => (
                            <tr key={v.id} className="border-b border-gray-200 dark:border-gray-800/50">
                              <td className="p-2 font-mono text-xs text-gray-900 dark:text-gray-100">{`{{${v.key}}}`}</td>
                              <td className="p-2 font-mono text-xs text-gray-700 dark:text-gray-400 truncate max-w-xs">{v.value}</td>
                              <td className="p-2 flex gap-2">
                                <button onClick={() => handleEditVariable(env.id, v)} className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-xs font-medium">Edit</button>
                                <button onClick={() => handleDeleteVariable(env.id, v.id)} className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-xs font-medium">Del</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Key</label>
                        <input
                          className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm font-mono"
                          placeholder="variable_name"
                          value={vf.key}
                          onChange={e => setVarFormForEnv(env.id, { ...vf, key: e.target.value })}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Value</label>
                        <input
                          className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm font-mono"
                          placeholder="variable value"
                          value={vf.value}
                          onChange={e => setVarFormForEnv(env.id, { ...vf, value: e.target.value })}
                        />
                      </div>
                      <button onClick={() => handleAddVariable(env.id)} className="bg-purple-700 hover:bg-purple-600 text-white text-sm px-3 py-1.5 rounded">
                        {isEditing ? 'Update' : 'Add'}
                      </button>
                      {isEditing && (
                        <button onClick={() => cancelVarEdit(env.id)} className="text-gray-700 dark:text-gray-400 text-sm px-3 py-1.5">
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <ConfirmDialog state={confirmState} />
    </div>
  );
}
