# System Architecture Specification

## Lithium — API Testing & Monitoring Platform

> **AI Instruction:** Analyze the project directory tree, backend services, and frontend pages. Provide a high-level overview of the product ecosystem below.

## 1. High-Level Executive Summary

- **Core Purpose:** A full-stack API testing and monitoring application that allows users to define API endpoints (grouped into collections), execute HTTP requests, schedule recurring test runs, validate responses against configurable rules, and track historical results. Supports environment variables with `{{var}}` interpolation at runtime and export/import for sharing endpoint configurations.
- **Target Audience:** Developers, QA engineers, and API administrators who need to test, monitor, and validate internal/external API endpoints on an ad-hoc or recurring basis.

## 2. Component Blueprint & Tech Stack

- **Frontend Layer:** React 19, TypeScript 6, React Router v7, Tailwind CSS v4 (via `@tailwindcss/vite` plugin), Vite 8 dev server on port 10025. State management via React Context (`ThemeContext`, `ToastContext`, `EnvironmentContext`, `FontSizeContext`). No external state library.
- **Backend/API Layer:** Node.js runtime (v24.16.0 at `C:\Program Files\nodejs`), Express v5 framework, TypeScript executed via `tsx` (watch mode in development). Runs on port 10021. CORS enabled. JSON body parsing with 10 MB limit.
- **Data Persistence Layer:** SQLite via `better-sqlite3` v12 (synchronous, high-performance driver). WAL journal mode enabled. Foreign key constraints enforced. Single database file at `frontend/lithium.db`.
- **External Integrations:** None. Uses native Node.js `http`/`https` modules and global `fetch()` for outbound HTTP calls. Self-signed certificate bypass for localhost targets via `rejectUnauthorized: false`.

## 3. Data Flow & Communication Lifecycle

1. **Authentication Flow:** No authentication layer is implemented. The application is designed for local/trusted-network use only.
2. **Core Feature Read/Write Flow:**
   - Frontend (React) → Vite dev server (port 10025) → Vite proxy (`/api/*` → `http://localhost:10021`) → Express router → Route handler → `better-sqlite3` query → SQLite database (WAL) → Response returned through chain.
3. **Schedule Runner Flow:** The `scheduleRunner.ts` service runs a background interval (1-second tick) within the Express process. On each tick it queries `Schedules` for due items, executes the associated endpoint via `apiExecution.ts` (using the default environment for variable interpolation), validates the result via `validation.ts`, writes results to `ApiResults`, and updates `lastRunAt`/`nextRunAt`.
4. **Endpoint Execution Flow:** User triggers a run or bulk-run (optionally passing `environmentId`) → Express route handler → `interpolateEndpoint()` in `variableInterpolation.ts` replaces `{{key}}` placeholders with environment variable values → `executeEndpoint()` in `apiExecution.ts` → builds request headers/auth → detects localhost URLs (uses Node.js `http`/`https` with `rejectUnauthorized: false`) vs. remote URLs (uses global `fetch()` with 30s `AbortSignal.timeout`) → returns `ExecutionResult` → validates against enabled rules → persists to `ApiResults`.
5. **Export/Import Flow:** Selecting endpoints for export → `GET /api/endpoints/export?ids=...` → joins `ApiEndpoints`, `Collections`, `Schedules`, `ValidationRules` → parses JSON string fields into objects → returns structured JSON payload. Import reverses the process via `POST /api/endpoints/import`, auto-creating missing collections, accepting both JSON string and object formats for `headers`/`body`/`authConfig`.
6. **Environment Variable Flow:** User defines environments and variables on the Environments page → stored in `Environments` and `EnvironmentVariables` tables → frontend fetches environments via `EnvironmentContext` (active environment persisted in `localStorage` under `lithium-active-env`) → environment selector in sidebar → when executing endpoints, frontend passes `environmentId` → backend calls `interpolateEndpoint()` which queries `EnvironmentVariables` and performs `{{var}}` regex replacement across `url`, `headers`, `body`, and `authConfig`. Missing variables are left as-is.
7. **Dashboard Data Flow:** `GET /api/dashboard` → queries six aggregate stats (`totalEndpoints`, `passCount`, `failCount`, `averageLatencyMs`, `totalSchedules`, `totalValidationRules`) plus `recentCollections` (top 5) and `recentEndpoints` (last 25) using subqueries that pick the latest result per endpoint → returned as a single JSON payload.

## 4. Component Map — Frontend Pages & Navigation

| Route | Page | Description |
| :--- | :--- | :--- |
| `/` | DashboardPage | 6 stat cards (colored backgrounds), Recently Run Collections (top 5), Recently Run Endpoints (last 25) |
| `/endpoints` | EndpointsPage | Grouped by collection with collapsible sections, search bar, filter buttons (All/Has Schedule/Has Validation/Has Both), Schedule/Validation action columns, modal forms for edit/create/schedule/validation |
| `/environments` | EnvironmentsPage | Collapsible environment sections, inline variable CRUD, set-default toggle |
| `/results` | ResultsPage | Filterable by endpoint, collection, pass/fail, date range; paginated; Schedule and Validation status columns |
| `/export` | ExportImportPage | Multi-select endpoints table → export JSON; paste JSON → import |
| `/reference` | ReferencePage | API reference/documentation |

**Sidebar navigation** (collapsible has been removed): Dashboard, Endpoints, Environments, Results, Export/Import, Reference. Also includes active environment dropdown selector, font size controls (A-/reset/A+), and dark/light mode toggle.

## 5. Key Architectural Decisions

- **Express route ordering** — static paths (`/export`, `/import`, `/bulk-run`) are registered before parameterized paths (`/:id`, `/:id/run`) to prevent Express from matching "export" as an `:id` parameter.
- **localhost TLS bypass** — uses native `node:https` with `rejectUnauthorized: false` only for localhost/127.0.0.1/::1 destinations; all other URLs use global `fetch()` with 30s timeout.
- **Schedules and Validation as modals** — schedule creation/editing and validation rule management happen via modal popups on the Endpoints page; standalone Schedules and Validation pages are read-only with search.
- **Environment variables excluded from import/export** — for security, environments are local-only and not shared in export JSON files.
- **Variable interpolation on the backend** — `{{var}}` replacement happens server-side just before request execution, not on the frontend.
- **Font size stored in localStorage** — under key `lithium-font-size`, applied via `document.documentElement.style.fontSize`.
- **No auto-refresh on Dashboard** — removed 5-second `setInterval` to prevent interrupting user edits.
