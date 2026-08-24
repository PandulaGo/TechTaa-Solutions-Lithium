# Lithium — Architecture and Other Details

> **AI Instruction:** This file is the canonical structural reference for the project. It consolidates the former `Architecture.md`, `Schema-Details.md`, and `API-Documentation.md` into three parts: **Part A — System Architecture**, **Part B — Database Schema**, and **Part C — REST API Reference**. Keep every section synchronized with the codebase whenever features change. Session-by-session engineering history lives exclusively in `Context Ledger.md`.

---

# PART A — System Architecture Specification

## A1. High-Level Executive Summary

- **Core Purpose:** A full-stack API testing and monitoring application that allows users to define API endpoints (grouped into collections), execute HTTP requests individually, as ad-hoc multi-selections, or as whole-collection runs, schedule recurring collection executions behind an explicit start/stop control, validate responses against configurable rules, and track historical results per run. Supports environment variables with `{{var}}` interpolation at runtime, export/import for sharing endpoint configurations, and a temporary "import & run" mode where imported collections execute immediately but are discarded on server restart.
- **Target Audience:** Developers, QA engineers, and API administrators who need to test, monitor, and validate internal/external API endpoints on an ad-hoc or recurring basis.

## A2. Component Blueprint & Tech Stack

- **Frontend Layer:** React 19, TypeScript 6, React Router v7, Tailwind CSS v4 (via `@tailwindcss/vite` plugin), Vite 8 dev server on port 10025. State management via React Context (`ThemeContext`, `ToastContext`, `EnvironmentContext`, `FontSizeContext`). No external state library.
- **Backend/API Layer:** Node.js runtime (v24.16.0 at `C:\Program Files\nodejs`), Express v5 framework, TypeScript executed via `tsx` (watch mode in development). Runs on port 10021. CORS enabled. JSON body parsing with 10 MB limit.
- **Data Persistence Layer:** SQLite via `better-sqlite3` v12 (synchronous, high-performance driver). WAL journal mode enabled. Foreign key constraints enforced. Single database file at `frontend/lithium.db`.
- **External Integrations:** None. Uses native Node.js `http`/`https` modules and global `fetch()` for outbound HTTP calls. Self-signed certificate bypass for localhost targets via `rejectUnauthorized: false`.

## A3. Data Flow & Communication Lifecycle

1. **Authentication Flow:** No authentication layer is implemented. The application is designed for local/trusted-network use only.
2. **Core Feature Read/Write Flow:**
   - Frontend (React) → Vite dev server (port 10025) → Vite proxy (`/api/*` → `http://localhost:10021`) → Express router → Route handler → `better-sqlite3` query → SQLite database (WAL) → Response returned through chain.
3. **Schedule Runner Flow:** The `scheduleRunner.ts` service runs a background interval (1-second tick) within the Express process. It is **manually controlled** — it does not auto-start on server boot; the frontend toggles it via `GET /api/scheduler/status`, `POST /api/scheduler/start`, and `POST /api/scheduler/stop`. On each tick it queries `Schedules` for due items, executes **every endpoint in the scheduled collection** via `apiExecution.ts` (using the default environment for variable interpolation), validates results via `validation.ts`, writes them to `ApiResults`, and updates `lastRunAt`/`nextRunAt`. Collections registered in `TemporaryImports` are explicitly excluded from scheduling so temporary imports never gain recurring runs.
4. **Collection Run Flow:** Runs are triggered three ways — `POST /api/collections/:id/run` (whole collection), `POST /api/endpoints/bulk-run` (ad-hoc multi-select), or `POST /api/endpoints/import-and-run` (temporary import). Each creates a `CollectionRuns` row (`Status: Running`) plus pre-inserted `Pending` rows in `CollectionRunResults`, then `collectionRunner.ts` executes endpoints sequentially: interpolating variables, executing, validating, writing full details to `ApiResults`, and updating the run row (`CompletedCount`, `SuccessCount`, `FailCount`, per-row `Status`). Bulk runs store the real collection name when all selected endpoints share one collection; otherwise they record `'Bulk Run'` with `IsAdHoc = 1`. The Dashboard polls run status by ID and navigates to `/?runId=N` for live progress.
5. **Endpoint Execution Flow:** User triggers a run or bulk-run (optionally passing `environmentId`) → Express route handler → `interpolateEndpoint()` in `variableInterpolation.ts` replaces `{{key}}` placeholders with environment variable values → `executeEndpoint()` in `apiExecution.ts` → builds request headers/auth → detects localhost URLs (uses Node.js `http`/`https` with `rejectUnauthorized: false`) vs. remote URLs (uses global `fetch()` with 30s `AbortSignal.timeout`) → returns `ExecutionResult` → validates against enabled rules → persists to `ApiResults`.
6. **Export/Import Flow:** Selecting endpoints for export → `GET /api/endpoints/export?ids=...` → joins `ApiEndpoints`, `Collections`, `Schedules`, `ValidationRules` → parses JSON string fields into objects → returns structured JSON payload. Import reverses the process via `POST /api/endpoints/import`, auto-creating missing collections, accepting both JSON string and object formats for `headers`/`body`/`authConfig`.
7. **Temporary Import & Run Flow:** The Export/Import page offers a 3-way choice (`MultiOptionDialog`) for both export and import actions. "Import & Run (Temporary)" posts the payload to `POST /api/endpoints/import-and-run`, which imports collections through `importTemporary()`, registers them in `TemporaryImports`, immediately starts a collection run, and navigates to the Dashboard. Temporary collections persist (visible on the Endpoints page) until server restart — startup cleanup deletes their endpoints, schedules, rules, results, and the collections themselves, then clears the tracking table. This gives users time to inspect results without polluting permanent storage.
8. **Run Response Export Flow:** From a completed run on the Dashboard, "Export Responses" calls `GET /api/collection-runs/:id/export-responses`, which joins `CollectionRunResults` to `ApiResults` on (`ApiEndpointId`, `ExecutedAt`) for successful rows only and returns a raw JSON array of parsed response bodies (no metadata wrapper). The frontend downloads it via a Blob URL that is revoked after a 100 ms delay — revoking synchronously aborts the browser download.
9. **Environment Variable Flow:** User defines environments and variables on the Environments page → stored in `Environments` and `EnvironmentVariables` tables → frontend fetches environments via `EnvironmentContext` (active environment persisted in `localStorage` under `lithium-active-env`) → environment selector in sidebar → when executing endpoints, frontend passes `environmentId` → backend calls `interpolateEndpoint()` which queries `EnvironmentVariables` and performs `{{var}}` regex replacement across `url`, `headers`, `body`, and `authConfig`. Missing variables are left as-is.
10. **Dashboard Data Flow:** `GET /api/dashboard` → queries six aggregate stats (`totalEndpoints`, `passCount`, `failCount`, `averageLatencyMs`, `totalSchedules`, `totalValidationRules`) plus `recentCollections` (top 5) and `recentEndpoints` (last 25) using subqueries that pick the latest result per endpoint → returned as a single JSON payload.

## A4. Component Map — Frontend Pages & Navigation

| Route | Page | Description |
| :--- | :--- | :--- |
| `/` | DashboardPage | 6 stat cards (colored backgrounds), Recently Run Collections (top 5), Recently Run Endpoints (last 25); supports `?runId=N` deep-link for live run progress with per-endpoint status and response export |
| `/endpoints` | EndpointsPage | Grouped by collection with collapsible sections, search bar, filter buttons (All/Has Schedule/Has Validation/Has Both), per-collection green **Run** button, Schedule/Validation action columns, modal forms for edit/create/schedule/validation |
| `/environments` | EnvironmentsPage | Collapsible environment sections, inline variable CRUD, set-default toggle; newly created environments are auto-selected |
| `/results` | ResultsPage | Filterable by endpoint, collection, pass/fail, date range; paginated; Schedule and Validation status columns; shows interpolated request URL and "Environment Variables Applied" panel |
| `/export` | ExportImportPage | Multi-select endpoints table → export JSON; paste JSON → import; both sides offer a 3-way choice via `MultiOptionDialog` (e.g. Save / Run Temporarily / Cancel) |
| `/reference` | ReferencePage | API reference/documentation |

