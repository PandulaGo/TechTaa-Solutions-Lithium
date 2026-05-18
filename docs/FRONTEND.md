# Lithium — Frontend Application Documentation

## Full Detailed Functionality

---

## 1. Tech Stack

| Layer          | Choice                                      |
| -------------- | ------------------------------------------- |
| Language       | TypeScript 5                                |
| Framework      | React 18                                    |
| Styling        | Tailwind CSS 4 (via `@tailwindcss/vite`)    |
| Build Tool     | Vite 8                                      |
| Routing        | React Router v6 (client-side SPA routing)   |
| HTTP Client    | Native `fetch` (no axios)                   |
| Color Scheme   | Dark theme (gray-950/900/800 palette)       |

---

## 2. Navigation & Layout

### Sidebar (fixed, 224px width)
- **7 navigation items** with Unicode icons:
  | # | Icon | Label           | Route          |
  |---|------|-----------------|----------------|
  | 1 | ◉    | Dashboard       | `/`            |
  | 2 | ⬡    | Endpoints       | `/endpoints`   |
  | 3 | ◷    | Schedules       | `/schedules`   |
  | 4 | ✓    | Validation      | `/validation`  |
  | 5 | ☰    | Results         | `/results`     |
  | 6 | ⇅    | Export/Import   | `/export`      |
  | 7 | ?    | Reference       | `/reference`   |

- **Active state**: Purple background with purple text (`bg-purple-900/50 text-purple-300`)
- **Inactive state**: Gray text, hover highlights to lighter gray
- **Header area**: App name "Lithium" (bold, purple) + subtitle "API Testing & Monitoring" (small, gray)
- **Main content area**: Fills remaining width, scrollable overflow, padded

### Responsive Behavior
- Sidebar stays fixed at 224px
- Content area scrolls independently
- Minimum viewport height: `h-screen` (100vh)

---

## 3. Dashboard Page

**Route**: `/`  
**Purpose**: Real-time overview of all endpoint health and execution stats

### Stats Cards Row (4 cards in grid)
| Card            | Data Source            | Color    |
| --------------- | ---------------------- | -------- |
| Total Endpoints | `stats.totalEndpoints` | Blue     |
| Passed          | `stats.passCount`      | Green    |
| Failed          | `stats.failCount`      | Red      |
| Avg Latency     | `stats.averageLatencyMs` | Yellow |

- Each card: gray-900 background, border-gray-800, padded
- Label: small gray text; Value: 2xl bold colored text

### Auto-Refresh Polling
- `setInterval` runs every **5 seconds**
- On each tick, fires **3 parallel API calls**:
  1. `GET /api/dashboard` → stats cards
  2. `GET /api/endpoints` → endpoint list
  3. `GET /api/results?pageSize=200` → latest result per endpoint
- Clears interval on component unmount
- Data merges: latest result per `apiEndpointId` wins

### Endpoint Status Grid (Table)
| Column     | Content                                                        |
| ---------- | -------------------------------------------------------------- |
| Name       | Endpoint name (plain text)                                     |
| Method     | Color-coded badge: GET=green, POST=blue, PUT=yellow, DELETE=red, PATCH=purple |
| URL        | Truncated with `max-w-48 truncate`, gray text                  |
| Status     | ✓ Pass (green) / ✗ Fail (red) / — (gray, never run)           |
| Code       | Status code badge: 2xx=green, other=red / — (never run)        |
| Latency    | `{ms} ms` or —                                                 |
| Last Run   | Formatted locale time or "Never"                               |

### Empty State
- Full-width table row: "No endpoints yet" centered in gray-600

---

## 4. Endpoints Page

**Route**: `/endpoints`  
**Purpose**: Full CRUD for API endpoint definitions with request builder

### Toolbar
- **"Run Selected (N)" button**: Appears when ≥1 endpoint is checked. Sends `POST /api/endpoints/bulk-run` with selected IDs. Shows alert with per-endpoint status/code/pass summary.

### Selection
- Checkbox per row + Select All checkbox in header
- Select All: toggles between all selected ↔ none selected
- `selectedIds` tracked as `Set<number>` in state

