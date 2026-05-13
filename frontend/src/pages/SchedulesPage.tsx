import { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { Schedule, ApiEndpoint } from '../types';

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState<number>(0);
  const [intervalSeconds, setIntervalSeconds] = useState(60);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [sch, eps] = await Promise.all([api.getSchedules(), api.getEndpoints()]);
      setSchedules(Array.isArray(sch) ? sch : []);
      setEndpoints(Array.isArray(eps) ? eps : []);
    } catch (e) { console.error(e); }
  };

  const handleCreate = async () => {
    if (!selectedEndpoint) return;
    await api.createSchedule(selectedEndpoint, { intervalSeconds, isEnabled: true });
    setShowForm(false);
    loadAll();
  };

  const handleToggle = async (sch: Schedule) => {
    await api.updateSchedule(sch.id, { isEnabled: !sch.isEnabled });
    loadAll();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this schedule?')) return;
    await api.deleteSchedule(id);
    loadAll();
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-100">Schedules</h2>
        <button onClick={() => setShowForm(!showForm)} className="bg-purple-700 hover:bg-purple-600 text-white text-sm px-3 py-1.5 rounded">
          + New Schedule
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-300">Create Schedule</h3>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs text-gray-500 block mb-1">Endpoint</label>
              <select className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm" value={selectedEndpoint} onChange={e => setSelectedEndpoint(Number(e.target.value))}>
                <option value={0}>Select endpoint...</option>
                {endpoints.map(ep => <option key={ep.id} value={ep.id}>{ep.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Interval (seconds)</label>
              <input className="w-32 bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm" type="number" min={1} value={intervalSeconds} onChange={e => setIntervalSeconds(Number(e.target.value))} />
            </div>
            <button onClick={handleCreate} className="bg-purple-700 hover:bg-purple-600 text-white text-sm px-4 py-1.5 rounded">Create</button>
            <button onClick={() => setShowForm(false)} className="text-gray-400 text-sm px-3 py-1.5">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left text-gray-400">
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
              <tr key={sch.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="p-3">{sch.apiEndpoint?.name || `#${sch.apiEndpointId}`}</td>
                <td className="p-3 text-gray-400">{formatDuration(sch.intervalSeconds)}</td>
                <td className="p-3">
                  <button onClick={() => handleToggle(sch)} className={`text-xs px-2 py-0.5 rounded ${sch.isEnabled ? 'bg-green-900/50 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                    {sch.isEnabled ? 'On' : 'Off'}
                  </button>
                </td>
                <td className="p-3 text-gray-500 text-xs">{sch.lastRunAt ? new Date(sch.lastRunAt).toLocaleString() : 'Never'}</td>
                <td className="p-3 text-gray-500 text-xs">{new Date(sch.nextRunAt).toLocaleString()}</td>
                <td className="p-3">
                  <button onClick={() => handleDelete(sch.id)} className="text-red-400 hover:text-red-300 text-xs">Delete</button>
                </td>
              </tr>
            ))}
            {schedules.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-gray-600">No schedules yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