**Sidebar navigation** (collapsible has been removed): Dashboard, Endpoints, Environments, Results, Export/Import, Reference. Also includes active environment dropdown selector, scheduler start/stop indicator, font size controls (A-/reset/A+), and dark/light mode toggle.

## A5. Key Architectural Decisions

- **Express route ordering** — static paths (`/export`, `/import`, `/import-and-run`, `/batch-delete`, `/bulk-run`) are registered before parameterized paths (`/:id`, `/:id/run`) to prevent Express from matching "export" as an `:id` parameter.
- **localhost TLS bypass** — uses native `node:https` with `rejectUnauthorized: false` only for localhost/127.0.0.1/::1 destinations; all other URLs use global `fetch()` with 30s timeout.
- **Schedules and Validation as modals** — schedule creation/editing and validation rule management happen via modal popups on the Endpoints page; standalone Schedules and Validation pages are read-only with search.
- **Collection-level scheduling** — one schedule per collection (409 on duplicates). The scheduler executes every endpoint in the collection on each due tick and is manually started/stopped via the sidebar control; it never auto-starts on boot.
- **Explicit deletion order for referential integrity** — endpoint deletes remove `ValidationRules` → `ApiResults` → endpoints → orphaned `CollectionRuns`; collection cascade deletes follow the same order plus the collection row. This avoids constraint failures from legacy NOT NULL columns and keeps run history clean.
- **Orphaned CollectionRuns sweep** — runs whose result rows are all gone are deleted during endpoint/collection deletes and again at server startup.
- **Temporary imports persist until restart** — "Import & Run (Temporary)" collections stay visible so users can inspect results; startup cleanup removes them. The scheduler skips them so they never acquire recurring schedules.
- **Raw-body-only run exports** — export-responses returns just the parsed successful response bodies as a JSON array (no wrapper metadata), matching downstream tooling expectations.
- **Blob download timing** — object URLs are revoked ~100 ms after triggering download; synchronous revocation cancels the browser's save dialog.
- **Error boundary at app root** — React render crashes show a recovery screen instead of a blank page.
- **Environment variables excluded from import/export** — for security, environments are local-only and not shared in export JSON files.
- **Variable interpolation on the backend** — `{{var}}` replacement happens server-side just before request execution, not on the frontend; unresolved placeholders surface a clear early error instead of sending literal `{{...}}` to the target API.
- **Font size stored in localStorage** — under key `lithium-font-size`, applied via `document.documentElement.style.fontSize`.
- **No auto-refresh on Dashboard** — removed 5-second `setInterval` to prevent interrupting user edits.

---

# PART B — Database Schema & Data Models Matrix

> **AI Instruction:** Inspect the database definition layers (e.g., Prisma schema, Mongoose models, SQL initialization files). Map out table schemas and entity-relationship rules using precise Markdown tabular grids.

## B1. Entity Attributes Grid

### Table Name: Collections

| Attribute Name | Storage Data Type | Key/Modifiers | Logical Field Description |
| :--- | :--- | :--- | :--- |
| `Id` | `INTEGER` | Primary Key / Auto-increment | Unique collection identifier. |
| `Name` | `TEXT` | Not Null | Human-readable collection name. |
| `Description` | `TEXT` | Nullable | Optional description of the collection. |
| `CreatedAt` | `TEXT` | Not Null / Default `datetime('now')` | Timestamp of record creation. |
| `UpdatedAt` | `TEXT` | Not Null / Default `datetime('now')` | Timestamp of last record update. |

---

### Table Name: ApiEndpoints

| Attribute Name | Storage Data Type | Key/Modifiers | Logical Field Description |
| :--- | :--- | :--- | :--- |
| `Id` | `INTEGER` | Primary Key / Auto-increment | Unique endpoint identifier. |
| `CollectionId` | `INTEGER` | Foreign Key → Collections.Id / Nullable / ON DELETE SET NULL | Parent collection this endpoint belongs to. |
| `Name` | `TEXT` | Not Null | Human-readable endpoint name. |
| `Description` | `TEXT` | Nullable | Optional description of the endpoint. |
| `Method` | `TEXT` | Not Null / Default `'GET'` | HTTP method (GET, POST, PUT, DELETE, etc.). |
| `Url` | `TEXT` | Not Null | Full target URL for the HTTP request. |
| `Headers` | `TEXT` | Nullable | JSON string of custom request headers. |
| `Body` | `TEXT` | Nullable | Request body content (JSON, XML, text, etc.). |
| `BodyType` | `TEXT` | Nullable | Content type hint (`json`, `form-data`, `urlencoded`, `raw`). |
| `AuthType` | `TEXT` | Not Null / Default `'None'` | Authentication method (`None`, `Bearer`, `Basic`, `ApiKey`, `OAuth2`). |
| `AuthConfig` | `TEXT` | Nullable | JSON string of auth configuration (tokens, credentials, key/value pairs). |
| `CreatedAt` | `TEXT` | Not Null / Default `datetime('now')` | Timestamp of record creation. |
| `UpdatedAt` | `TEXT` | Not Null / Default `datetime('now')` | Timestamp of last record update. |

---

### Table Name: Schedules

> **Note:** Scheduling is collection-level. A legacy migration in `db.ts` rebuilds this table if it still contains an `ApiEndpointId` column, remapping each row to the parent collection of its former endpoint and deduplicating to one schedule per collection.

| Attribute Name | Storage Data Type | Key/Modifiers | Logical Field Description |
| :--- | :--- | :--- | :--- |
| `Id` | `INTEGER` | Primary Key / Auto-increment | Unique schedule identifier. |
| `CollectionId` | `INTEGER` | Foreign Key → Collections.Id / Not Null / ON DELETE CASCADE / Unique per collection | The collection this schedule executes (all endpoints in the collection run on each tick). |
| `IsEnabled` | `INTEGER` | Not Null / Default `1` | Boolean flag (0/1) indicating whether the schedule is active. |
| `IntervalSeconds` | `INTEGER` | Not Null / Default `60` | Repeat interval in seconds. |
| `LastRunAt` | `TEXT` | Nullable | Timestamp of the last successful execution. |
| `NextRunAt` | `TEXT` | Nullable | Timestamp of the next scheduled execution. |
| `CreatedAt` | `TEXT` | Not Null / Default `datetime('now')` | Timestamp of record creation. |
| `UpdatedAt` | `TEXT` | Not Null / Default `datetime('now')` | Timestamp of last record update. |

---

### Table Name: ApiResults