### Create/Edit Endpoint Form (collapsible)
Toggles open/closed via "New Endpoint" / "Cancel" buttons. Opens in edit mode when clicking an endpoint row.

#### Basic Fields
| Field        | Input Type | Notes                          |
| ------------ | ---------- | ------------------------------ |
| Name         | text       | Required                       |
| Collection   | dropdown   | Populated from `GET /api/collections`; "No Collection" default |
| Description  | text       | Optional                       |
| Method       | dropdown   | GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS |
| URL          | text       | Full URL                       |

#### Headers Section (collapsible `<details>`)
- Uses `KeyValueEditor` reusable component
- Each row: Key input + Value input + ✕ remove button
- "+ Add header" button appends empty pair
- On save: converts array to `{"key1":"val1","key2":"val2"}` JSON string

#### Body Section (collapsible `<details>`)
| Field       | Input Type | Notes                                      |
| ----------- | ---------- | ------------------------------------------ |
| Body Type   | dropdown   | JSON, Form Data, x-www-form-urlencoded, Raw Text |
| Body Text   | textarea   | monospace font, 8 rows height              |

#### Authentication Section (collapsible `<details>`)
| Field       | Input Type | Notes                                      |
| ----------- | ---------- | ------------------------------------------ |
| Auth Type   | dropdown   | None, Bearer, Basic, API Key, OAuth2       |
| Auth Config | textarea   | monospace font, 6 rows, JSON format        |

Auth config formats:
```json
Bearer:  {"token": "abc123"}
Basic:   {"username": "admin", "password": "pass"}
ApiKey:  {"key": "X-API-Key", "value": "secret", "placement": "Header"}
OAuth2:  {"access_token": "..."}
```

#### Save Flow
1. Serializes headers to JSON string
2. Sends `POST /api/endpoints` (create) or `PUT /api/endpoints/{id}` (update)
3. Closes form, resets fields, reloads endpoint list

### Endpoints Table
| Column     | Content                                                        |
| ---------- | -------------------------------------------------------------- |
| Checkbox   | Multi-select for bulk operations                               |
| Name       | Clickable → opens edit form                                    |
| Method     | Color-coded badge (green GET, blue POST, yellow PUT, red DELETE, gray others) |
| URL        | Truncated, gray text                                           |
| Collection | Collection name or —                                           |
| Auth       | Auth type or "None"                                            |
| Actions    | Run (green) / Edit (blue) / Delete (red) — all as text buttons |

### Manual Run
- "Run" button per row → `POST /api/endpoints/{id}/run`
- Result shown via `alert()`: status code, response time, pass/fail

### Delete
- `confirm()` dialog before `DELETE /api/endpoints/{id}`
- Refreshes list on success

---

## 5. Schedules Page

**Route**: `/schedules`  
**Purpose**: Configure per-endpoint periodic execution intervals

### Toolbar
- "+ New Schedule" button toggles form visibility

### Create Schedule Form (collapsible)
| Field      | Input Type | Notes                          |
| ---------- | ---------- | ------------------------------ |
| Endpoint   | dropdown   | All endpoints from `GET /api/endpoints` |
| Interval   | number     | Seconds between runs, min 1    |

- "Create" button → `POST /api/schedules?endpointId={id}`
- "Cancel" button hides form

### Schedules Table
| Column   | Content                                                        |
| -------- | -------------------------------------------------------------- |
| Endpoint | Name or ID fallback                                            |
| Interval | Human-readable: `30s`, `2m 30s`, `1h 15m`                      |
| Status   | Toggle button: "On" (green) / "Off" (gray) — click toggles     |
| Last Run | Formatted locale datetime or "Never"                           |
| Next Run | Formatted locale datetime                                      |
| Actions  | Delete (red text)                                              |

### Toggle Behavior
- Calls `PUT /api/schedules/{id}` with `{ isEnabled: !current }`
- Refreshes table

### Delete
- `confirm()` dialog → `DELETE /api/schedules/{id}`

### Interval Formatting Logic
```
< 60s         →  "30s"
< 3600s       →  "2m 30s"
≥ 3600s       →  "1h 15m"
```

---

## 6. Validation Rules Page

