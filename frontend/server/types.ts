export interface Collection {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiEndpoint {
  id: number;
  collectionId: number | null;
  name: string;
  description: string | null;
  method: string;
  url: string;
  headers: string | null;
  body: string | null;
  bodyType: string | null;
  authType: string;
  authConfig: string | null;
  createdAt: string;
  updatedAt: string;
  collection?: Collection;
  validationRules?: ValidationRule[];
}

export interface Schedule {
  id: number;
  collectionId: number;
  isEnabled: boolean;
  intervalSeconds: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
  collection?: Collection;
}

export interface ApiResult {
  id: number;
  apiEndpointId: number;
  statusCode: number;
  responseTimeMs: number;
  responseHeaders: string | null;
  responseBody: string | null;
  requestBody: string | null;
  requestHeaders: string | null;
  isSuccess: boolean;
  errorMessage: string | null;
  executedAt: string;
  apiEndpoint?: ApiEndpoint;
}

export interface ValidationRule {
  id: number;
  apiEndpointId: number;
  ruleType: string;
  expectedValue: string;
  comparisonType: string;
  isEnabled: boolean;
  order: number;
}

export interface DashboardStats {
  totalEndpoints: number;
  passCount: number;
  failCount: number;
  averageLatencyMs: number;
}

export interface ExecutionResult {
  statusCode: number;
  responseTimeMs: number;
  responseHeaders: string;
  responseBody: string;
  requestBody?: string;
  requestHeaders?: string;
  requestUrl?: string;
  isSuccess: boolean;
  errorMessage?: string;
}

export interface ExportedEndpoint {
  name: string;
  description: string | null;
  method: string;
  url: string;
  headers: string | object | null;
  body: string | object | null;
  bodyType: string | null;
  authType: string;
  authConfig: string | object | null;
  collectionName: string | null;
  schedule?: ExportedSchedule;
  validationRules: ExportedValidationRule[];
}

export interface ExportedSchedule {
  intervalSeconds: number;
  isEnabled: boolean;
}

export interface ExportedValidationRule {
  ruleType: string;
  expectedValue: string;
  comparisonType: string;
  order: number;
  isEnabled: boolean;
}

export interface ImportPayload {
  endpoints: ExportedEndpoint[];
}

export interface Environment {
  id: number;
  name: string;
  description: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  variables?: EnvironmentVariable[];
}

export interface EnvironmentVariable {
  id: number;
  environmentId: number;
  key: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionRun {
  id: number;
  collectionId: number | null;
  collectionName: string;
  status: 'Running' | 'Completed' | 'Failed';
  totalEndpoints: number;
  completedCount: number;
  successCount: number;
  failCount: number;
  isAdHoc: boolean;
  startedAt: string;
  completedAt: string | null;
  results?: CollectionRunResult[];
}

export interface CollectionRunResult {
  id: number;
  collectionRunId: number;
  apiEndpointId: number;
  endpointName: string;
  statusCode: number;
  responseTimeMs: number;
  isSuccess: boolean;
  errorMessage: string | null;
  status: 'Pending' | 'Running' | 'Completed' | 'Failed';
  executedAt: string | null;
}