| Attribute Name | Storage Data Type | Key/Modifiers | Logical Field Description |
| :--- | :--- | :--- | :--- |
| `Id` | `INTEGER` | Primary Key / Auto-increment | Unique result identifier. |
| `ApiEndpointId` | `INTEGER` | Foreign Key → ApiEndpoints.Id / Nullable / ON DELETE SET NULL | The endpoint that was executed. Set to `NULL` when the endpoint is deleted so historical results are preserved. **Deletion order matters:** route handlers must delete `ApiResults` rows explicitly before deleting endpoints, because SQLite enforces the `NOT NULL`-era constraint semantics via manual cleanup (FK `SET NULL` + application-level deletes). |
| `StatusCode` | `INTEGER` | Not Null / Default `0` | HTTP response status code (0 if request failed). |
| `ResponseTimeMs` | `INTEGER` | Not Null / Default `0` | Total response time in milliseconds. |
| `ResponseHeaders` | `TEXT` | Nullable | JSON string of response headers. |
| `ResponseBody` | `TEXT` | Nullable | Raw response body content. |
| `RequestBody` | `TEXT` | Nullable | Copy of the request body sent. |
| `RequestHeaders` | `TEXT` | Nullable | JSON string of the request headers sent. |
| `RequestUrl` | `TEXT` | Nullable | The fully interpolated request URL after environment variable substitution (`{{var}}` resolved). Falls back to `ApiEndpoints.Url` in dashboard queries when null. |
| `IsSuccess` | `INTEGER` | Not Null / Default `0` | Boolean flag (0/1) — true if all validation rules passed or status is 2xx. |
| `ErrorMessage` | `TEXT` | Nullable | Error message if the request failed (network error, timeout, etc.). |
| `ExecutedAt` | `TEXT` | Not Null / Default `datetime('now')` | Timestamp of when the execution occurred. Also used as the join key to correlate `CollectionRunResults` rows with their matching `ApiResults` row (`ApiEndpointId` + `ExecutedAt`). |

---

### Table Name: ValidationRules

| Attribute Name | Storage Data Type | Key/Modifiers | Logical Field Description |
| :--- | :--- | :--- | :--- |
| `Id` | `INTEGER` | Primary Key / Auto-increment | Unique rule identifier. |
| `ApiEndpointId` | `INTEGER` | Foreign Key → ApiEndpoints.Id / Not Null / ON DELETE CASCADE | The endpoint this rule validates. |
| `RuleType` | `TEXT` | Not Null | Type of validation (`StatusCode`, `ResponseTime`, `JsonPath`, `BodyContains`, `HeaderExists`). |
| `ExpectedValue` | `TEXT` | Not Null | The expected value to compare against (e.g., `"200"`, JSONPath expression, string). |
| `ComparisonType` | `TEXT` | Not Null / Default `'Equals'` | Comparison operator (`Equals`, `NotEquals`, `Contains`, `NotContains`, `GreaterThan`, `LessThan`). |
| `IsEnabled` | `INTEGER` | Not Null / Default `1` | Boolean flag (0/1) indicating if the rule is active. |
| `Order` | `INTEGER` | Not Null / Default `0` | Execution order — rules run in ascending order. |

---

### Table Name: Environments

| Attribute Name | Storage Data Type | Key/Modifiers | Logical Field Description |
| :--- | :--- | :--- | :--- |
| `Id` | `INTEGER` | Primary Key / Auto-increment | Unique environment identifier. |
| `Name` | `TEXT` | Not Null | Human-readable environment name (e.g., Production, Staging, Dev). |
| `Description` | `TEXT` | Nullable | Optional description of the environment. |
| `IsDefault` | `INTEGER` | Not Null / Default `0` | Boolean flag (0/1) — one environment can be marked as default for scheduled runs. |
| `CreatedAt` | `TEXT` | Not Null / Default `datetime('now')` | Timestamp of record creation. |
| `UpdatedAt` | `TEXT` | Not Null / Default `datetime('now')` | Timestamp of last record update. |

---

### Table Name: EnvironmentVariables

| Attribute Name | Storage Data Type | Key/Modifiers | Logical Field Description |
| :--- | :--- | :--- | :--- |
| `Id` | `INTEGER` | Primary Key / Auto-increment | Unique variable identifier. |
| `EnvironmentId` | `INTEGER` | Foreign Key → Environments.Id / Not Null / ON DELETE CASCADE | The parent environment this variable belongs to. |
| `Key` | `TEXT` | Not Null / Unique(EnvironmentId, Key) | Variable name used in `{{key}}` interpolation syntax. |
| `Value` | `TEXT` | Not Null | The value substituted in place of `{{key}}`. |
| `CreatedAt` | `TEXT` | Not Null / Default `datetime('now')` | Timestamp of record creation. |
| `UpdatedAt` | `TEXT` | Not Null / Default `datetime('now')` | Timestamp of last record update. |

---

### Table Name: CollectionRuns

> **Purpose:** Tracks batch executions of collections or ad-hoc multi-endpoint selections. Powers the Dashboard "Recently Run Collections" panel and per-run drill-down views.

| Attribute Name | Storage Data Type | Key/Modifiers | Logical Field Description |
| :--- | :--- | :--- | :--- |
| `Id` | `INTEGER` | Primary Key / Auto-increment | Unique run identifier. |
| `CollectionId` | `INTEGER` | Foreign Key → Collections.Id / Nullable / ON DELETE SET NULL | The collection being executed. `NULL` for ad-hoc bulk runs spanning multiple collections. |
| `CollectionName` | `TEXT` | Not Null | Denormalized snapshot of the collection name at run time (`'Bulk Run'`, `'Imported Run'`, or the real collection name). Survives collection deletion so history stays readable. |
| `Status` | `TEXT` | Not Null / Default `'Running'` | Lifecycle state (`Running`, `Completed`). |
| `TotalEndpoints` | `INTEGER` | Not Null / Default `0` | Number of endpoints included in this run. |
| `CompletedCount` | `INTEGER` | Not Null / Default `0` | How many endpoint executions have finished so far. |
| `SuccessCount` | `INTEGER` | Not Null / Default `0` | Endpoints whose validations passed. |
| `FailCount` | `INTEGER` | Not Null / Default `0` | Endpoints that failed validation or errored. |
| `IsAdHoc` | `INTEGER` | Not Null / Default `0` | Boolean flag (0/1) — `1` when the run was a manual multi-select bulk run rather than a whole-collection execution. |
| `StartedAt` | `TEXT` | Not Null / Default `datetime('now')` | Timestamp of when the run began. |
| `CompletedAt` | `TEXT` | Nullable | Timestamp of when the run finished. |

---

### Table Name: CollectionRunResults

> **Purpose:** Per-endpoint rows within a collection run. Rows are pre-inserted as `Pending` before execution begins so progress can be tracked live; each row is updated as its endpoint completes.

| Attribute Name | Storage Data Type | Key/Modifiers | Logical Field Description |
| :--- | :--- | :--- | :--- |
| `Id` | `INTEGER` | Primary Key / Auto-increment | Unique result-row identifier. |
| `CollectionRunId` | `INTEGER` | Foreign Key → CollectionRuns.Id / Not Null / ON DELETE CASCADE | The parent run this row belongs to. |
| `ApiEndpointId` | `INTEGER` | Foreign Key → ApiEndpoints.Id / Not Null / ON DELETE CASCADE | The endpoint executed in this row. Also the join key to `ApiResults`. |
| `EndpointName` | `TEXT` | Not Null | Denormalized endpoint name captured at run start (survives endpoint rename/deletion within the run view). |
| `StatusCode` | `INTEGER` | Not Null / Default `0` | HTTP response status code (0 while pending/failed). |
| `ResponseTimeMs` | `INTEGER` | Not Null / Default `0` | Response time in milliseconds. |
| `IsSuccess` | `INTEGER` | Not Null / Default `0` | Boolean flag (0/1) — mirrors the validation outcome stored in `ApiResults`. |
| `ErrorMessage` | `TEXT` | Nullable | Error message if the request failed. |
| `Status` | `TEXT` | Not Null / Default `'Pending'` | Row lifecycle state (`Pending`, `Running`, `Success`, `Failed`). |
| `ResponseBody` | `TEXT` | Nullable | Copy of the response body (added via post-create migration). |
| `ExecutedAt` | `TEXT` | Nullable | Timestamp written on completion. Together with `ApiEndpointId`, correlates this row to its full `ApiResults` record (used by the export-responses query). |

---

### Table Name: TemporaryImports

