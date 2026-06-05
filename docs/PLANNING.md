# Lithium — API Testing & Monitoring Application

A Postman-like application for creating, scheduling, monitoring, and validating HTTP APIs. Built with Node.js, Express, React, TypeScript, Tailwind CSS, and SQLite.

---

## Tech Stack

| Layer      | Choice                                      |
| ---------- | ------------------------------------------- |
| Backend    | Express + Node.js (TypeScript)              |
| Frontend   | React 18 + TypeScript + Tailwind CSS (Vite) |
| Database   | SQLite (better-sqlite3)                     |
| Scheduling | `setInterval` background service            |

---

## Project Structure

```
LithiumApp/
├── frontend/
│   ├── server/
│   │   ├── index.ts                    # Express entry point
│   │   ├── db.ts                       # SQLite setup + schema
│   │   ├── types.ts                    # Shared TypeScript types
│   │   ├── services/
│   │   │   ├── apiExecution.ts         # HTTP request execution
│   │   │   ├── validation.ts           # Rule validation logic
│   │   │   ├── scheduleRunner.ts       # Background scheduler
│   │   │   └── exportImport.ts         # JSON export/import
│   │   └── routes/
│   │       ├── endpoints.ts            # CRUD, run, bulk-run, export/import
│   │       ├── collections.ts          # CRUD, endpoints by collection
│   │       ├── schedules.ts            # CRUD
│   │       ├── validationRules.ts      # CRUD
│   │       ├── results.ts              # List, get by id
│   │       └── dashboard.ts            # Aggregate stats
│   ├── src/
│   │   ├── components/                 # Reusable UI components
│   │   │   └── KeyValueEditor.tsx
│   │   ├── pages/                      # Route-level pages
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── EndpointsPage.tsx
│   │   │   ├── SchedulesPage.tsx
│   │   │   ├── ValidationRulesPage.tsx
│   │   │   ├── ResultsPage.tsx
│   │   │   ├── ExportImportPage.tsx
│   │   │   └── ReferencePage.tsx
│   │   ├── services/                   # API client layer
│   │   │   └── api.ts
│   │   ├── types/                      # TypeScript interfaces
│   │   │   └── index.ts
│   │   ├── App.tsx                     # Layout + routing
│   │   ├── main.tsx                    # React entry point
│   │   ├── ThemeContext.tsx            # Dark/light mode
│   │   └── index.css                   # Tailwind CSS entry
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── docs/
│   ├── PLANNING.md
│   └── FRONTEND.md
├── start-backend.bat                   # Starts API + Web UI
└── start-frontend.bat                  # Web UI only
```

---

## Database Schema (SQLite)

### ApiEndpoints
| Column       | Type     | Notes                         |
| ------------ | -------- | ----------------------------- |
| Id           | int (PK) | Auto-increment                |
| CollectionId | int (FK) | Nullable, groups into folders |
| Name         | string   | Descriptive name              |
| Description  | string   | Nullable                      |
| Method       | string   | GET, POST, PUT, DELETE, etc.  |
| Url          | string   | Full URL with placeholders    |
| Headers      | string   | JSON array of key-value pairs |
| Body         | string   | Request body content          |
| BodyType     | string   | JSON, form-data, urlencoded, raw, GraphQL |
| AuthType     | string   | None, Bearer, Basic, ApiKey, OAuth2 |
| AuthConfig   | string   | JSON config per auth type     |
| CreatedAt    | datetime |                               |
| UpdatedAt    | datetime |                               |

### Collections
| Column      | Type     | Notes                        |
| ----------- | -------- | ---------------------------- |
| Id          | int (PK) | Auto-increment               |
| Name        | string   | Folder name                  |
| Description | string   | Nullable                     |
| CreatedAt   | datetime |                              |
| UpdatedAt   | datetime |                              |

### Schedules
| Column          | Type     | Notes                       |
| --------------- | -------- | --------------------------- |
| Id              | int (PK) | Auto-increment              |
| ApiEndpointId   | int (FK) | Links to endpoint           |
| IsEnabled       | bool     | Toggle on/off               |
| IntervalSeconds | int      | Seconds between runs        |
| LastRunAt       | datetime | Nullable                    |
| NextRunAt       | datetime | Nullable, computed          |
| CreatedAt       | datetime |                             |
| UpdatedAt       | datetime |                             |

