import type { ApiEndpoint, ExecutionResult } from '../types';
import https from 'node:https';
import http from 'node:http';

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
      rejectUnauthorized: false,
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
    let statusCode: number;
    let respHeaders: Record<string, string>;
    let respBody: string;

    if (isLocalhost(url)) {
      const result = await fetchLocalhost(
        url,
        endpoint.method,
        reqHeaders,
        endpoint.body && endpoint.method !== 'GET' && endpoint.method !== 'HEAD' ? endpoint.body : undefined
      );
      statusCode = result.status;
      respHeaders = result.headers;
      respBody = result.body;
    } else {
      const fetchOptions: RequestInit = {
        method: endpoint.method,
        headers: reqHeaders,
      };

      if (endpoint.body && endpoint.method !== 'GET' && endpoint.method !== 'HEAD') {
        fetchOptions.body = endpoint.body;
      }

      const signal = AbortSignal.timeout(30000);
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
