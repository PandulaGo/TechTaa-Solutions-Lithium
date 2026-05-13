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
  schedules?: Schedule[];
  validationRules?: ValidationRule[];
}

export interface Schedule {
  id: number;
  apiEndpointId: number;
  isEnabled: boolean;
  intervalSeconds: number;
  lastRunAt: string | null;
  nextRunAt: string;
  createdAt: string;
  updatedAt: string;
  apiEndpoint?: ApiEndpoint;
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

export interface KeyValue {
  key: string;
  value: string;
}

export interface ExportedEndpoint {
  name: string;
  description: string | null;
  method: string;
  url: string;
  headers: string | null;
  body: string | null;
  bodyType: string | null;
  authType: string | null;
  authConfig: string | null;
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
