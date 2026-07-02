import db from '../db';

export function getVariablesMap(environmentId: number): Map<string, string> {
  const map = new Map<string, string>();
  const rows = db.prepare('SELECT Key, Value FROM EnvironmentVariables WHERE EnvironmentId = ?').all(environmentId) as any[];
  for (const row of rows) {
    map.set(row.Key, row.Value);
  }
  return map;
}

export function getDefaultEnvironmentId(): number | null {
  const row = db.prepare('SELECT Id FROM Environments WHERE IsDefault = 1 LIMIT 1').get() as any;
  return row ? row.Id : null;
}

export function interpolateVariables(text: string | null, variables: Map<string, string>): string | null {
  if (!text) return text;

  return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const trimmedKey = key.trim();
    const value = variables.get(trimmedKey);
    return value !== undefined ? value : match;
  });
}

export function interpolateEndpoint(endpoint: { url: string; headers: string | null; body: string | null; authConfig: string | null }, environmentId: number | null) {
  if (!environmentId) return endpoint;

  const variables = getVariablesMap(environmentId);

  return {
    ...endpoint,
    url: interpolateVariables(endpoint.url, variables) || endpoint.url,
    headers: interpolateVariables(endpoint.headers, variables),
    body: interpolateVariables(endpoint.body, variables),
    authConfig: interpolateVariables(endpoint.authConfig, variables),
  };
}