**Route**: `/validation`  
**Purpose**: Define assertions that determine pass/fail for each endpoint's responses

### Filter Chips
- "All" button (active when no endpoint filter)
- One button per endpoint (shows endpoint name)
- Clicking filters rules by `endpointId` query param

### Create Rule Form (collapsible)
| Field         | Input Type | Notes                                    |
| ------------- | ---------- | ---------------------------------------- |
| Endpoint      | dropdown   | All endpoints from API                   |
| Rule Type     | dropdown   | StatusCode, ResponseTime, JsonPath, BodyContains, HeaderExists |
| Comparison    | dropdown   | Equals, NotEquals, GreaterThan, LessThan, Contains, NotContains |
| Expected Value| text       | The value to compare against             |
| Order         | number     | Execution order of rules                 |

### Rule Types & What They Validate
| Rule Type     | Validates                                            | Expected Value Example                               |
| ------------- | ---------------------------------------------------- | ---------------------------------------------------- |
| StatusCode    | HTTP response status code                            | `200` or `201`                                       |
| ResponseTime  | Response latency in milliseconds                     | `5000` (with LessThan = must be under 5s)            |
| JsonPath      | JSON path query on response body                     | `$.data.id = 42` or `$.total > 0`                    |
| BodyContains  | Substring presence in response body                  | `"success"` or `"orderId"`                           |
| HeaderExists  | Presence of a specific response header               | `Content-Type` or `X-Request-Id`                     |

### JsonPath Format
```
"$.path.to.field = expectedValue"   — path SPACE=SPACE expected
"$.data.items[0].name = John"
"$.total > 0"
```

### Rules Table
| Column    | Content                                    |
| --------- | ------------------------------------------ |
| Endpoint  | Name or ID fallback                        |
| Type      | Rule type string                           |
| Expected  | Expected value                             |
| Compare   | Comparison type                            |
| Order     | Execution order number                     |
| Status    | "On" (green) / "Off" (gray) badge          |
| Actions   | Delete (red text)                          |

---

## 7. Results / History Page

**Route**: `/results`  
**Purpose**: Browse execution history with full request/response inspection

### Filters & Pagination
| Control         | Type      | Behavior                                      |
| --------------- | --------- | --------------------------------------------- |
| Endpoint filter | dropdown  | "All Endpoints" + list. Resets to page 1.     |
| Pass/Fail filter| dropdown  | "All Results" / "Passed Only" / "Failed Only" |
| Previous page   | button    | Decrements page (min 1)                       |
| Page indicator  | label     | Shows "Page N"                                |
| Next page       | button    | Increments page                               |

### Results Table
| Column   | Content                                                        |
| -------- | -------------------------------------------------------------- |
| Endpoint | Name or ID fallback                                            |
| Status   | Color badge (2xx=green, other=red)                             |
| Code     | Numeric status code                                            |
| Latency  | `{ms} ms`                                                      |
| Result   | ✓ Pass (green) / ✗ Fail (red)                                  |
| Error    | Truncated error message or —                                   |
| Time     | Full locale datetime string                                    |

### Expandable Row (click to toggle)
Clicking a row expands it inline to show full response details:

#### Expanded View
| Section          | Content                                                        |
| ---------------- | -------------------------------------------------------------- |
| Response Headers | Pretty-printed JSON in `<pre>` block with gray-950 background  |
| Response Body    | Auto-formatted: tries `JSON.stringify(JSON.parse(), null, 2)`, falls back to raw text |
| Request Body     | Only shown if non-null; same formatting as response body       |

- Click row again to collapse
- Background color changes on expanded row (`bg-gray-850`)

---

## 8. Export / Import Page

**Route**: `/export`  
**Purpose**: Export endpoints to JSON files and import them back

### Layout
Two equal columns (`grid grid-cols-2 gap-6`), each in a card.

### Message Banner
- **Success**: Green background, green border
- **Error**: Red background, red border
- Shows on export/import completion or error

### Left Panel — Export
- **Checkbox list** of all endpoints (scrollable, `max-h-64`)
- **"Export Selected (N)"** button (disabled if 0 selected)
- Download flow:
  1. Calls `GET /api/endpoints/export?ids=1,2,3`
  2. Creates JSON `Blob` with `application/json` MIME type
  3. Generates object URL, creates hidden `<a>` element
  4. Programmatic click triggers browser download as `lithium-export.json`
  5. Revokes object URL

