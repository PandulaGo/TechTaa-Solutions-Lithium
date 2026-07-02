# System Architecture Specification

## Lithium — API Testing & Monitoring Platform

> **AI Instruction:** Analyze the project directory tree, backend services, and frontend pages. Provide a high-level overview of the product ecosystem below.

## 1. High-Level Executive Summary

- **Core Purpose:** A full-stack API testing and monitoring application that allows users to define API endpoints, execute HTTP requests, schedule recurring test runs, validate responses against configurable rules, and track historical results. The platform provides a dashboard for at-a-glance health monitoring.
- **Target Audience:** Developers, QA engineers, and API administrators who need to test, monitor, and validate API endpoints on a recurring basis.

## 2. Component Blueprint & Tech Stack

- **Frontend Layer:** React 19, TypeScript 6, React Router v6, Tailwind CSS v4 (via `@tailwindcss/vite` plugin), Vite 8 dev server on port 10025. State management via React Context (`ThemeContext`, `ToastContext`). No external state library.
- **Backend/API Layer:** Node.js runtime, Express v5 framework, TypeScript executed via `tsx` (watch mode in development). Runs on port 10021. CORS enabled. JSON body parsing with 10 MB limit.
- **Data Persistence Layer:** SQLite via `better-sqlite3` v12 (synchronous, high-performance driver). WAL journal mode enabled. Foreign key constraints enforced. Single database file (`lithium.db`) in the project root.
- **External Integrations:** None. Uses native Node.js `http`/`https` modules and global `fetch()` for outbound HTTP calls. Self-signed certificate bypass for localhost targets via `rejectUnauthorized: false`.

## 3. Data Flow & Communication Lifecycle

1. **Authentication Flow:** No authentication layer is implemented. The application is designed for local/trusted-network use only.
2. **Core Feature Read/Write Flow:**
   - Frontend (React) → Vite dev server (port 10025) → Vite proxy (`/api/*` → `http://localhost:10021`) → Express router → Route handler → `better-sqlite3` query → SQLite database (WAL) → Response returned through chain.
3. **Schedule Runner Flow:** The `scheduleRunner.ts` service runs a background interval (1-second tick) within the Express process. On each tick it queries `Schedules` for due items, executes the associated endpoint via `apiExecution.ts`, validates the result via `validation.ts`, writes results to `ApiResults`, and updates the next run time.
4. **Endpoint Execution Flow:** User triggers a run or bulk-run → Express route handler → `executeEndpoint()` in `apiExecution.ts` → builds request headers/auth → detects localhost URLs (uses Node.js `http`/`https` with `rejectUnauthorized: false`) vs. remote URLs (uses global `fetch()` with 30s timeout) → returns `ExecutionResult` → validates against rules → persists to `ApiResults`.
5. **Export/Import Flow:** Selecting endpoints for export → `GET /api/endpoints/export?ids=...` → joins `ApiEndpoints`, `Collections`, `Schedules`, `ValidationRules` → returns structured JSON payload. Import reverses the process via `POST /api/endpoints/import`, auto-creating missing collections.
