export interface Collection {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  endpoints?: ApiEndpoint[];
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
  authType: string | null;
  authConfig: string | null;
  createdAt: string;
  updatedAt: string;
  collection?: Collection | null;
  validationRules?: ValidationRule[];
}

export interface Schedule {
  id: number;
  collectionId: number;
  isEnabled: boolean;
  intervalSeconds: number;
  lastRunAt: string | null;
  nextRunAt: string;
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
  requestUrl: string | null;
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
  apiEndpoint?: Pick<ApiEndpoint, 'id' | 'name'>;
}

export interface DashboardStats {
  totalEndpoints: number;
  passCount: number;
  failCount: number;
  averageLatencyMs: number;
  totalSchedules: number;
  totalValidationRules: number;
}

export interface KeyValue {
  key: string;
  value: string;
}

export interface ExportedEndpoint {
  name: string;
  description: string | null;
  method: string;
  url: string;
  headers: string | object | null;
  body: string | object | null;
  bodyType: string | null;
  authType: string | null;
  authConfig: string | object | null;
  collectionName: string | null;
  schedule: ExportedSchedule | null;
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

export interface ExportPayload {
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