### Right Panel — Import
- **Hidden file input** (`<input type="file" accept=".json">`)
- **"Import from File" button** triggers file picker
- Import flow:
  1. Reads file as text via `FileReader`/`.text()`
  2. `JSON.parse()` validates structure
  3. `POST /api/endpoints/import` with parsed payload
  4. Shows result count (e.g. "Imported 3 endpoint(s)")
  5. Refreshes endpoint list

### Sample Import JSON Format (collapsible)
A `<details>` section below the two panels showing a **complete template** with 3 worked examples:

#### Example 1: GET with Bearer Auth + Schedule + 3 Rules
- Name: "Get Users"
- Method: GET
- Headers: Authorization + Accept as JSON string (escaped)
- Auth: Bearer token
- Schedule: 300s interval
- Rules: StatusCode=200, ResponseTime<5000ms, JsonPath=$.total>0

#### Example 2: POST with JSON Body + Schedule + 2 Rules
- Name: "Create Order"
- Method: POST
- Body: Full JSON payload (customerId, items array, shippingAddress nested object)
- BodyType: "json"
- Auth: Bearer token
- Schedule: 60s interval
- Rules: StatusCode=201, BodyContains="orderId"

#### Example 3: GET Health Check (No Auth) + 2 Rules
- Name: "Health Check"
- Method: GET
- Auth: None
- Schedule: 10s interval
- Rules: StatusCode=200, ResponseTime<1000ms

Each example shows every possible field so users can copy and edit their own import files.

---

## 9. Reference Page

**Route**: `/reference`  
**Purpose**: Complete documentation of the import JSON format for building import files

### Field Reference Table
Full-width table with columns: **Field**, **Required** (Yes/No), **Type**, **Description**, **Valid Options/Examples**

Covers all 19 fields:
- Root: `name`, `description`, `method`, `url`, `headers`, `body`, `bodyType`, `authType`, `authConfig`, `collectionName`
- Schedule sub-object: `schedule`, `schedule.intervalSeconds`, `schedule.isEnabled`
- Validation rule sub-array: `validationRules`, `validationRules[].ruleType`, `validationRules[].expectedValue`, `validationRules[].comparisonType`, `validationRules[].order`, `validationRules[].isEnabled`

### Validation Rule Types — Detailed
5 expandable cards, one per rule type. Clicking expands a description:
- **StatusCode**: Checks HTTP status code matches expected
- **ResponseTime**: Checks latency vs threshold
- **JsonPath**: Queries JSON body with JSONPath syntax (`$.path = value`)
- **BodyContains**: Checks substring presence in response body
- **HeaderExists**: Checks response header exists (case-insensitive)

### Comparison Types Table
| Type | Meaning | Valid for Rule Types |
|---|---|---|
| Equals | Exact match | All |
| NotEquals | Must not match | All |
| GreaterThan | > expected | StatusCode, ResponseTime |
| LessThan | < expected | StatusCode, ResponseTime |
| Contains | Contains substring | JsonPath, BodyContains |
| NotContains | Does not contain | JsonPath, BodyContains |

### authConfig Formats
5 cards showing the JSON config per auth type, plus the behavior description:
- **None**: `null`
- **Bearer**: `{"token":"eyJ..."}` → adds `Authorization: Bearer` header
- **Basic**: `{"username":"admin","password":"pass"}` → Base64 encodes, adds `Authorization: Basic` header
- **API Key**: `{"key":"X-API-Key","value":"sk-abc","placement":"Header"}` → adds as header or query param
- **OAuth2**: `{"access_token":"ya29..."}` → adds `Authorization: Bearer` header

### Full Sample JSON (collapsible)
Toggle section showing a complete 2-endpoint import file with GET and POST examples.

---

## 10. Reusable Components

### KeyValueEditor
- **Props**: `pairs: KeyValue[]`, `onChange: (pairs: KeyValue[]) => void`
- **KeyValue interface**: `{ key: string; value: string }`
- Displays each pair as a row (key input + value input + ✕ remove button)
- "+ Add header" button appends empty pair
- Changes propagate to parent via `onChange` callback
- Used for: Headers editing in Endpoints form