> **Purpose:** Bookkeeping table for the "Import & Run (Temporary)" workflow. Imported collections are executed immediately but kept out of permanent storage; they persist until server restart, when startup cleanup removes them.

| Attribute Name | Storage Data Type | Key/Modifiers | Logical Field Description |
| :--- | :--- | :--- | :--- |
| `Id` | `INTEGER` | Primary Key / Auto-increment | Unique tracking identifier. |
| `CollectionRunId` | `INTEGER` | Foreign Key → CollectionRuns.Id / Not Null / ON DELETE CASCADE | The run created from the temporary import. |
| `CollectionId` | `INTEGER` | Foreign Key → Collections.Id / Nullable / ON DELETE CASCADE | The temporarily imported collection to be cleaned up on restart. |
| `CreatedAt` | `TEXT` | Not Null / Default `datetime('now')` | Timestamp of when the temporary import was registered. |

---

## B2. Architectural Entity Relationships

* **Collections** $\rightarrow$ **ApiEndpoints**: **One-to-Many**. A collection can contain many API endpoints. When a collection is deleted, child endpoints have their `CollectionId` set to `NULL` (ON DELETE SET NULL).
* **Collections** $\rightarrow$ **Schedules**: **One-to-One** (one schedule per collection, enforced by deduplication migration + 409 conflict on duplicate creation). Scheduling is collection-level — each tick runs every endpoint in the collection. Deleting a collection cascade-deletes its schedule.
* **Collections** $\rightarrow$ **CollectionRuns**: **One-to-Many**. A collection can have many recorded runs. Deleting a collection sets `CollectionRuns.CollectionId` to `NULL` (ON DELETE SET NULL); the denormalized `CollectionName` keeps run history readable.
* **CollectionRuns** $\rightarrow$ **CollectionRunResults**: **One-to-Many**. Each run contains one result row per endpoint executed. Rows are pre-created as `Pending` and updated live as endpoints complete. Deleting a run cascade-deletes its rows.
* **ApiEndpoints** $\rightarrow$ **CollectionRunResults**: **One-to-Many**. An endpoint appears in many run rows over time. Cascade-deleted with the endpoint.
* **ApiEndpoints** $\rightarrow$ **ApiResults**: **One-to-Many**. Each endpoint execution produces one result record. Historical results accumulate over time. The FK is ON DELETE SET NULL so raw history survives endpoint deletion; however, because the column was originally NOT NULL, **all delete paths (single delete, batch-delete, collection cascade) explicitly `DELETE FROM ApiResults` for the affected endpoints before removing the endpoint rows** to avoid constraint failures.
* **ApiEndpoints** $\rightarrow$ **ValidationRules**: **One-to-Many**. An endpoint can have multiple validation rules that run in order. Deleting an endpoint cascade-deletes all its validation rules.
* **CollectionRunResults** $\leftrightarrow$ **ApiResults**: **Logical join** (no FK). Correlated via composite key (`ApiEndpointId`, `ExecutedAt`). Used by `GET /collection-runs/:id/export-responses` to pull successful response bodies in execution order.
* **CollectionRuns** $\rightarrow$ **TemporaryImports** / **Collections** $\rightarrow$ **TemporaryImports**: **Tracking links**. Each temporary import registers one row per imported collection plus the run that was started from it. Startup cleanup deletes the tracked collections (with their endpoints, schedules, rules, and results) and clears the table.
* **Environments** $\rightarrow$ **EnvironmentVariables**: **One-to-Many**. An environment can contain many variables (key-value pairs). When an environment is deleted, all its variables are cascade-deleted. The combination of `EnvironmentId` + `Key` is unique.

### Deletion Order Rules (Application-Level)

Because SQLite foreign keys interact with legacy NOT NULL columns and denormalized snapshots, route handlers follow this explicit deletion order:

1. **Endpoint deletes** (single or batch): `ValidationRules` → `ApiResults` → `ApiEndpoints` → orphaned `CollectionRuns`.
2. **Collection cascade delete**: `Schedules` → `ValidationRules` → `ApiResults` → `ApiEndpoints` → orphaned `CollectionRuns` → `Collections`.
3. **Orphaned CollectionRuns**: any run whose `Id` no longer appears in `CollectionRunResults.CollectionRunId` is removed (prevents empty run shells after their endpoints were deleted). This sweep also runs at server startup.
4. **Temporary imports**: cleaned up only at server startup (deliberately *not* after each run, so users can inspect results until restart).

---

# PART C — RESTful API Reference Blueprint

> **AI Instruction:** Scan all active route files, controllers, and router configurations. Extract every public endpoint and document it using the explicit block layout detailed below.

## C1. Service Context & Base URL

- **Local Base Path:** `http://localhost:10021/api`
- **Global Content-Type:** `application/json`
- **Proxy:** Vite dev server proxies `/api/*` to `http://localhost:10021`
- **Health Check:** `GET /api/health` returns `{ "status": "ok" }`

## C2. Endpoint Registry

### [Health Check]

* **URL String:** `/health`
* **HTTP Protocol Method:** `GET`
* **Required Header Keys:** None
* **Request Payload Schema:** None

* **Response:**

  Success (200 OK)

  ```json
  {
    "status": "ok"
  }
  ```

---

### [Collections — List All]

* **URL String:** `/collections`
* **HTTP Protocol Method:** `GET`
* **Required Header Keys:** None
* **Request Payload Schema:** None

* **Response:**

  Success (200 OK)

  ```json
  [
    {
      "id": 1,
      "name": "My Collection",
      "description": "A group of endpoints",
      "createdAt": "2026-06-24 10:00:00",
      "updatedAt": "2026-06-24 10:00:00"
    }
  ]
  ```

---

### [Collections — Get Single]

* **URL String:** `/collections/:id`
* **HTTP Protocol Method:** `GET`
* **Required Header Keys:** None
* **Request Payload Schema:** None

* **Response:**

  Success (200 OK)

  ```json
  {
    "id": 1,
    "name": "My Collection",
    "description": "A group of endpoints",
    "createdAt": "2026-06-24 10:00:00",
    "updatedAt": "2026-06-24 10:00:00"
  }
  ```

  Error (404 Not Found)

  ```json
  { "error": "Not found" }
  ```

---

### [Collections — Get Endpoints in Collection]

* **URL String:** `/collections/:id/endpoints`
* **HTTP Protocol Method:** `GET`
* **Required Header Keys:** None
* **Request Payload Schema:** None

* **Response:**

  Success (200 OK)

  ```json
  [
    {
      "id": 1,
      "collectionId": 1,
      "name": "Get Users",
      "description": null,
      "method": "GET",
      "url": "https://api.example.com/users",
      "headers": null,
      "body": null,
      "bodyType": null,
      "authType": "None",
      "authConfig": null,
      "createdAt": "2026-06-24 10:00:00",
      "updatedAt": "2026-06-24 10:00:00"
    }
  ]
  ```

---

### [Collections — Create]

* **URL String:** `/collections`
* **HTTP Protocol Method:** `POST`
* **Required Header Keys:** `Content-Type: application/json`
* **Request Payload Schema:**

  ```json
  {
    "name": "New Collection",
    "description": "Optional description"
  }
  ```

* **Response:**

  Success (201 Created)

  ```json
  {
    "id": 2,
    "name": "New Collection",
    "description": "Optional description",
    "createdAt": "2026-06-24 12:00:00",
    "updatedAt": "2026-06-24 12:00:00"
  }
  ```

---

### [Collections — Update]

* **URL String:** `/collections/:id`
* **HTTP Protocol Method:** `PUT`
* **Required Header Keys:** `Content-Type: application/json`
* **Request Payload Schema:**

  ```json
  {
    "name": "Updated Name",
    "description": "Updated description"
  }
  ```

