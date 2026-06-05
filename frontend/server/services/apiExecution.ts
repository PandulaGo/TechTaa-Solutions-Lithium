import type { ApiEndpoint, ExecutionResult } from '../types';

function buildAuthHeaders(endpoint: ApiEndpoint): Record<string, string> {
  const headers: Record<string, string> = {};
  const config = endpoint.authConfig ? (() => { try { return JSON.parse(endpoint.authConfig); } catch { return {}; } })() : {};

  switch (endpoint.authType) {
    case 'Bearer':
      headers['Authorization'] = `Bearer ${config.token || ''}`;
      break;
    case 'Basic': {
      const user = config.username || '';
      const pass = config.password || '';
      headers['Authorization'] = `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
      break;
    }
    case 'ApiKey':
      if (config.placement === 'Query') {
        break;
      }
      headers[config.key || 'X-API-Key'] = config.value || '';
      break;
    case 'OAuth2':
      headers['Authorization'] = `Bearer ${config.access_token || ''}`;
      break;
  }
  return headers;
}

function buildRequestHeaders(endpoint: ApiEndpoint): Record<string, string> {
  const headers: Record<string, string> = {};

  if (endpoint.headers) {
    try {
      const parsed = JSON.parse(endpoint.headers);
      for (const [k, v] of Object.entries(parsed)) {
        headers[k] = String(v);
      }
    } catch { /* ignore invalid JSON */ }
  }

  if (endpoint.body && endpoint.bodyType) {
    const contentTypes: Record<string, string> = {
      'json': 'application/json',
      'form-data': 'multipart/form-data',
      'urlencoded': 'application/x-www-form-urlencoded',
      'raw': 'text/plain',
    };
    if (contentTypes[endpoint.bodyType] && !headers['Content-Type']) {
      headers['Content-Type'] = contentTypes[endpoint.bodyType];
    }
  }

  const authHeaders = buildAuthHeaders(endpoint);
  Object.assign(headers, authHeaders);

  return headers;
}

function buildUrl(endpoint: ApiEndpoint): string {
  const config = endpoint.authConfig ? (() => { try { return JSON.parse(endpoint.authConfig); } catch { return {}; } })() : {};
  if (endpoint.authType === 'ApiKey' && config.placement === 'Query') {
    const url = new URL(endpoint.url);
    url.searchParams.set(config.key || 'api_key', config.value || '');
    return url.toString();
  }
  return endpoint.url;
}

export async function executeEndpoint(endpoint: ApiEndpoint): Promise<ExecutionResult> {
  const startTime = Date.now();
  const reqHeaders = buildRequestHeaders(endpoint);
  const url = buildUrl(endpoint);
  const reqHeadersStr = JSON.stringify(reqHeaders);

  try {
    const fetchOptions: RequestInit = {
      method: endpoint.method,
      headers: reqHeaders,
    };

    if (endpoint.body && endpoint.method !== 'GET' && endpoint.method !== 'HEAD') {
      fetchOptions.body = endpoint.body;
    }

    const signal = AbortSignal.timeout(30000);
    const response = await fetch(url, { ...fetchOptions, signal });

    const responseTimeMs = Date.now() - startTime;
    const respHeadersStr = JSON.stringify(Object.fromEntries(response.headers.entries()));
    const respBody = await response.text();

    return {
      statusCode: response.status,
      responseTimeMs,
      responseHeaders: respHeadersStr,
      responseBody: respBody,
      requestBody: endpoint.body || undefined,
      requestHeaders: reqHeadersStr,
      isSuccess: true,
    };
  } catch (err: any) {
    return {
      statusCode: 0,
      responseTimeMs: Date.now() - startTime,
      responseHeaders: '{}',
      responseBody: '',
      requestBody: endpoint.body || undefined,
      requestHeaders: reqHeadersStr,
      isSuccess: false,
      errorMessage: err.message || String(err),
    };
  }
}