### Method Badge (inline in Dashboard)
- Accepts `method` string
- Color mapping:
  - GET → green
  - POST → blue
  - PUT → yellow
  - DELETE → red
  - PATCH → purple
  - default → gray
- Styled: small pill (`text-xs px-2 py-0.5 rounded border`)

### Status Code Badge (inline in Dashboard)
- Accepts `code` number
- 2xx range → green
- All others → red

---

## 11. API Client Layer (`services/api.ts`)

### Architecture
- Single `API_BASE = '/api'` constant
- Generic `request<T>(url, options)` function wraps `fetch`
- JSON content-type header included by default
- Throws on non-ok responses

### Endpoint Mappings
| API Method | Client Function             | HTTP Call                          |
| ---------- | --------------------------- | ---------------------------------- |
| GET        | `getEndpoints(collectionId?)` | `GET /api/endpoints`              |
| GET        | `getEndpoint(id)`           | `GET /api/endpoints/{id}`         |
| POST       | `createEndpoint(data)`      | `POST /api/endpoints`             |
| PUT        | `updateEndpoint(id, data)`  | `PUT /api/endpoints/{id}`         |
| DELETE     | `deleteEndpoint(id)`        | `DELETE /api/endpoints/{id}`      |
| POST       | `runEndpoint(id)`           | `POST /api/endpoints/{id}/run`    |
| POST       | `bulkRun(ids)`              | `POST /api/endpoints/bulk-run`    |
| GET        | `exportEndpoints(ids)`      | `GET /api/endpoints/export?ids=1,2` |
| POST       | `importEndpoints(data)`     | `POST /api/endpoints/import`      |
| GET        | `getCollections()`          | `GET /api/collections`            |
| POST       | `createCollection(data)`    | `POST /api/collections`           |
| PUT        | `updateCollection(id, data)`| `PUT /api/collections/{id}`       |
| DELETE     | `deleteCollection(id)`      | `DELETE /api/collections/{id}`    |
| GET        | `getSchedules(endpointId?)` | `GET /api/schedules`              |
| POST       | `createSchedule(eid, data)` | `POST /api/schedules?endpointId=` |
| PUT        | `updateSchedule(id, data)`  | `PUT /api/schedules/{id}`         |
| DELETE     | `deleteSchedule(id)`        | `DELETE /api/schedules/{id}`      |
| GET        | `getValidationRules(epid?)` | `GET /api/validation-rules`       |
| POST       | `createValidationRule(eid,d)`| `POST /api/validation-rules?endpointId=` |
| PUT        | `updateValidationRule(id,d)`| `PUT /api/validation-rules/{id}`  |
| DELETE     | `deleteValidationRule(id)`  | `DELETE /api/validation-rules/{id}` |
| GET        | `getResults(params)`        | `GET /api/results` (with query string) |
| GET        | `getResult(id)`             | `GET /api/results/{id}`           |
| GET        | `getDashboard()`            | `GET /api/dashboard`              |

---

## 12. Type Definitions (`types/index.ts`)

All TypeScript interfaces mirror the backend DTOs and entity models:

```
Collection        → id, name, description, createdAt, updatedAt, endpoints?
ApiEndpoint       → id, collectionId, name, description, method, url,
                     headers, body, bodyType, authType, authConfig,
                     createdAt, updatedAt, collection?, schedules?,
                     validationRules?
Schedule          → id, apiEndpointId, isEnabled, intervalSeconds,
                     lastRunAt, nextRunAt, createdAt, updatedAt, apiEndpoint?
ApiResult         → id, apiEndpointId, statusCode, responseTimeMs,
                     responseHeaders, responseBody, requestBody,
                     requestHeaders, isSuccess, errorMessage, executedAt,
                     apiEndpoint?
ValidationRule    → id, apiEndpointId, ruleType, expectedValue,
                     comparisonType, isEnabled, order
DashboardStats    → totalEndpoints, passCount, failCount, averageLatencyMs
KeyValue          → key, value (for headers editor)
ExportedEndpoint  → name, description, method, url, headers, body, bodyType,
                     authType, authConfig, collectionName, schedule?,
                     validationRules[]
ExportedSchedule  → intervalSeconds, isEnabled
ExportedValidationRule → ruleType, expectedValue, comparisonType, order, isEnabled
ExportPayload     → endpoints: ExportedEndpoint[]
```

