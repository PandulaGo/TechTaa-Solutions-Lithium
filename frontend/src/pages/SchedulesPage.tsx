import { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';
import type { Schedule } from '../types';
import Spinner from '../components/Spinner';
import { useToast } from '../ToastContext';
import { useConfirmDialog, ConfirmDialog } from '../components/ConfirmDialog';

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { showToast } = useToast();
  const { confirm: confirmDialog, state: confirmState } = useConfirmDialog();

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const sch = await api.getSchedules();
      setSchedules(Array.isArray(sch) ? sch : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filteredSchedules = useMemo(() => {
    if (!searchQuery) return schedules;
    const query = searchQuery.toLowerCase();
    return schedules.filter(sch =>
      sch.apiEndpoint?.name.toLowerCase().includes(query) ||
      String(sch.intervalSeconds).includes(query) ||
      (sch.isEnabled ? 'on' : 'off').includes(query)
    );
  }, [schedules, searchQuery]);

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
      </div>

      <div className="relative">
        <input
          type="text"
          placeholder="Search schedules by endpoint name, interval..."
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
        <Spinner text="Loading schedules..." />
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
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
              {filteredSchedules.map(sch => (
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
              {filteredSchedules.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-gray-500 dark:text-gray-600">
                  {searchQuery ? 'No schedules match your search' : 'No schedules yet'}
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
