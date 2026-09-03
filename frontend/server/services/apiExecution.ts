import type { ApiEndpoint, ExecutionResult } from '../types';
import https from 'node:https';
import http from 'node:http';
import { interpolateEndpoint } from './variableInterpolation';
import { config } from '../config';

function isLocalhost(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch {
    return false;
  }
}

function fetchLocalhost(urlStr: string, method: string, headers: Record<string, string>, body: string | undefined): Promise<{ status: number; headers: Record<string, string>; body: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    const options: https.RequestOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers,
      rejectUnauthorized: config.Http.AllowSelfSignedForLocalhost,
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const responseHeaders: Record<string, string> = {};
        for (const [k, v] of Object.entries(res.headers)) {
          responseHeaders[k] = Array.isArray(v) ? v.join(', ') : String(v);
        }
        resolve({
          status: res.statusCode || 0,
          headers: responseHeaders,
          body: data,
        });
      });
    });

    req.on('error', (err) => reject(err));
    if (body) req.write(body);
    req.end();
  });
}

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
    const ct = contentTypes[endpoint.bodyType.toLowerCase()];
    if (ct && !headers['Content-Type']) {
      headers['Content-Type'] = ct;
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

export async function executeEndpoint(endpoint: ApiEndpoint, environmentId: number | null = null): Promise<ExecutionResult> {
  const interpolated = interpolateEndpoint(endpoint, environmentId);
  const resolvedEndpoint = { ...endpoint, ...interpolated };

  if (/\{\{[^}]+\}\}/.test(resolvedEndpoint.url)) {
    return {
      statusCode: 0,
      responseTimeMs: 0,
      responseHeaders: '{}',
      responseBody: '',
      isSuccess: false,
      errorMessage: `Unresolved variables in URL: ${resolvedEndpoint.url}. Select an environment with the required variables.`,
    };
  }

  const startTime = Date.now();
  const reqHeaders = buildRequestHeaders(resolvedEndpoint);
  const url = buildUrl(resolvedEndpoint);
  const reqHeadersStr = JSON.stringify(reqHeaders);

  try {
    let statusCode: number;
    let respHeaders: Record<string, string>;
    let respBody: string;

    if (isLocalhost(url)) {
      const result = await fetchLocalhost(
        url,
        resolvedEndpoint.method,
        reqHeaders,
        resolvedEndpoint.body && resolvedEndpoint.method !== 'GET' && resolvedEndpoint.method !== 'HEAD' ? resolvedEndpoint.body : undefined
      );
      statusCode = result.status;
      respHeaders = result.headers;
      respBody = result.body;
    } else {
      const fetchOptions: RequestInit = {
        method: resolvedEndpoint.method,
        headers: reqHeaders,
      };

      if (resolvedEndpoint.body && resolvedEndpoint.method !== 'GET' && resolvedEndpoint.method !== 'HEAD') {
        fetchOptions.body = resolvedEndpoint.body;
      }

      const signal = AbortSignal.timeout(config.Http.RequestTimeoutMs);
      const response = await fetch(url, { ...fetchOptions, signal });

      statusCode = response.status;
      respHeaders = Object.fromEntries(response.headers.entries());
      respBody = await response.text();
    }

    const responseTimeMs = Date.now() - startTime;
    const respHeadersStr = JSON.stringify(respHeaders);

    return {
      statusCode,
      responseTimeMs,
      responseHeaders: respHeadersStr,
      responseBody: respBody,
      requestBody: resolvedEndpoint.body || undefined,
      requestHeaders: reqHeadersStr,
      requestUrl: url,
      isSuccess: true,
    };
  } catch (err: any) {
    return {
      statusCode: 0,
      responseTimeMs: Date.now() - startTime,
      responseHeaders: '{}',
      responseBody: '',
      requestBody: resolvedEndpoint.body || undefined,
      requestHeaders: reqHeadersStr,
      requestUrl: url,
      isSuccess: false,
      errorMessage: err.message || String(err),
    };
  }
}
