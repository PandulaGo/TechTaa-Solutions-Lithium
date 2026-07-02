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
    ApiEndpointId INTEGER NOT NULL,
    IsEnabled INTEGER NOT NULL DEFAULT 1,
    IntervalSeconds INTEGER NOT NULL DEFAULT 60,
    LastRunAt TEXT,
    NextRunAt TEXT,
    CreatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    UpdatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (ApiEndpointId) REFERENCES ApiEndpoints(Id) ON DELETE CASCADE
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
    IsSuccess INTEGER NOT NULL DEFAULT 0,
    ErrorMessage TEXT,
    ExecutedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (ApiEndpointId) REFERENCES ApiEndpoints(Id) ON DELETE CASCADE
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
`);

export default db;