### ApiResults
| Column          | Type     | Notes                                  |
| --------------- | -------- | -------------------------------------- |
| Id              | int (PK) | Auto-increment                         |
| ApiEndpointId   | int (FK) | Links to endpoint                      |
| StatusCode      | int      | HTTP response status                   |
| ResponseTimeMs  | long     | Latency in milliseconds                |
| ResponseHeaders | string   | JSON key-value pairs                   |
| ResponseBody    | string   | Response content                       |
| RequestBody     | string   | The actual request body sent           |
| RequestHeaders  | string   | The actual request headers sent        |
| IsSuccess       | bool     | All validation rules passed            |
| ErrorMessage    | string   | Nullable, captured exception message   |
| ExecutedAt      | datetime | Timestamp of execution                 |

### ValidationRules
| Column         | Type     | Notes                                        |
| -------------- | -------- | -------------------------------------------- |
| Id             | int (PK) | Auto-increment                               |
| ApiEndpointId  | int (FK) | Links to endpoint                            |
| RuleType       | string   | StatusCode, ResponseTime, JsonPath, BodyContains, HeaderExists |
| ExpectedValue  | string   | The expected value                           |
| ComparisonType | string   | Equals, NotEquals, GreaterThan, LessThan, Contains, NotContains |
| IsEnabled      | bool     | Toggle on/off                                |
| Order          | int      | Execution order                              |

---

## API Endpoints (Backend Controllers)

### ApiEndpoints
| Method   | Route                          | Description             |
| -------- | ------------------------------ | ----------------------- |
| GET      | `/api/endpoints`               | List all endpoints      |
| GET      | `/api/endpoints/{id}`          | Get single endpoint     |
| POST     | `/api/endpoints`               | Create endpoint         |
| PUT      | `/api/endpoints/{id}`          | Update endpoint         |
| DELETE   | `/api/endpoints/{id}`          | Delete endpoint         |
| POST     | `/api/endpoints/{id}/run`      | Manual trigger          |
| POST     | `/api/endpoints/bulk-run`      | Run multiple endpoints  |
| GET      | `/api/endpoints/export?ids=1,2`| Export as JSON          |
| POST     | `/api/endpoints/import`        | Import from JSON        |

### Collections
| Method   | Route                                  | Description                    |
| -------- | -------------------------------------- | ------------------------------ |
| GET      | `/api/collections`                     | List all collections           |
| GET      | `/api/collections/{id}`                | Get single collection          |
| GET      | `/api/collections/{id}/endpoints`      | Get endpoints in collection    |
| POST     | `/api/collections`                     | Create collection              |
| PUT      | `/api/collections/{id}`                | Update collection              |
| DELETE   | `/api/collections/{id}`                | Delete collection              |

### Schedules
| Method   | Route                   | Description              |
| -------- | ----------------------- | ------------------------ |
| GET      | `/api/schedules`        | List all schedules       |
| GET      | `/api/schedules/{id}`   | Get single schedule      |
| POST     | `/api/schedules`        | Create schedule          |
| PUT      | `/api/schedules/{id}`   | Update schedule          |
| DELETE   | `/api/schedules/{id}`   | Delete schedule          |

### ValidationRules
| Method   | Route                           | Description               |
| -------- | ------------------------------- | ------------------------- |
| GET      | `/api/validation-rules`         | List per endpoint         |
| GET      | `/api/validation-rules/{id}`    | Get single rule           |
| POST     | `/api/validation-rules`         | Create rule               |
| PUT      | `/api/validation-rules/{id}`    | Update rule               |
| DELETE   | `/api/validation-rules/{id}`    | Delete rule               |

### Dashboard & Results
| Method   | Route                | Description                                     |
| -------- | -------------------- | ----------------------------------------------- |
| GET      | `/api/results`       | List results with filters (endpoint, date, pass/fail) |
| GET      | `/api/results/{id}`  | Get single result with full response            |
| GET      | `/api/dashboard`     | Aggregate stats (totals, pass/fail, avg latency) |

### Export / Import
| Method   | Route                     | Description                        |
| -------- | ------------------------- | ---------------------------------- |
| GET      | `/api/endpoints/export?ids=1,2,3` | Export endpoints + rules + schedule as JSON |
| POST     | `/api/endpoints/import`   | Import JSON payload, create all entities |