* **Response:**

  Success (200 OK)

  ```json
  {
    "id": 1,
    "name": "Updated Name",
    "description": "Updated description",
    "createdAt": "2026-06-24 10:00:00",
    "updatedAt": "2026-06-24 12:00:00"
  }
  ```

  Error (404 Not Found)

  ```json
  { "error": "Not found" }
  ```

---

### [Collections — Delete]

* **URL String:** `/collections/:id`
* **HTTP Protocol Method:** `DELETE`
* **Required Header Keys:** None
* **Query Parameters:** `cascade` (optional) — when `true`, deletes the collection's schedules, validation rules, results, and endpoints before removing the collection, then sweeps orphaned collection runs.
* **Request Payload Schema:** None

* **Response:**

  Success (204 No Content)

  *No response body.*

  Error (404 Not Found)

  ```json
  { "error": "Not found" }
  ```

---

### [Collections — Run Collection]

* **URL String:** `/collections/:id/run`
* **HTTP Protocol Method:** `POST`
* **Required Header Keys:** `Content-Type: application/json`
* **Request Payload Schema:**

  ```json
  {
    "environmentId": 1
  }
  ```

  `environmentId` is optional. Creates a `CollectionRuns` row (`Status: Running`), pre-inserts a `Pending` `CollectionRunResults` row for every endpoint in the collection, then executes them sequentially via `startCollectionRun`.

* **Response:**

  Success (200 OK)

  ```json
  { "runId": 7 }
  ```

  Error (400 Bad Request)

  ```json
  { "error": "Collection has no endpoints" }
  ```

  Error (404 Not Found)

  ```json
  { "error": "Not found" }
  ```

---

### [Endpoints — List All]

* **URL String:** `/endpoints?collectionId=1`
* **HTTP Protocol Method:** `GET`
* **Required Header Keys:** None
* **Query Parameters:** `collectionId` (optional) — filter by collection
* **Request Payload Schema:** None

* **Response:**

  Success (200 OK)

  ```json
  [
    {
      "id": 1,
      "collectionId": 1,
      "name": "Get Users",
      "description": null,
      "method": "GET",
      "url": "https://api.example.com/users",
      "headers": null,
      "body": null,
      "bodyType": null,
      "authType": "None",
      "authConfig": null,
      "createdAt": "2026-06-24 10:00:00",
      "updatedAt": "2026-06-24 10:00:00",
      "collection": {
        "id": 1,
        "name": "My Collection",
        "description": null,
        "createdAt": "2026-06-24 10:00:00",
        "updatedAt": "2026-06-24 10:00:00"
      }
    }
  ]
  ```

---

### [Endpoints — Get Single]

* **URL String:** `/endpoints/:id`
* **HTTP Protocol Method:** `GET`
* **Required Header Keys:** None
* **Request Payload Schema:** None

* **Response:**

  Success (200 OK)

  ```json
  {
    "id": 1,
    "collectionId": 1,
    "name": "Get Users",
    "description": null,
    "method": "GET",
    "url": "https://api.example.com/users",
    "headers": null,
    "body": null,
    "bodyType": null,
    "authType": "None",
    "authConfig": null,
    "createdAt": "2026-06-24 10:00:00",
    "updatedAt": "2026-06-24 10:00:00",
    "collection": {
      "id": 1,
      "name": "My Collection",
      "description": null,
      "createdAt": "2026-06-24 10:00:00",
      "updatedAt": "2026-06-24 10:00:00"
    }
  }
  ```

  Error (404 Not Found)

  ```json
  { "error": "Not found" }
  ```

---

### [Endpoints — Create]

* **URL String:** `/endpoints`
* **HTTP Protocol Method:** `POST`
* **Required Header Keys:** `Content-Type: application/json`
* **Request Payload Schema:**

  ```json
  {
    "collectionId": 1,
    "name": "New Endpoint",
    "description": "Optional",
    "method": "GET",
    "url": "https://api.example.com/resource",
    "headers": "{\"Accept\":\"application/json\"}",
    "body": null,
    "bodyType": null,
    "authType": "None",
    "authConfig": null
  }
  ```

* **Response:**

  Success (201 Created)

  ```json
  {
    "id": 3,
    "collectionId": 1,
    "name": "New Endpoint",
    "description": "Optional",
    "method": "GET",
    "url": "https://api.example.com/resource",
    "headers": "{\"Accept\":\"application/json\"}",
    "body": null,
    "bodyType": null,
    "authType": "None",
    "authConfig": null,
    "createdAt": "2026-06-24 12:00:00",
    "updatedAt": "2026-06-24 12:00:00"
  }
  ```

---

### [Endpoints — Update]

* **URL String:** `/endpoints/:id`
* **HTTP Protocol Method:** `PUT`
* **Required Header Keys:** `Content-Type: application/json`
* **Request Payload Schema:** Partial object — omitted fields fall back to existing values.

  ```json
  {
    "name": "Updated Name",
    "url": "https://api.example.com/new-path"
  }
  ```

* **Response:**

  Success (200 OK)

  ```json
  {
    "id": 1,
    "name": "Updated Name",
    "url": "https://api.example.com/new-path",
    "...": "..."
  }
  ```

  Error (404 Not Found)

  ```json
  { "error": "Not found" }
  ```

---

### [Endpoints — Delete]

* **URL String:** `/endpoints/:id`
* **HTTP Protocol Method:** `DELETE`
* **Required Header Keys:** None
* **Request Payload Schema:** None

* **Description:** Deletes the endpoint's validation rules and results first, then the endpoint, then sweeps orphaned collection runs.

* **Response:**

  Success (204 No Content)

  *No response body.*

  Error (404 Not Found)

  ```json
  { "error": "Not found" }
  ```

---

### [Endpoints — Run Single]

* **URL String:** `/endpoints/:id/run`
* **HTTP Protocol Method:** `POST`
* **Required Header Keys:** `Content-Type: application/json`
* **Request Payload Schema:**

  ```json
  {
    "environmentId": 1
  }
  ```

  `environmentId` is optional. If provided, `{{var}}` placeholders in the endpoint's URL, headers, body, and authConfig are replaced with values from that environment.

* **Response:**

  Success (200 OK)

  ```json
  {
    "apiEndpointId": 1,
    "statusCode": 200,
    "responseTimeMs": 342,
    "isSuccess": true,
    "errorMessage": null
  }
  ```

  Error (404 Not Found)

  ```json
  { "error": "Not found" }
  ```

---

### [Endpoints — Bulk Run]

* **URL String:** `/endpoints/bulk-run`
* **HTTP Protocol Method:** `POST`
* **Required Header Keys:** `Content-Type: application/json`
* **Request Payload Schema:**

  ```json
  {
    "endpointIds": [1, 2, 3],
    "environmentId": 1
  }
  ```

  `environmentId` is optional. Each endpoint is run sequentially in the order given. When all selected endpoints share one collection, the run records that collection's real name with `IsAdHoc = 0`; otherwise it records `'Bulk Run'` with `IsAdHoc = 1`.

* **Response:**

  Success (200 OK)

  ```json
  { "runId": 9 }
  ```

  Error (400 Bad Request)

  ```json
  { "error": "endpointIds array required" }
  ```

---

### [Endpoints — Export]

* **URL String:** `/endpoints/export?ids=1,2,3`
* **HTTP Protocol Method:** `GET`
* **Required Header Keys:** None
* **Query Parameters:** `ids` (required) — comma-separated list of endpoint IDs to export
* **Request Payload Schema:** None

