# Lithium — API Testing & Monitoring Application

A Postman-like application for creating, scheduling, monitoring, and validating HTTP APIs. Built with .NET, React, TypeScript, Tailwind CSS, and SQLite.

---

## Tech Stack

| Layer      | Choice                                      |
| ---------- | ------------------------------------------- |
| Backend    | ASP.NET Core 8 Web API                      |
| Frontend   | React 18 + TypeScript + Tailwind CSS (Vite) |
| Database   | SQLite + Entity Framework Core              |
| Scheduling | `BackgroundService` + `PeriodicTimer`       |
| Testing    | xUnit (backend), Vitest (frontend)          |

---

## Project Structure

```
LithiumApp/
├── backend/
│   ├── LithiumApp.Api/
│   │   ├── Controllers/
│   │   │   ├── ApiEndpointsController.cs
│   │   │   ├── CollectionsController.cs
│   │   │   ├── SchedulesController.cs
│   │   │   ├── ValidationRulesController.cs
│   │   │   ├── ApiResultsController.cs
│   │   │   └── DashboardController.cs
│   │   ├── Models/
│   │   │   ├── ApiEndpoint.cs
│   │   │   ├── Collection.cs
│   │   │   ├── Schedule.cs
│   │   │   ├── ApiResult.cs
│   │   │   └── ValidationRule.cs
│   │   ├── Data/
│   │   │   ├── AppDbContext.cs
│   │   │   └── Migrations/
│   │   ├── DTOs/
│   │   ├── Services/
│   │   │   ├── ApiExecutionService.cs
│   │   │   ├── ValidationService.cs
│   │   │   ├── ScheduleRunner.cs
│   │   │   └── ExportImportService.cs
│   │   ├── Program.cs
│   │   └── appsettings.json
│   └── LithiumApp.sln
├── frontend/
│   ├── src/
│   │   ├── components/   (reusable UI)
│   │   ├── pages/        (route-level pages)
│   │   ├── services/     (API client layer)
│   │   ├── hooks/        (custom React hooks)
│   │   ├── types/        (TypeScript interfaces)
│   │   ├── utils/        (helpers)
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── vite.config.ts
│   └── tsconfig.json
└── docs/
    └── PLANNING.md
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
  ├─ For each due endpoint (in parallel):
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

---

## Bulk Execution

- Select multiple endpoints in the grid → "Run All Selected"
- Results are stored per-endpoint in `ApiResults`
- Dashboard updates to reflect latest pass/fail for each
- Each endpoint runs independently, concurrency controlled by `SemaphoreSlim`

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
