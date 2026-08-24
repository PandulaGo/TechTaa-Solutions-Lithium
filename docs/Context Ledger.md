# Engineering Sprint & Session Ledger (Context Ledger)

> **AI Instruction:** Compare active workspace edits against the last tracked state or git log. Every time a development sprint or file update session terminates, append a fresh dated block chronologically to the top of the history list below. This file is the single source of truth for session history; structural documentation lives in `Architecture and Other Details.md`.

## 2026-08-22 - Session 3: Collection Runs & Scheduling Overhaul, Temporary Import-and-Run Workflow, Deletion Integrity Fixes, Response Export Format, SQL Server Data Source Planning

### 1. Active Focus Workspace Focus

- Major workflow expansion around **collection-level execution**: migrated scheduling from per-endpoint to per-collection, added a manual scheduler start/stop control, introduced tracked Collection Runs with live Dashboard progress, a green per-collection "Run" button, and a raw-body response export for completed runs.
- Built a **temporary import-and-run pipeline** (import JSON → execute immediately → discard on restart) with a reusable 3-way `MultiOptionDialog` on the Export/Import page.
- Fixed several data-integrity bugs: batch-delete 500 errors from FK constraint ordering, orphaned `CollectionRuns` accumulating after endpoint deletion, bulk runs mislabeling real collections as ad-hoc, and downloads failing due to premature Blob URL revocation.
- Explored and fully removed an experimental Puppeteer integration; gathered requirements and produced an implementation plan for a future **SQL Server Data Sources** feature (not yet implemented).
- Refreshed all four documentation files to match the current codebase.

### 2. Comprehensive Changes Code Ledger

- **Files Modified:**
  - `frontend/server/db.ts` — Added `CollectionRuns`, `CollectionRunResults`, and `TemporaryImports` tables; added `RequestUrl` column to `ApiResults`; automatic migrations rebuild `Schedules` (`ApiEndpointId` → `CollectionId`, dedupe to one per collection) and recreate `ApiResults` with `ON DELETE SET NULL` FK; startup sweeps for orphaned `CollectionRuns` and leftover temporary imports.
  - `frontend/server/routes/schedules.ts` — Rewritten for collection-level schedules: `collectionId` required on create, 409 on duplicates, `collection` object joined into list responses.
  - `frontend/server/routes/scheduler.ts` — New router: `GET /status`, `POST /start`, `POST /stop`.
  - `frontend/server/routes/collectionRuns.ts` — New router: list (last 10), get-by-id with result rows, and `GET /:id/export-responses` returning a raw JSON array of parsed successful response bodies (join on `ApiEndpointId` + `ExecutedAt`).
  - `frontend/server/routes/endpoints.ts` — Added `POST /batch-delete` (transactional: ValidationRules → ApiResults → endpoints → orphan sweep), `POST /import-and-run` (temporary import + immediate run + `TemporaryImports` tracking); bulk-run now stores the real collection name and `IsAdHoc = 0` when all selected endpoints share one collection.
  - `frontend/server/routes/collections.ts` — Delete supports `?cascade=true` (schedules → rules → results → endpoints → orphan sweep); added `POST /:id/run` creating a run row plus pre-inserted Pending result rows.
  - `frontend/server/services/scheduleRunner.ts` — Executes every endpoint of a scheduled collection per tick; exposes `startScheduler`/`stopScheduler`/`getSchedulerRunning`; does not auto-start on boot; skips collections present in `TemporaryImports`.
  - `frontend/server/services/collectionRunner.ts` — Sequential run orchestration updating `CollectionRunResults` rows live and rolling up counts into `CollectionRuns`.
  - `frontend/server/services/exportImport.ts` — Added `importTemporary()` and `cleanupTemporary()`.
  - `frontend/src/components/MultiOptionDialog.tsx` — New reusable 3-way dialog (`show(message, title, {option1Text, option2Text, cancelText})` → `'option1' | 'option2' | 'cancel'`).
  - `frontend/src/pages/EndpointsPage.tsx` — Green "Run" button on each collection group header wired to `handleRunCollection` (runs collection, navigates to `/?runId=N`).
  - `frontend/src/pages/ExportImportPage.tsx` — Export side: "Export & Run" vs "Run Only (Temporary)" vs Cancel; Import side: "Save to Database" vs "Run Only (Temporary)" vs Cancel; plain import now asks Yes/No confirmation first.
  - `frontend/src/pages/DashboardPage.tsx` — Live run progress via `?runId=N` deep-link polling, per-endpoint status grid, response export button.
  - `frontend/src/pages/ResultsPage.tsx` — Shows interpolated request URL and an "Environment Variables Applied" panel.
  - `frontend/src/pages/EnvironmentsPage.tsx` — Newly created environments are auto-selected.
  - `frontend/src/services/api.ts` — New API bindings (`runCollection`, `importAndRun`, `batchDeleteEndpoints`, scheduler controls, collection-runs, `exportCollectionRunResponses`); Blob download revokes URL after a 100 ms delay (fixes silent download failures).
  - `frontend/src/main.tsx` — Root-level React error boundary with recovery screen.
  - `docs/` — Consolidated into two canonical files: `Architecture and Other Details.md` (architecture + schema + API reference) and this ledger; legacy `Architecture.md`, `API-Documentation.md`, `Schema-Details.md`, `Session-Details.md` removed.