* **Response:**

  Success (200 OK)

  ```json
  {
    "endpoints": [
      {
        "name": "Get Users",
        "description": null,
        "method": "GET",
        "url": "https://api.example.com/users",
        "headers": {"Accept": "application/json"},
        "body": null,
        "bodyType": null,
        "authType": "None",
        "authConfig": null,
        "collectionName": "My Collection",
        "schedule": {
          "intervalSeconds": 60,
          "isEnabled": true
        },
        "validationRules": [
          {
            "ruleType": "StatusCode",
            "expectedValue": "200",
            "comparisonType": "Equals",
            "order": 0,
            "isEnabled": true
          }
        ]
      }
    ]
  }
  ```

  > **Note:** `headers`, `body`, and `authConfig` are exported as parsed JSON objects (not double-encoded strings). The import endpoint accepts both JSON string and object formats.

  Error (400 Bad Request)

  ```json
  { "error": "ids query param required" }
  ```

---

### [Endpoints — Import]

* **URL String:** `/endpoints/import`
* **HTTP Protocol Method:** `POST`
* **Required Header Keys:** `Content-Type: application/json`
* **Request Payload Schema:**

  ```json
  {
    "endpoints": [
      {
        "name": "Imported Endpoint",
        "description": null,
        "method": "GET",
        "url": "https://api.example.com/users",
        "headers": null,
        "body": null,
        "bodyType": null,
        "authType": "None",
        "authConfig": null,
        "collectionName": "Imported Collection",
        "schedule": {
          "intervalSeconds": 120,
          "isEnabled": true
        },
        "validationRules": []
      }
    ]
  }
  ```

  `headers`, `body`, and `authConfig` accept both JSON string (e.g. `"{\"Accept\":\"application/json\"}"`) and JSON object formats. Missing collections are auto-created.

* **Response:**

  Success (200 OK)

  ```json
  { "imported": 1 }
  ```

---

### [Endpoints — Import and Run (Temporary)]

* **URL String:** `/endpoints/import-and-run`
* **HTTP Protocol Method:** `POST`
* **Required Header Keys:** `Content-Type: application/json`
* **Request Payload Schema:**

  ```json
  {
    "data": {
      "endpoints": [
        {
          "name": "Imported Endpoint",
          "method": "POST",
          "url": "https://api.example.com/resource",
          "collectionName": "Imported Collection",
          "...": "..."
        }
      ]
    },
    "environmentId": 1
  }
  ```

  `data` uses the same schema as the standard import payload. `environmentId` is optional. The import is performed **temporarily**: imported collections are registered in `TemporaryImports` and executed immediately, but persist only until the next server restart (startup cleanup removes them). They remain visible and schedulable-safe in the meantime — the scheduler explicitly skips collections tracked in `TemporaryImports`.

* **Response:**

  Success (200 OK)

  ```json
  { "runId": 8, "imported": 2 }
  ```

  Error (400 Bad Request)

  ```json
  { "error": "data is required" }
  ```

---

### [Endpoints — Batch Delete]

* **URL String:** `/endpoints/batch-delete`
* **HTTP Protocol Method:** `POST`
* **Required Header Keys:** `Content-Type: application/json`
* **Request Payload Schema:**

  ```json
  { "ids": [3, 4, 5] }
  ```

  Deletes validation rules, results, then the endpoints themselves (in that order, inside a transaction), followed by a sweep of orphaned `CollectionRuns`.

* **Response:**

  Success (200 OK)

  ```json
  { "deleted": 3 }
  ```

  Error (400 Bad Request)

  ```json
  { "error": "ids array required" }
  ```

---

### [Schedules — List All]

> **Note:** Scheduling is **collection-level**. Each schedule targets a collection and executes all of its endpoints. Only one schedule may exist per collection (duplicates return 409).

* **URL String:** `/schedules?collectionId=1`
* **HTTP Protocol Method:** `GET`
* **Required Header Keys:** None
* **Query Parameters:** `collectionId` (optional) — filter by collection
* **Request Payload Schema:** None

* **Response:**

  Success (200 OK)

  ```json
  [
    {
      "id": 1,
      "collectionId": 1,
      "isEnabled": true,
      "intervalSeconds": 60,
      "lastRunAt": "2026-06-24 11:00:00",
      "nextRunAt": "2026-06-24 11:01:00",
      "createdAt": "2026-06-24 10:00:00",
      "updatedAt": "2026-06-24 11:00:00",
      "collection": {
        "id": 1,
        "name": "My Collection",
        "description": null,
        "createdAt": "2026-06-24 10:00:00",
        "updatedAt": "2026-06-24 10:00:00"
      }
    }
  ]
  ```

---

### [Schedules — Get Single]

* **URL String:** `/schedules/:id`
* **HTTP Protocol Method:** `GET`
* **Required Header Keys:** None
* **Request Payload Schema:** None

* **Response:**

  Success (200 OK)

  ```json
  {
    "id": 1,
    "collectionId": 1,
    "isEnabled": true,
    "intervalSeconds": 60,
    "lastRunAt": null,
    "nextRunAt": "2026-06-24 11:01:00",
    "createdAt": "2026-06-24 10:00:00",
    "updatedAt": "2026-06-24 10:00:00"
  }
  ```

  Error (404 Not Found)

  ```json
  { "error": "Not found" }
  ```

---

### [Schedules — Create]

* **URL String:** `/schedules?collectionId=1`
* **HTTP Protocol Method:** `POST`
* **Required Header Keys:** `Content-Type: application/json`
* **Query Parameters:** `collectionId` (alternative to body field)
* **Request Payload Schema:**

  ```json
  {
    "collectionId": 1,
    "intervalSeconds": 60,
    "isEnabled": true
  }
  ```

* **Response:**

  Success (201 Created)

  ```json
  {
    "id": 2,
    "collectionId": 1,
    "isEnabled": true,
    "intervalSeconds": 60,
    "lastRunAt": null,
    "nextRunAt": "2026-06-24 12:01:00",
    "createdAt": "2026-06-24 12:00:00",
    "updatedAt": "2026-06-24 12:00:00"
  }
  ```

  Error (400 Bad Request)

  ```json
  { "error": "collectionId required" }
  ```

  Error (409 Conflict)

  ```json
  { "error": "Schedule already exists for this collection" }
  ```

---

### [Schedules — Update]

* **URL String:** `/schedules/:id`
* **HTTP Protocol Method:** `PUT`
* **Required Header Keys:** `Content-Type: application/json`
* **Request Payload Schema:** Partial — only provided fields are updated.

  ```json
  {
    "isEnabled": false,
    "intervalSeconds": 300
  }
  ```

* **Response:**

  Success (200 OK)

  ```json
  {
    "id": 1,
    "collectionId": 1,
    "isEnabled": false,
    "intervalSeconds": 300,
    "...": "..."
  }
  ```

  Error (404 Not Found)

  ```json
  { "error": "Not found" }
  ```

---

### [Schedules — Delete]

* **URL String:** `/schedules/:id`
* **HTTP Protocol Method:** `DELETE`
* **Required Header Keys:** None
* **Request Payload Schema:** None

* **Response:**

  Success (204 No Content)

  *No response body.*

  Error (404 Not Found)

  ```json
  { "error": "Not found" }
  ```

---

### [Validation Rules — List All]

* **URL String:** `/validation-rules?endpointId=1`
* **HTTP Protocol Method:** `GET`
* **Required Header Keys:** None
* **Query Parameters:** `endpointId` (optional) — filter by endpoint
* **Request Payload Schema:** None

* **Response:**

  Success (200 OK)

  ```json
  [
    {
      "id": 1,
      "apiEndpointId": 1,
      "ruleType": "StatusCode",
      "expectedValue": "200",
      "comparisonType": "Equals",
      "isEnabled": true,
      "order": 0,
      "apiEndpoint": {
        "id": 1,
        "name": "Get Users"
      }
    }
  ]
  ```

  > **Note:** The response includes an `apiEndpoint` field (with `id` and `name`) from a LEFT JOIN with `ApiEndpoints`.