---

## Auth Types Supported

| Auth Type     | Config Fields                                                  |
| ------------- | -------------------------------------------------------------- |
| None          | —                                                              |
| Bearer Token  | Token (encrypted at rest)                                      |
| Basic Auth    | Username, Password                                             |
| API Key       | Key name, Key value, Placement (Header / Query parameter)      |
| OAuth 2.0     | Grant type, Token URL, Client ID, Client Secret, Scope, Refresh Token |

Tokens and secrets are encrypted using ASP.NET Core Data Protection API before storing.

---

## Execution Flow

```
ScheduleRunner tick → every 1 second
  ├─ Find all enabled schedules where (now >= NextRunAt)
  ├─ For each due endpoint (max 5 concurrent):
  │   ├─ ApiExecutionService: apply auth, send HTTP request, capture response
  │   ├─ ValidationService: run all enabled rules, determine pass/fail
  │   ├─ Save ApiResult to database
  │   └─ Update Schedule.LastRunAt / NextRunAt
  └─ Loop
```


---

## Frontend Pages

### 1. Dashboard
- Summary cards: total endpoints, pass count, fail count, average latency
- Pass/Fail pie chart
- Endpoint status grid with live indicators
- Auto-refresh via short polling (configurable)

### 2. Endpoints
- Request builder: method selector, URL input, headers key-value editor, body editor (with syntax highlighting)
- Auth config section (type selector + relevant fields)
- Organized by collections (tree / folder view)
- Collection CRUD inline

### 3. Schedules
- Per-endpoint interval configuration (seconds, minutes, hours)
- Enable/disable toggle
- Display last run time, next run time
- Quick actions: pause all, resume all

### 4. Validation Rules
- Rule type selector: Status Code, Response Time, JSON Path, Body Contains, Header Exists
- Expected value input
- Comparison operator selector
- Enable/disable toggle per rule
- Drag-to-reorder rules

### 5. Results / History
- Table with columns: endpoint name, status code, latency, pass/fail, timestamp
- Filters: by endpoint, schedule, date range, pass/fail
- Click row → expand response viewer (status line, headers, body with pretty-print)
- Export results to CSV

### 6. Export / Import
- Select endpoints → export as JSON (includes nested schedules, rules)
- Import from JSON file → create all entities
- Duplicate detection on import
- Sample JSON format template shown inline for reference

### 7. Reference
- Full field reference table for import JSON format
- All 19 fields documented with required/optional, types, descriptions, valid options
- Validation rule types deep-dive with expandable detail cards
- Comparison types table with per-rule-type applicability
- Auth config format examples for all 5 auth types (Bearer, Basic, API Key, OAuth2, None)
- Full sample import JSON (collapsible) with 2 complete endpoint examples

---

## Bulk Execution

- Select multiple endpoints in the grid → "Run All Selected"
- Results are stored per-endpoint in `ApiResults`
- Dashboard updates to reflect latest pass/fail for each
- Each endpoint runs independently, concurrency controlled by `SemaphoreSlim`

---

## Port Configuration

| Service         | HTTP Port | HTTPS Port |
| --------------- | --------- | ---------- |
| Backend API     | 10021     | 10022      |
| Frontend (Vite) | 10025     | —          |

Vite proxies `/api/*` requests to `http://localhost:10021` in development.

---

## Running the Application

### Scripts
```
start-backend.bat     → launches API + Web UI (Express on :10021, Vite on :10025)
start-frontend.bat    → launches Web UI only (Vite on :10025)
```

### Manual
```
cd frontend
npm run dev        → starts both Express API + Vite dev server
npm run dev:api    → starts Express API only
npm run dev:web    → starts Vite dev server only
npm start          → starts Express API only (for production)
```

Open `http://localhost:10025` in your browser.

---

## Future Enhancements

- [ ] WebSocket push for real-time dashboard updates (instead of polling)
- [ ] GraphQL request support
- [ ] Environment variables (dev/staging/prod URL switching)
- [ ] Pre-request scripts (JavaScript execution before API call)
- [ ] Post-request scripts (JavaScript execution after API call)
- [ ] Test suites — group multiple endpoints into a test flow
- [ ] Alerting — email/webhook when an endpoint fails N times consecutively
- [ ] Docker deployment
- [ ] CI/CD integration (run Lithium as a build step)
