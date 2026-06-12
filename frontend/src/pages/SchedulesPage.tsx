import { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { Schedule, ApiEndpoint } from '../types';
import Spinner from '../components/Spinner';
import { useToast } from '../ToastContext';
import { useConfirmDialog, ConfirmDialog } from '../components/ConfirmDialog';

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState<number>(0);
  const [intervalSeconds, setIntervalSeconds] = useState(60);
  const { showToast } = useToast();
  const { confirm: confirmDialog, state: confirmState } = useConfirmDialog();

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [sch, eps] = await Promise.all([api.getSchedules(), api.getEndpoints()]);
      setSchedules(Array.isArray(sch) ? sch : []);
      setEndpoints(Array.isArray(eps) ? eps : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!selectedEndpoint) return;
    try {
      await api.createSchedule(selectedEndpoint, { intervalSeconds, isEnabled: true });
      showToast('Schedule created successfully', 'success');
      setShowForm(false);
      loadAll();
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Failed to create schedule', 'error');
    }
  };

  const handleToggle = async (sch: Schedule) => {
    try {
      await api.updateSchedule(sch.id, { isEnabled: !sch.isEnabled });
      showToast(`Schedule ${sch.isEnabled ? 'disabled' : 'enabled'}`, 'success');
      loadAll();
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Failed to update schedule', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirmDialog('Delete this schedule?', 'Confirm Delete', { confirmText: 'Delete', cancelText: 'Cancel', variant: 'danger' });
    if (!confirmed) return;
    try {
      await api.deleteSchedule(id);
      showToast('Schedule deleted successfully', 'success');
      loadAll();
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Failed to delete schedule', 'error');
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Schedules</h2>
        <button onClick={() => setShowForm(!showForm)} className="bg-purple-700 hover:bg-purple-600 text-white text-sm px-3 py-1.5 rounded">
          + New Schedule
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Create Schedule</h3>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs text-gray-600 dark:text-gray-500 block mb-1">Endpoint</label>
              <select className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm" value={selectedEndpoint} onChange={e => setSelectedEndpoint(Number(e.target.value))}>
                <option value={0}>Select endpoint...</option>
                {endpoints.map(ep => <option key={ep.id} value={ep.id}>{ep.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-500 block mb-1">Interval (seconds)</label>
              <input className="w-32 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm" type="number" min={1} value={intervalSeconds} onChange={e => setIntervalSeconds(Number(e.target.value))} />
            </div>
            <button onClick={handleCreate} className="bg-purple-700 hover:bg-purple-600 text-white text-sm px-4 py-1.5 rounded">Create</button>
            <button onClick={() => setShowForm(false)} className="text-gray-700 dark:text-gray-400 text-sm px-3 py-1.5">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <Spinner text="Loading schedules..." />
      ) : <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800 text-left text-gray-700 dark:text-gray-400">
              <th className="p-3">Endpoint</th>
              <th className="p-3">Interval</th>
              <th className="p-3">Status</th>
              <th className="p-3">Last Run</th>
              <th className="p-3">Next Run</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {schedules.map(sch => (
              <tr key={sch.id} className="border-b border-gray-200 dark:border-gray-800/50 hover:bg-gray-100/50 dark:hover:bg-gray-800/30">
                <td className="p-3">{sch.apiEndpoint?.name || `#${sch.apiEndpointId}`}</td>
                <td className="p-3 text-gray-700 dark:text-gray-400">{formatDuration(sch.intervalSeconds)}</td>
                <td className="p-3">
                  <button onClick={() => handleToggle(sch)} className={`text-xs px-2 py-0.5 rounded ${sch.isEnabled ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-500'}`}>
                    {sch.isEnabled ? 'On' : 'Off'}
                  </button>
                </td>
                <td className="p-3 text-gray-600 dark:text-gray-500 text-xs">{sch.lastRunAt ? new Date(sch.lastRunAt).toLocaleString() : 'Never'}</td>
                <td className="p-3 text-gray-600 dark:text-gray-500 text-xs">{new Date(sch.nextRunAt).toLocaleString()}</td>
                <td className="p-3">
                  <button onClick={() => handleDelete(sch.id)} className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-xs font-medium">Delete</button>
                </td>
              </tr>
            ))}
            {schedules.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-gray-500 dark:text-gray-600">No schedules yet</td></tr>
            )}
          </tbody>
        </table>
      </div>}
      <ConfirmDialog state={confirmState} />
    </div>
  );
}