---

### [Validation Rules — Get Single]

* **URL String:** `/validation-rules/:id`
* **HTTP Protocol Method:** `GET`
* **Required Header Keys:** None
* **Request Payload Schema:** None

* **Response:**

  Success (200 OK)

  ```json
  {
    "id": 1,
    "apiEndpointId": 1,
    "ruleType": "StatusCode",
    "expectedValue": "200",
    "comparisonType": "Equals",
    "isEnabled": true,
    "order": 0
  }
  ```

  Error (404 Not Found)

  ```json
  { "error": "Not found" }
  ```

---

### [Validation Rules — Create]

* **URL String:** `/validation-rules?endpointId=1`
* **HTTP Protocol Method:** `POST`
* **Required Header Keys:** `Content-Type: application/json`
* **Query Parameters:** `endpointId` (alternative to body field)
* **Request Payload Schema:**

  ```json
  {
    "apiEndpointId": 1,
    "ruleType": "StatusCode",
    "expectedValue": "200",
    "comparisonType": "Equals",
    "isEnabled": true,
    "order": 0
  }
  ```

* **Response:**

  Success (201 Created)

  ```json
  {
    "id": 3,
    "apiEndpointId": 1,
    "ruleType": "StatusCode",
    "expectedValue": "200",
    "comparisonType": "Equals",
    "isEnabled": true,
    "order": 0
  }
  ```

---

### [Validation Rules — Update]

* **URL String:** `/validation-rules/:id`
* **HTTP Protocol Method:** `PUT`
* **Required Header Keys:** `Content-Type: application/json`
* **Request Payload Schema:** All fields are optional — only provided fields are updated.

  ```json
  {
    "expectedValue": "201",
    "isEnabled": false
  }
  ```

* **Response:**

  Success (200 OK)

  ```json
  {
    "id": 1,
    "ruleType": "StatusCode",
    "expectedValue": "201",
    "comparisonType": "Equals",
    "isEnabled": false,
    "order": 0
  }
  ```

  Error (404 Not Found)

  ```json
  { "error": "Not found" }
  ```

---

### [Validation Rules — Delete]

* **URL String:** `/validation-rules/:id`
* **HTTP Protocol Method:** `DELETE`
* **Required Header Keys:** None
* **Request Payload Schema:** None

* **Response:**

  Success (204 No Content)

  *No response body.*

  Error (404 Not Found)

  ```json
  { "error": "Not found" }
  ```

---

### [Results — List All]

* **URL String:** `/results?endpointId=1&collectionId=1&isSuccess=true&from=2026-06-01&to=2026-06-30&page=1&pageSize=50`
* **HTTP Protocol Method:** `GET`
* **Required Header Keys:** None
* **Query Parameters:**
  - `endpointId` (optional) — filter by endpoint
  - `collectionId` (optional) — filter by collection (subquery matching endpoints in that collection)
  - `isSuccess` (optional, `true`/`false`) — filter by pass/fail
  - `from` (optional, ISO datetime) — filter by `executedAt >=`
  - `to` (optional, ISO datetime) — filter by `executedAt <=`
  - `page` (optional, default 1) — pagination page
  - `pageSize` (optional, default 50, max 200) — results per page
* **Request Payload Schema:** None

* **Response:**

  Success (200 OK)

  ```json
  [
    {
      "id": 42,
      "apiEndpointId": 1,
      "statusCode": 200,
      "responseTimeMs": 342,
      "responseHeaders": "{\"content-type\":\"application/json\"}",
      "responseBody": "{\"users\":[]}",
      "requestBody": null,
      "requestHeaders": "{\"Content-Type\":\"application/json\"}",
      "requestUrl": "https://api.prod.example.com/users",
      "isSuccess": true,
      "errorMessage": null,
      "executedAt": "2026-06-24 12:00:00",
      "apiEndpoint": {
        "id": 1,
        "name": "Get Users",
        "method": "GET",
        "url": "https://api.example.com/users",
        "...": "..."
      }
    }
  ]
  ```

---

### [Results — Get Single]

* **URL String:** `/results/:id`
* **HTTP Protocol Method:** `GET`
* **Required Header Keys:** None
* **Request Payload Schema:** None

* **Response:**

  Success (200 OK) — same shape as a single list item.

  Error (404 Not Found)

  ```json
  { "error": "Not found" }
  ```

---

### [Collection Runs — List All]

* **URL String:** `/collection-runs`
* **HTTP Protocol Method:** `GET`
* **Required Header Keys:** None
* **Request Payload Schema:** None

* **Response:**

  Success (200 OK) — the 10 most recent runs, newest first.

  ```json
  [
    {
      "id": 7,
      "collectionId": 1,
      "collectionName": "Kaiser Reports",
      "status": "Completed",
      "totalEndpoints": 3,
      "completedCount": 3,
      "successCount": 2,
      "failCount": 1,
      "isAdHoc": false,
      "startedAt": "2026-08-22 10:00:00",
      "completedAt": "2026-08-22 10:00:12"
    }
  ]
  ```

---

### [Collection Runs — Get Single]

* **URL String:** `/collection-runs/:id`
* **HTTP Protocol Method:** `GET`
* **Required Header Keys:** None
* **Request Payload Schema:** None

* **Response:**

  Success (200 OK)

  ```json
  {
    "id": 7,
    "collectionId": 1,
    "collectionName": "Kaiser Reports",
    "status": "Running",
    "totalEndpoints": 3,
    "completedCount": 1,
    "successCount": 1,
    "failCount": 0,
    "isAdHoc": false,
    "startedAt": "2026-08-22 10:00:00",
    "completedAt": null,
    "results": [
      {
        "id": 21,
        "collectionRunId": 7,
        "apiEndpointId": 4,
        "endpointName": "NCAL Pharmacy Procurement",
        "statusCode": 200,
        "responseTimeMs": 342,
        "isSuccess": true,
        "errorMessage": null,
        "status": "Success",
        "executedAt": "2026-08-22 10:00:04"
      }
    ]
  }
  ```

  Error (404 Not Found)

  ```json
  { "error": "Not found" }
  ```

---

### [Collection Runs — Export Responses]

* **URL String:** `/collection-runs/:id/export-responses`
* **HTTP Protocol Method:** `GET`
* **Required Header Keys:** None
* **Request Payload Schema:** None

* **Description:** Returns a raw JSON array containing only the parsed response bodies of **successful** endpoints in execution order. Joins `CollectionRunResults` to `ApiResults` on (`ApiEndpointId`, `ExecutedAt`). No metadata wrapper — each array element is exactly what the target API returned. Served with a `Content-Disposition: attachment` header (`collection-run-<id>-responses.json`).

* **Response:**

  Success (200 OK)

  ```json
  [
    { "reportId": "R-100", "status": "queued" },
    { "rows": [1, 2, 3] }
  ]
  ```

---

### [Scheduler — Status]

* **URL String:** `/scheduler/status`
* **HTTP Protocol Method:** `GET`
* **Required Header Keys:** None
* **Request Payload Schema:** None

* **Description:** Reports whether the background schedule runner is currently ticking. The scheduler does **not** auto-start on server boot — it must be started explicitly.

* **Response:**

  Success (200 OK)

  ```json
  { "running": false }
  ```

---

### [Scheduler — Start]

* **URL String:** `/scheduler/start`
* **HTTP Protocol Method:** `POST`
* **Required Header Keys:** None
* **Request Payload Schema:** None

* **Response:**

  Success (200 OK)

  ```json
  { "running": true }
  ```

---

### [Scheduler — Stop]

* **URL String:** `/scheduler/stop`
* **HTTP Protocol Method:** `POST`
* **Required Header Keys:** None
* **Request Payload Schema:** None

