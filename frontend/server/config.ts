import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface AppSettings {
  App: { Name: string; Environment: string };
  Server: { Host: string; Port: number; CorsOrigins: string[]; JsonBodyLimitMb: number };
  Frontend: { Port: number; ApiBaseUrl: string };
  Database: { Path: string; EnableWalMode: boolean; EnableForeignKeys: boolean };
  Http: { RequestTimeoutMs: number; AllowSelfSignedForLocalhost: boolean };
  Scheduler: { TickIntervalMs: number; AutoStart: boolean };
  Dashboard: { RecentCollectionsLimit: number; RecentEndpointsLimit: number; RecentRunsLimit: number };
  Results: { DefaultPageSize: number; MaxPageSize: number };
}

const defaults: AppSettings = {
  App: { Name: 'Lithium', Environment: 'Development' },
  Server: { Host: '127.0.0.1', Port: 10021, CorsOrigins: ['*'], JsonBodyLimitMb: 10 },
  Frontend: { Port: 10025, ApiBaseUrl: 'http://localhost:10021' },
  Database: { Path: 'lithium.db', EnableWalMode: true, EnableForeignKeys: true },
  Http: { RequestTimeoutMs: 30000, AllowSelfSignedForLocalhost: true },
  Scheduler: { TickIntervalMs: 1000, AutoStart: false },
  Dashboard: { RecentCollectionsLimit: 5, RecentEndpointsLimit: 25, RecentRunsLimit: 10 },
  Results: { DefaultPageSize: 50, MaxPageSize: 200 },
};

function deepMerge<T>(base: T, override: unknown): T {
  if (override === null || override === undefined) return base;
  if (typeof base !== 'object' || Array.isArray(base) || typeof override !== 'object' || Array.isArray(override)) {
    return override as T;
  }
  const result: any = { ...(base as any) };
  for (const key of Object.keys(override as any)) {
    result[key] = deepMerge((base as any)[key], (override as any)[key]);
  }
  return result;
}

function loadSettings(): Partial<AppSettings> {
  const filePath = path.join(__dirname, '..', 'appsettings.json');
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`[config] appsettings.json not found at ${filePath}; using built-in defaults`);
      return {};
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Partial<AppSettings>;
  } catch (err) {
    console.warn('[config] Failed to parse appsettings.json; using built-in defaults:', err);
    return {};
  }
}

export const config: AppSettings = deepMerge(defaults, loadSettings());

export function resolveDbPath(): string {
  if (path.isAbsolute(config.Database.Path)) return config.Database.Path;
  return path.join(__dirname, '..', config.Database.Path);
}
