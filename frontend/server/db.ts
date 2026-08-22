import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'lithium.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS Collections (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Name TEXT NOT NULL,
    Description TEXT,
    CreatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    UpdatedAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS ApiEndpoints (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    CollectionId INTEGER,
    Name TEXT NOT NULL,
    Description TEXT,
    Method TEXT NOT NULL DEFAULT 'GET',
    Url TEXT NOT NULL,
    Headers TEXT,
    Body TEXT,
    BodyType TEXT,
    AuthType TEXT NOT NULL DEFAULT 'None',
    AuthConfig TEXT,
    CreatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    UpdatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (CollectionId) REFERENCES Collections(Id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS Schedules (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    CollectionId INTEGER NOT NULL,
    IsEnabled INTEGER NOT NULL DEFAULT 1,
    IntervalSeconds INTEGER NOT NULL DEFAULT 60,
    LastRunAt TEXT,
    NextRunAt TEXT,
    CreatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    UpdatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (CollectionId) REFERENCES Collections(Id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS ApiResults (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    ApiEndpointId INTEGER NOT NULL,
    StatusCode INTEGER NOT NULL DEFAULT 0,
    ResponseTimeMs INTEGER NOT NULL DEFAULT 0,
    ResponseHeaders TEXT,
    ResponseBody TEXT,
    RequestBody TEXT,
    RequestHeaders TEXT,
    RequestUrl TEXT,
    IsSuccess INTEGER NOT NULL DEFAULT 0,
    ErrorMessage TEXT,
    ExecutedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (ApiEndpointId) REFERENCES ApiEndpoints(Id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS ValidationRules (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    ApiEndpointId INTEGER NOT NULL,
    RuleType TEXT NOT NULL,
    ExpectedValue TEXT NOT NULL,
    ComparisonType TEXT NOT NULL DEFAULT 'Equals',
    IsEnabled INTEGER NOT NULL DEFAULT 1,
    "Order" INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (ApiEndpointId) REFERENCES ApiEndpoints(Id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS Environments (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Name TEXT NOT NULL,
    Description TEXT,
    IsDefault INTEGER NOT NULL DEFAULT 0,
    CreatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    UpdatedAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS EnvironmentVariables (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    EnvironmentId INTEGER NOT NULL,
    Key TEXT NOT NULL,
    Value TEXT NOT NULL,
    CreatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    UpdatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (EnvironmentId) REFERENCES Environments(Id) ON DELETE CASCADE,
    UNIQUE(EnvironmentId, Key)
  );

  CREATE TABLE IF NOT EXISTS CollectionRuns (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    CollectionId INTEGER,
    CollectionName TEXT NOT NULL,
    Status TEXT NOT NULL DEFAULT 'Running',
    TotalEndpoints INTEGER NOT NULL DEFAULT 0,
    CompletedCount INTEGER NOT NULL DEFAULT 0,
    SuccessCount INTEGER NOT NULL DEFAULT 0,
    FailCount INTEGER NOT NULL DEFAULT 0,
    IsAdHoc INTEGER NOT NULL DEFAULT 0,
    StartedAt TEXT NOT NULL DEFAULT (datetime('now')),
    CompletedAt TEXT,
    FOREIGN KEY (CollectionId) REFERENCES Collections(Id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS CollectionRunResults (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    CollectionRunId INTEGER NOT NULL,
    ApiEndpointId INTEGER NOT NULL,
    EndpointName TEXT NOT NULL,
    StatusCode INTEGER NOT NULL DEFAULT 0,
    ResponseTimeMs INTEGER NOT NULL DEFAULT 0,
    IsSuccess INTEGER NOT NULL DEFAULT 0,
    ErrorMessage TEXT,
    Status TEXT NOT NULL DEFAULT 'Pending',
    ResponseBody TEXT,
    ExecutedAt TEXT,
    FOREIGN KEY (CollectionRunId) REFERENCES CollectionRuns(Id) ON DELETE CASCADE,
    FOREIGN KEY (ApiEndpointId) REFERENCES ApiEndpoints(Id) ON DELETE CASCADE
  );
`);

// Migrate existing tables
try { db.exec("ALTER TABLE CollectionRunResults ADD COLUMN ResponseBody TEXT"); } catch {}
try { db.exec("ALTER TABLE ApiResults ADD COLUMN RequestUrl TEXT"); } catch {}

// Migrate Schedules from ApiEndpointId to CollectionId
const schedulesFk = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='Schedules'").get() as any;
if (schedulesFk && schedulesFk.sql && schedulesFk.sql.includes('ApiEndpointId')) {
  db.exec(`
    CREATE TABLE Schedules_new (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      CollectionId INTEGER NOT NULL,
      IsEnabled INTEGER NOT NULL DEFAULT 1,
      IntervalSeconds INTEGER NOT NULL DEFAULT 60,
      LastRunAt TEXT,
      NextRunAt TEXT,
      CreatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      UpdatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (CollectionId) REFERENCES Collections(Id) ON DELETE CASCADE
    );
    INSERT INTO Schedules_new (Id, CollectionId, IsEnabled, IntervalSeconds, LastRunAt, NextRunAt, CreatedAt, UpdatedAt)
      SELECT s.Id, e.CollectionId, s.IsEnabled, s.IntervalSeconds, s.LastRunAt, s.NextRunAt, s.CreatedAt, s.UpdatedAt
      FROM Schedules s
      INNER JOIN ApiEndpoints e ON e.Id = s.ApiEndpointId
      WHERE e.CollectionId IS NOT NULL;
    DROP TABLE Schedules;
    ALTER TABLE Schedules_new RENAME TO Schedules;
  `);
  console.log('Migrated Schedules: ApiEndpointId -> CollectionId');
}

// Deduplicate schedules: keep only one per CollectionId
const dupSchedules = db.prepare(`
  DELETE FROM Schedules WHERE Id NOT IN (
    SELECT MIN(Id) FROM Schedules GROUP BY CollectionId
  )
`).run();
if (dupSchedules.changes > 0) {
  console.log(`Deduplicated ${dupSchedules.changes} duplicate schedules`);
}

// Cleanup orphaned CollectionRuns (no results)
const orphanRuns = db.prepare(`DELETE FROM CollectionRuns WHERE Id NOT IN (SELECT DISTINCT CollectionRunId FROM CollectionRunResults)`).run();
if (orphanRuns.changes > 0) {
  console.log(`Cleaned up ${orphanRuns.changes} orphaned collection runs`);
}

// Cleanup temporary imports from previous sessions
const tempCollections = db.prepare('SELECT CollectionId FROM TemporaryImports WHERE CollectionId IS NOT NULL').all() as any[];
if (tempCollections.length > 0) {
  for (const t of tempCollections) {
    const endpoints = db.prepare('SELECT Id FROM ApiEndpoints WHERE CollectionId = ?').all(t.CollectionId) as any[];
    for (const ep of endpoints) {
      db.prepare('DELETE FROM ValidationRules WHERE ApiEndpointId = ?').run(ep.Id);
      db.prepare('DELETE FROM ApiResults WHERE ApiEndpointId = ?').run(ep.Id);
    }
    db.prepare('DELETE FROM ApiEndpoints WHERE CollectionId = ?').run(t.CollectionId);
    db.prepare('DELETE FROM Schedules WHERE CollectionId = ?').run(t.CollectionId);
    db.prepare('DELETE FROM Collections WHERE Id = ?').run(t.CollectionId);
  }
  db.prepare('DELETE FROM TemporaryImports').run();
  console.log(`Cleaned up ${tempCollections.length} temporary import(s) from previous session`);
}

// Recreate ApiResults to change FK from ON DELETE CASCADE to ON DELETE SET NULL
const apiResultsFk = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='ApiResults'").get() as any;
if (apiResultsFk && apiResultsFk.sql && apiResultsFk.sql.includes('ON DELETE CASCADE')) {
  db.exec(`
    CREATE TABLE ApiResults_new (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      ApiEndpointId INTEGER,
      StatusCode INTEGER NOT NULL DEFAULT 0,
      ResponseTimeMs INTEGER NOT NULL DEFAULT 0,
      ResponseHeaders TEXT,
      ResponseBody TEXT,
      RequestBody TEXT,
      RequestHeaders TEXT,
      RequestUrl TEXT,
      IsSuccess INTEGER NOT NULL DEFAULT 0,
      ErrorMessage TEXT,
      ExecutedAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (ApiEndpointId) REFERENCES ApiEndpoints(Id) ON DELETE SET NULL
    );
    INSERT INTO ApiResults_new (Id, ApiEndpointId, StatusCode, ResponseTimeMs, ResponseHeaders, ResponseBody, RequestBody, RequestHeaders, RequestUrl, IsSuccess, ErrorMessage, ExecutedAt)
      SELECT Id, ApiEndpointId, StatusCode, ResponseTimeMs, ResponseHeaders, ResponseBody, RequestBody, RequestHeaders, RequestUrl, IsSuccess, ErrorMessage, ExecutedAt FROM ApiResults;
    DROP TABLE ApiResults;
    ALTER TABLE ApiResults_new RENAME TO ApiResults;
  `);
  console.log('Migrated ApiResults: ON DELETE CASCADE -> ON DELETE SET NULL');
}

// Track temporary imports for cleanup after run
db.exec(`
  CREATE TABLE IF NOT EXISTS TemporaryImports (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    CollectionRunId INTEGER NOT NULL,
    CollectionId INTEGER,
    CreatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (CollectionRunId) REFERENCES CollectionRuns(Id) ON DELETE CASCADE,
    FOREIGN KEY (CollectionId) REFERENCES Collections(Id) ON DELETE CASCADE
  )
`);

export default db;