---

## 13. Error Handling & States

### Empty States
- All tables: centered "No X yet" message in gray-600 when array is empty
- Dashboard: "No endpoints yet" when no endpoints exist
- Results: "No results yet" when no history
- Export: "No endpoints" when no endpoints to select

### API Errors
- All `catch` blocks log to `console.error`
- Export/Import page: shows user-facing error in colored message banner
- No page crashes on API failure
- No loading spinners (implicit loading)

### User Confirmations
- Delete operations: native `confirm()` dialog before proceeding
- "Delete this endpoint/schedule/rule?"

### User Feedback
- Manual run results: `alert()` with status, time, pass/fail
- Bulk run results: `alert()` with per-endpoint summary
- Export/Import: colored message banner at top of page

---

## 14. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                             BROWSER                                 │
│                                                                     │
│  User clicks button / navigates                                     │
│         │                                                           │
│         ▼                                                           │
│  React component handler                                            │
│         │                                                           │
│         ▼                                                           │
│  api.ts (fetch wrapper)                                             │
│         │                                                           │
│         ▼                     Vite Proxy (dev only)                 │
│  GET/POST /api/*  ──────────────────────────────────┐               │
│                                                     │               │
├─────────────────────────────────────────────────────│───────────────┤
│                                                     ▼               │
│  ASP.NET Core Web API                         localhost:10021       │
│         │                                                           │
│         ▼                                                           │
│  Controller → Service → EF Core → SQLite (lithium.db)               │
│         │                                                           │
│         ▼                                                           │
│  JSON Response                                                      │
│         │                                                           │
├─────────│───────────────────────────────────────────────────────────┤
│         ▼                                                           │
│  useState setter                                                    │
│         │                                                           │
│         ▼                                                           │
│  React re-render → UI updates                                       │
│                                                                     │
│  ┌─ Dashboard polling loop (every 5s) ─────────────────────────┐    │
│  │  setInterval → api.getDashboard()                            │    │
│  │             → api.getEndpoints()                             │    │
│  │             → api.getResults(pageSize=200)                   │    │
│  │             → useState → re-render                           │    │
│  └──────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 15. Backend Execution Flow (for context)

```
ScheduleRunner tick → every 1 second
  ├─ Find all enabled schedules where (now >= NextRunAt)
  ├─ For each due endpoint (max 5 concurrent via SemaphoreSlim):
  │   ├─ ApiExecutionService:
  │   │   ├─ Apply auth (Bearer/Basic/API Key/OAuth2)
  │   │   ├─ Apply headers from JSON config
  │   │   ├─ Apply body with content-type
  │   │   ├─ Send HTTP request (30s timeout)
  │   │   └─ Capture: status code, latency, response headers/body
  │   ├─ ValidationService:
  │   │   ├─ Load all enabled rules for endpoint (ordered)
  │   │   ├─ Evaluate each rule against response
  │   │   └─ Determine pass/fail (all rules must pass)
  │   ├─ Save ApiResult to database
  │   └─ Update Schedule.LastRunAt / NextRunAt
  └─ Loop
```

---

## 16. Port Configuration

| Service   | HTTP    | HTTPS   | URL                            |
| --------- | ------- | ------- | ------------------------------ |
| Backend   | 10021   | 10022   | `http://localhost:10021`       |
| Frontend  | 10025   | —       | `http://localhost:10025`       |
| Proxy     | Vite    | —       | `/api` → `localhost:10021`     |

---

## 17. Running the Application

### Option A: Scripts
```
start-backend.bat     → launches backend on :10021
start-frontend.bat    → launches frontend on :10025
```

### Option B: Manual
```
# Terminal 1 (backend)
cd backend/LithiumApp.Api
dotnet run

# Terminal 2 (frontend)
cd frontend
npm run dev
```