- **Structural Implementations:**
  - **Schema:** Three new tables (`CollectionRuns`, `CollectionRunResults`, `TemporaryImports`); `ApiResults` FK changed to ON DELETE SET NULL with explicit application-level deletion order rules; logical join between `CollectionRunResults` and `ApiResults` via composite key (`ApiEndpointId`, `ExecutedAt`).
  - **API surface:** 12+ new/changed endpoints (collection run, batch-delete, import-and-run, collection-runs ×3, scheduler ×3, cascade delete param, collection-level schedules).
  - **Removed:** Experimental Puppeteer integration (`puppeteerService.ts`, `puppeteer.ts` routes, related api.ts/index.ts wiring) deleted entirely at user request — may be revisited later.

### 3. Active Impediments & Next Engineering Actions

- **Active Blockers:** None.
- **Planned (designed, not yet implemented) — SQL Server Data Sources:**
  - Goal: replace manual JSON payload authoring by connecting to SQL Server, running saved queries, and mapping result columns to endpoint `{{placeholder}}` parameters.
  - Agreed design: SQL auth connections stored in a new `DataSources` table (passwords write-only, never returned to UI); reusable saved mappings in `EndpointMappings`; new `ApiEndpoints.GeneratedByMappingId` column; `mssql` npm package with per-datasource connection pools; guided wizard (pick connection → write query → preview rows → auto-match columns to placeholders with dropdown override → choose mode + target collection → Generate/Run).
  - Two generation modes offered per mapping job: **Expand** (one endpoint per data row, previous generation replaced via `GeneratedByMappingId`) and **Loop** (one endpoint executed once per row, run count extended before firing). Risk mitigations agreed: column-mismatch validation, max-row cap (default 500), 30 s query timeout, duplicate protection, stale-pool handling.

## 2026-07-02 - Session 2: Full Documentation Refresh — Environment Variables, Font Size Controls, Consolidated Navigation & Dashboard Redesign

### 1. Active Focus Workspace Focus

- Complete refresh of all four documentation files to capture every feature change since the baseline session. Includes environment variables system, font size controls, consolidated sidebar navigation, redesigned Dashboard with stat cards and recent-run tables, export/import JSON format changes, endpoint run with `environmentId`, and all new API endpoints.

### 2. Comprehensive Changes Code Ledger

- **Files Modified:**
  - `docs/Architecture.md` — Rewritten with 7 data flow lifecycle sections, component map table, key architectural decisions section, and detailed descriptions of variable interpolation, environment management, consolidated nav, and dashboard data flow.
  - `docs/API-Documentation.md` — Expanded from 25 to 39 documented endpoints. Added environments CRUD (6 endpoints), environment variables CRUD (4 endpoints), `set-default` endpoint, updated Dashboard response (6 stat fields + recentCollections + recentEndpoints arrays), updated Run/BulkRun body with `environmentId`, added `collectionId` filter to Results, updated ValidationRules list response with `apiEndpoint` join field, updated Export response to show JSON objects for headers/body/authConfig.
  - `docs/Schema-Details.md` — Added two new tables: Environments (5 attributes + IsDefault flag) and EnvironmentVariables (6 attributes with unique composite key).
  - `docs/Session-Details.md` — This entry.

- **Structural Implementations:**
  - **Architecture.md:** Added data flow #6 (Environment Variable Flow) and #7 (Dashboard Data Flow), component map table showing all 6 routes, and Key Architectural Decisions section.
  - **API-Documentation.md:** Reorganized all endpoints into logical groups, added new Environment and Environment Variable sections, updated all response examples to reflect current backend behavior.
  - **Schema-Details.md:** Added Environments and EnvironmentVariables table definitions with attribute grids, updated entity relationships section with the new one-to-many relationship.

### 3. Active Impediments & Next Engineering Actions

- **Active Blockers:** None.
- **Next Target Iterations:**
  - No planned engineering work — documentation is now fully in sync with the codebase.
  - Future sessions should append new entries to this ledger using the same dated format.

## 2026-06-24 - Session 1: Initial Codebase Scan & Documentation Baseline

### 1. Active Focus Workspace Focus

- Conducted a full codebase scan of the Lithium API Testing & Monitoring platform. Explored all backend route files, services, database schema, frontend pages, components, and configuration. Generated complete baseline documentation for architecture, API surface, and database schema.

### 2. Comprehensive Changes Code Ledger

- **Files Modified:** (None — documentation only)
- **Structural Implementations:**
  - Created `docs/` directory with four documentation files:
    - `Architecture.md` — System architecture overview, tech stack mapping, data flow lifecycle descriptions.
    - `API-Documentation.md` — Full RESTful API reference covering all 25+ endpoints across Collections, Endpoints, Schedules, ValidationRules, Results, Dashboard, and Health.
    - `Schema-Details.md` — Complete database schema for all 5 tables (Collections, ApiEndpoints, Schedules, ApiResults, ValidationRules) with attribute grids and entity-relationship diagrams.
    - `Session-Details.md` — This file, initialized with the current session entry.

### 3. Active Impediments & Next Engineering Actions

- **Active Blockers:** None. The application is fully functional with no known compilation or runtime errors.
- **Next Target Iterations:**
  - No planned engineering work — documentation baseline complete.
  - Future sessions should append new entries to this ledger using the same dated format.
