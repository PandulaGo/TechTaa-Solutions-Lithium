const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // Endpoints
  getEndpoints: (collectionId?: number) =>
    request<any[]>(`/endpoints${collectionId ? `?collectionId=${collectionId}` : ''}`),

  getEndpoint: (id: number) => request<any>(`/endpoints/${id}`),

  createEndpoint: (data: any) =>
    request<any>('/endpoints', { method: 'POST', body: JSON.stringify(data) }),

  updateEndpoint: (id: number, data: any) =>
    request<any>(`/endpoints/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteEndpoint: (id: number) =>
    request<void>(`/endpoints/${id}`, { method: 'DELETE' }),

  batchDeleteEndpoints: (ids: number[]) =>
    request<{ deleted: number }>('/endpoints/batch-delete', { method: 'POST', body: JSON.stringify({ ids }) }),

  runEndpoint: (id: number, environmentId?: number) =>
    request<any>(`/endpoints/${id}/run`, { method: 'POST', body: JSON.stringify({ environmentId }) }),

  bulkRun: (endpointIds: number[], environmentId?: number) =>
    request<{ runId: number }>('/endpoints/bulk-run', { method: 'POST', body: JSON.stringify({ endpointIds, environmentId }) }),

  exportEndpoints: (ids: number[]) =>
    request<any>(`/endpoints/export?ids=${ids.join(',')}`),

  importEndpoints: (data: any) =>
    request<any>('/endpoints/import', { method: 'POST', body: JSON.stringify(data) }),

  importAndRun: (data: any, environmentId?: number) =>
    request<{ runId: number; imported: number }>('/endpoints/import-and-run', { method: 'POST', body: JSON.stringify({ data, environmentId }) }),

  // Collections
  getCollections: () => request<any[]>('/collections'),

  getCollection: (id: number) => request<any>(`/collections/${id}`),

  createCollection: (data: any) =>
    request<any>('/collections', { method: 'POST', body: JSON.stringify(data) }),

  updateCollection: (id: number, data: any) =>
    request<any>(`/collections/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteCollection: (id: number, cascade?: boolean) =>
    request<void>(`/collections/${id}${cascade ? '?cascade=true' : ''}`, { method: 'DELETE' }),

  // Schedules
  getSchedules: (collectionId?: number) =>
    request<any[]>(`/schedules${collectionId ? `?collectionId=${collectionId}` : ''}`),

  createSchedule: (collectionId: number, data: any) =>
    request<any>(`/schedules?collectionId=${collectionId}`, { method: 'POST', body: JSON.stringify(data) }),

  updateSchedule: (id: number, data: any) =>
    request<any>(`/schedules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteSchedule: (id: number) =>
    request<void>(`/schedules/${id}`, { method: 'DELETE' }),

  // Validation Rules
  getValidationRules: (endpointId?: number) =>
    request<any[]>(`/validation-rules${endpointId ? `?endpointId=${endpointId}` : ''}`),

  createValidationRule: (endpointId: number, data: any) =>
    request<any>(`/validation-rules?endpointId=${endpointId}`, { method: 'POST', body: JSON.stringify(data) }),

  updateValidationRule: (id: number, data: any) =>
    request<any>(`/validation-rules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteValidationRule: (id: number) =>
    request<void>(`/validation-rules/${id}`, { method: 'DELETE' }),

  // Collection Runs
  runCollection: (id: number, environmentId?: number) =>
    request<{ runId: number }>(`/collections/${id}/run`, { method: 'POST', body: JSON.stringify({ environmentId }) }),

  getCollectionRun: (id: number) =>
    request<any>(`/collection-runs/${id}`),

  getCollectionRuns: () =>
    request<any[]>('/collection-runs'),

  exportCollectionRunResponses: async (runId: number) => {
    const res = await fetch(`${API_BASE}/collection-runs/${runId}/export-responses`);
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `collection-run-${runId}-responses.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  },

  // Results & Dashboard
  getResults: (params?: { collectionId?: number; endpointId?: number; page?: number; pageSize?: number; isSuccess?: boolean; from?: string; to?: string }) => {
    const sp = new URLSearchParams();
    if (params?.collectionId) sp.set('collectionId', String(params.collectionId));
    if (params?.endpointId) sp.set('endpointId', String(params.endpointId));
    if (params?.page) sp.set('page', String(params.page));
    if (params?.pageSize) sp.set('pageSize', String(params.pageSize));
    if (params?.isSuccess !== undefined) sp.set('isSuccess', String(params.isSuccess));
    if (params?.from) sp.set('from', params.from);
    if (params?.to) sp.set('to', params.to);
    const qs = sp.toString();
    return request<any[]>(`/results${qs ? '?' + qs : ''}`);
  },

  getResult: (id: number) => request<any>(`/results/${id}`),

  getDashboard: () => request<any>('/dashboard'),

  // Environments
  getEnvironments: () => request<any[]>('/environments'),

  getEnvironment: (id: number) => request<any>(`/environments/${id}`),

  createEnvironment: (data: any) =>
    request<any>('/environments', { method: 'POST', body: JSON.stringify(data) }),

  updateEnvironment: (id: number, data: any) =>
    request<any>(`/environments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteEnvironment: (id: number) =>
    request<void>(`/environments/${id}`, { method: 'DELETE' }),

  setEnvironmentDefault: (id: number) =>
    request<any>(`/environments/${id}/set-default`, { method: 'PUT' }),

  getEnvironmentVariables: (environmentId: number) =>
    request<any[]>(`/environments/${environmentId}/variables`),

  createEnvironmentVariable: (environmentId: number, data: any) =>
    request<any>(`/environments/${environmentId}/variables`, { method: 'POST', body: JSON.stringify(data) }),

  updateEnvironmentVariable: (environmentId: number, varId: number, data: any) =>
    request<any>(`/environments/${environmentId}/variables/${varId}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteEnvironmentVariable: (environmentId: number, varId: number) =>
    request<void>(`/environments/${environmentId}/variables/${varId}`, { method: 'DELETE' }),

  // Scheduler
  getSchedulerStatus: () => request<{ running: boolean }>('/scheduler/status'),
  startScheduler: () => request<{ running: boolean }>('/scheduler/start', { method: 'POST' }),
  stopScheduler: () => request<{ running: boolean }>('/scheduler/stop', { method: 'POST' }),
};