* **Response:**

  Success (200 OK)

  ```json
  { "running": false }
  ```

---

### [Dashboard — Stats]

* **URL String:** `/dashboard`
* **HTTP Protocol Method:** `GET`
* **Required Header Keys:** None
* **Request Payload Schema:** None

* **Response:**

  Success (200 OK)

  ```json
  {
    "totalEndpoints": 10,
    "passCount": 7,
    "failCount": 3,
    "averageLatencyMs": 245,
    "totalSchedules": 5,
    "totalValidationRules": 12,
    "recentCollections": [
      {
        "collectionId": 1,
        "collectionName": "My Collection",
        "endpointCount": 4,
        "passCount": 3,
        "failCount": 1,
        "averageLatencyMs": 180,
        "lastRunAt": "2026-06-24 12:00:00"
      }
    ],
    "recentEndpoints": [
      {
        "id": 1,
        "name": "Get Users",
        "method": "GET",
        "url": "https://api.example.com/users",
        "statusCode": 200,
        "responseTimeMs": 120,
        "isSuccess": true,
        "executedAt": "2026-06-24 12:00:00"
      }
    ]
  }
  ```

  > **Note:** The response includes 6 stat fields (adding `totalSchedules` and `totalValidationRules`), plus `recentCollections` (top 5) and `recentEndpoints` (last 25) arrays. Each uses a subquery to return only the latest result per endpoint.

---

### [Environments — List All]

* **URL String:** `/environments`
* **HTTP Protocol Method:** `GET`
* **Required Header Keys:** None
* **Request Payload Schema:** None

* **Response:**

  Success (200 OK)

  ```json
  [
    {
      "id": 1,
      "name": "Production",
      "description": "Production API keys",
      "isDefault": true,
      "createdAt": "2026-06-24 10:00:00",
      "updatedAt": "2026-06-24 10:00:00"
    }
  ]
  ```

  Results are ordered with the default environment first (`IsDefault DESC`), then alphabetically by name.

---

### [Environments — Get Single with Variables]

* **URL String:** `/environments/:id`
* **HTTP Protocol Method:** `GET`
* **Required Header Keys:** None
* **Request Payload Schema:** None

* **Response:**

  Success (200 OK)

  ```json
  {
    "id": 1,
    "name": "Production",
    "description": "Production API keys",
    "isDefault": true,
    "createdAt": "2026-06-24 10:00:00",
    "updatedAt": "2026-06-24 10:00:00",
    "variables": [
      {
        "id": 1,
        "environmentId": 1,
        "key": "base_url",
        "value": "https://api.prod.example.com",
        "createdAt": "2026-06-24 10:00:00",
        "updatedAt": "2026-06-24 10:00:00"
      }
    ]
  }
  ```

  Error (404 Not Found)

  ```json
  { "error": "Not found" }
  ```

---

### [Environments — Create]

* **URL String:** `/environments`
* **HTTP Protocol Method:** `POST`
* **Required Header Keys:** `Content-Type: application/json`
* **Request Payload Schema:**

  ```json
  {
    "name": "Staging",
    "description": "Staging environment",
    "isDefault": false
  }
  ```

  If `isDefault: true`, all other environments are reset to non-default first.

* **Response:**

  Success (201 Created)

  ```json
  {
    "id": 2,
    "name": "Staging",
    "description": "Staging environment",
    "isDefault": false,
    "createdAt": "2026-06-24 12:00:00",
    "updatedAt": "2026-06-24 12:00:00"
  }
  ```

---

### [Environments — Update]

* **URL String:** `/environments/:id`
* **HTTP Protocol Method:** `PUT`
* **Required Header Keys:** `Content-Type: application/json`
* **Request Payload Schema:** All fields are optional.

  ```json
  {
    "name": "Updated Staging",
    "isDefault": true
  }
  ```

  If `isDefault: true`, all other environments are reset to non-default first.

* **Response:**

  Success (200 OK)

  ```json
  {
    "id": 2,
    "name": "Updated Staging",
    "isDefault": true,
    "...": "..."
  }
  ```

  Error (404 Not Found)

  ```json
  { "error": "Not found" }
  ```

---

### [Environments — Delete]

* **URL String:** `/environments/:id`
* **HTTP Protocol Method:** `DELETE`
* **Required Header Keys:** None
* **Request Payload Schema:** None

* **Response:**

  Success (204 No Content)

  *No response body.*

  Error (404 Not Found)

  ```json
  { "error": "Not found" }
  ```

---

### [Environments — Set Default]

* **URL String:** `/environments/:id/set-default`
* **HTTP Protocol Method:** `PUT`
* **Required Header Keys:** None
* **Request Payload Schema:** None

* **Description:** Sets the specified environment as the default (used by scheduled runs). Resets all other environments to non-default.

* **Response:**

  Success (200 OK)

  ```json
  {
    "id": 1,
    "name": "Production",
    "isDefault": true,
    "...": "..."
  }
  ```

  Error (404 Not Found)

  ```json
  { "error": "Not found" }
  ```

---

### [Environment Variables — List]

* **URL String:** `/environments/:id/variables`
* **HTTP Protocol Method:** `GET`
* **Required Header Keys:** None
* **Request Payload Schema:** None

* **Response:**

  Success (200 OK)

  ```json
  [
    {
      "id": 1,
      "environmentId": 1,
      "key": "base_url",
      "value": "https://api.prod.example.com",
      "createdAt": "2026-06-24 10:00:00",
      "updatedAt": "2026-06-24 10:00:00"
    }
  ]
  ```

  Error (404 — environment not found)

  ```json
  { "error": "Environment not found" }
  ```

---

### [Environment Variables — Create]

* **URL String:** `/environments/:id/variables`
* **HTTP Protocol Method:** `POST`
* **Required Header Keys:** `Content-Type: application/json`
* **Request Payload Schema:**

  ```json
  {
    "key": "api_token",
    "value": "abc123def456"
  }
  ```

* **Response:**

  Success (201 Created)

  ```json
  {
    "id": 2,
    "environmentId": 1,
    "key": "api_token",
    "value": "abc123def456",
    "createdAt": "2026-06-24 12:00:00",
    "updatedAt": "2026-06-24 12:00:00"
  }
  ```

  Error (404 — environment not found)

  ```json
  { "error": "Environment not found" }
  ```

---

### [Environment Variables — Update]

* **URL String:** `/environments/:id/variables/:varId`
* **HTTP Protocol Method:** `PUT`
* **Required Header Keys:** `Content-Type: application/json`
* **Request Payload Schema:** Both fields are optional.

  ```json
  {
    "key": "api_token",
    "value": "new_value_xyz"
  }
  ```

* **Response:**

  Success (200 OK)

  ```json
  {
    "id": 2,
    "environmentId": 1,
    "key": "api_token",
    "value": "new_value_xyz",
    "createdAt": "2026-06-24 12:00:00",
    "updatedAt": "2026-06-24 12:05:00"
  }
  ```

  Error (404 Not Found)

  ```json
  { "error": "Variable not found" }
  ```

---

### [Environment Variables — Delete]

* **URL String:** `/environments/:id/variables/:varId`
* **HTTP Protocol Method:** `DELETE`
* **Required Header Keys:** None
* **Request Payload Schema:** None

* **Response:**

  Success (204 No Content)

  *No response body.*

  Error (404 Not Found)

  ```json
  { "error": "Variable not found" }
  ```

## C3. Global Error Format

All endpoints may return errors in the following structure:

```json
{
  "error": "Human readable explanation of what failed."
}
```

500 errors may also appear as:

```json
{
  "success": false,
  "error": "ERROR_CODE_STRING",
  "message": "Human readable explanation of what failed."
}
```



