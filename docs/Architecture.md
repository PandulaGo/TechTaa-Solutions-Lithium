# Unified System Architecture, Schema & API Blueprint

## Lithium — API Testing & Monitoring Platform

---

## 1. System Architecture Specification

### Executive Summary

- **Core Purpose:** A full-stack API testing and monitoring application that allows users to define API endpoints, execute HTTP requests, schedule recurring test runs, validate responses against configurable rules, and track historical results. The platform provides a dashboard for at-a-glance health monitoring.
- **Target Audience:** Developers, QA engineers, and API administrators who need to test, monitor, and validate API endpoints on a recurring basis.

### Component Blueprint & Tech Stack

- **Frontend Layer:** React 19, TypeScript 6, React Router v6, Tailwind CSS v4 (via `@tailwindcss/vite` plugin), Vite 8 dev server on port 10025. State management via React Context (`ThemeContext`, `ToastContext`, `EnvironmentContext`, `FontSizeContext`). No external state library.
- **Backend/API Layer:** Node.js runtime, Express v5 framework, TypeScript executed via `tsx` (watch mode in development). Runs on port 10021. CORS enabled. JSON body parsing with 10 MB limit.
- **Data Persistence Layer:** SQLite via `better-sqlite3` v12 (synchronous, high-performance driver). WAL journal mode enabled. Foreign key constraints enforced. Single database file (`lithium.db`) in the `frontend/` directory.
- **External Integrations:** None. Uses native Node.js `http`/`https` modules and global `fetch()` for outbound HTTP calls. Self-signed certificate bypass for localhost targets via `rejectUnauthorized: false`.

### Data Flow & Communication Lifecycle

1. **Authentication Flow:** No authentication layer is implemented. The application is designed for local/trusted-network use only.
2. **Core Feature Read/Write Flow:**
   - Frontend (React) → Vite dev server (port 10025) → Vite proxy (`/api/*` → `http://localhost:10021`) → Express router → Route handler → `better-sqlite3` query → SQLite database (WAL) → Response returned through chain.
3. **Schedule Runner Flow:** The `scheduleRunner.ts` service runs a background interval (1-second tick) within the Express process. On each tick it queries `Schedules` for due items, executes the associated endpoint via `apiExecution.ts`, validates the result via `validation.ts`, writes results to `ApiResults`, and updates the next run time. Concurrency is limited to 5 simultaneous executions.
4. **Endpoint Execution Flow:** User triggers a run or bulk-run → Express route handler → `executeEndpoint()` in `apiExecution.ts` → builds request headers/auth → interpolates environment variables → detects localhost URLs (uses Node.js `http`/`https` with `rejectUnauthorized: false`) vs. remote URLs (uses global `fetch()` with 30s timeout) → returns `ExecutionResult` → validates against rules → persists to `ApiResults`.
5. **Export/Import Flow:** Selecting endpoints for export → `GET /api/endpoints/export?ids=...` → joins `ApiEndpoints`, `Collections`, `Schedules`, `ValidationRules` → returns structured JSON payload. Import reverses the process via `POST /api/endpoints/import`, auto-creating missing collections.
6. **Variable Interpolation Flow:** Endpoint execution resolves environment variables using `{{variableName}}` syntax. The `variableInterpolation.ts` service loads variables from the selected `EnvironmentVariables` table and substitutes them into URL, headers, body, and auth config before execution.

---

## 2. Database Schema & Data Models Matrix

### Entity Attributes

#### Entity: Collections

| Attribute Name | Storage Data Type | Key / Modifiers | Logical Field Description |
| :--- | :--- | :--- | :--- |
| `Id` | `INTEGER` | Primary Key / Auto-increment | Unique collection identifier |
| `Name` | `TEXT` | Not Null | Human-readable collection name |
| `Description` | `TEXT` | Nullable | Optional description of the collection |
| `CreatedAt` | `TEXT` | Not Null / Default `datetime('now')` | Timestamp of record creation |
| `UpdatedAt` | `TEXT` | Not Null / Default `datetime('now')` | Timestamp of last record update |

#### Entity: ApiEndpoints

| Attribute Name | Storage Data Type | Key / Modifiers | Logical Field Description |
| :--- | :--- | :--- | :--- |
| `Id` | `INTEGER` | Primary Key / Auto-increment | Unique endpoint identifier |
| `CollectionId` | `INTEGER` | Foreign Key → Collections.Id / Nullable / ON DELETE SET NULL | Parent collection this endpoint belongs to |
| `Name` | `TEXT` | Not Null | Human-readable endpoint name |
| `Description` | `TEXT` | Nullable | Optional description of the endpoint |
| `Method` | `TEXT` | Not Null / Default `'GET'` | HTTP method (GET, POST, PUT, DELETE, etc.) |
| `Url` | `TEXT` | Not Null | Full target URL for the HTTP request |
| `Headers` | `TEXT` | Nullable | JSON string of custom request headers |
| `Body` | `TEXT` | Nullable | Request body content (JSON, XML, text, etc.) |
| `BodyType` | `TEXT` | Nullable | Content type hint (`json`, `form-data`, `urlencoded`, `raw`) |
| `AuthType` | `TEXT` | Not Null / Default `'None'` | Authentication method (`None`, `Bearer`, `Basic`, `ApiKey`, `OAuth2`) |
| `AuthConfig` | `TEXT` | Nullable | JSON string of auth configuration (tokens, credentials, key/value pairs) |
| `CreatedAt` | `TEXT` | Not Null / Default `datetime('now')` | Timestamp of record creation |
| `UpdatedAt` | `TEXT` | Not Null / Default `datetime('now')` | Timestamp of last record update |

#### Entity: Schedules

| Attribute Name | Storage Data Type | Key / Modifiers | Logical Field Description |
| :--- | :--- | :--- | :--- |
| `Id` | `INTEGER` | Primary Key / Auto-increment | Unique schedule identifier |
| `ApiEndpointId` | `INTEGER` | Foreign Key → ApiEndpoints.Id / Not Null / ON DELETE CASCADE | The endpoint this schedule executes |
| `IsEnabled` | `INTEGER` | Not Null / Default `1` | Boolean flag (0/1) indicating whether the schedule is active |
| `IntervalSeconds` | `INTEGER` | Not Null / Default `60` | Repeat interval in seconds |
| `LastRunAt` | `TEXT` | Nullable | Timestamp of the last successful execution |
| `NextRunAt` | `TEXT` | Nullable | Timestamp of the next scheduled execution |
| `CreatedAt` | `TEXT` | Not Null / Default `datetime('now')` | Timestamp of record creation |
| `UpdatedAt` | `TEXT` | Not Null / Default `datetime('now')` | Timestamp of last record update |

#### Entity: ApiResults

| Attribute Name | Storage Data Type | Key / Modifiers | Logical Field Description |
| :--- | :--- | :--- | :--- |
| `Id` | `INTEGER` | Primary Key / Auto-increment | Unique result identifier |
| `ApiEndpointId` | `INTEGER` | Foreign Key → ApiEndpoints.Id / Not Null / ON DELETE CASCADE | The endpoint that was executed |
| `StatusCode` | `INTEGER` | Not Null / Default `0` | HTTP response status code (0 if request failed) |
| `ResponseTimeMs` | `INTEGER` | Not Null / Default `0` | Total response time in milliseconds |
| `ResponseHeaders` | `TEXT` | Nullable | JSON string of response headers |
| `ResponseBody` | `TEXT` | Nullable | Raw response body content |
| `RequestBody` | `TEXT` | Nullable | Copy of the request body sent |
| `RequestHeaders` | `TEXT` | Nullable | JSON string of the request headers sent |
| `IsSuccess` | `INTEGER` | Not Null / Default `0` | Boolean flag (0/1) — true if all validation rules passed or status is 2xx |
| `ErrorMessage` | `TEXT` | Nullable | Error message if the request failed (network error, timeout, etc.) |
| `ExecutedAt` | `TEXT` | Not Null / Default `datetime('now')` | Timestamp of when the execution occurred |

#### Entity: ValidationRules

| Attribute Name | Storage Data Type | Key / Modifiers | Logical Field Description |
| :--- | :--- | :--- | :--- |
| `Id` | `INTEGER` | Primary Key / Auto-increment | Unique rule identifier |
| `ApiEndpointId` | `INTEGER` | Foreign Key → ApiEndpoints.Id / Not Null / ON DELETE CASCADE | The endpoint this rule validates |
| `RuleType` | `TEXT` | Not Null | Type of validation (`StatusCode`, `ResponseTime`, `JsonPath`, `BodyContains`, `HeaderExists`) |
| `ExpectedValue` | `TEXT` | Not Null | The expected value to compare against (e.g., `"200"`, JSONPath expression, string) |
| `ComparisonType` | `TEXT` | Not Null / Default `'Equals'` | Comparison operator (`Equals`, `NotEquals`, `Contains`, `NotContains`, `GreaterThan`, `LessThan`) |
| `IsEnabled` | `INTEGER` | Not Null / Default `1` | Boolean flag (0/1) indicating if the rule is active |
| `Order` | `INTEGER` | Not Null / Default `0` | Execution order — rules run in ascending order |

#### Entity: Environments

| Attribute Name | Storage Data Type | Key / Modifiers | Logical Field Description |
| :--- | :--- | :--- | :--- |
| `Id` | `INTEGER` | Primary Key / Auto-increment | Unique environment identifier |
| `Name` | `TEXT` | Not Null | Human-readable environment name |
| `Description` | `TEXT` | Nullable | Optional description of the environment |
| `IsDefault` | `INTEGER` | Not Null / Default `0` | Boolean flag (0/1) — only one environment can be default |
| `CreatedAt` | `TEXT` | Not Null / Default `datetime('now')` | Timestamp of record creation |
| `UpdatedAt` | `TEXT` | Not Null / Default `datetime('now')` | Timestamp of last record update |

#### Entity: EnvironmentVariables

| Attribute Name | Storage Data Type | Key / Modifiers | Logical Field Description |
| :--- | :--- | :--- | :--- |
| `Id` | `INTEGER` | Primary Key / Auto-increment | Unique variable identifier |
| `EnvironmentId` | `INTEGER` | Foreign Key → Environments.Id / Not Null / ON DELETE CASCADE | The environment this variable belongs to |
| `Key` | `TEXT` | Not Null / Unique(EnvironmentId, Key) | Variable name used in `{{key}}` interpolation |
| `Value` | `TEXT` | Not Null | Variable value substituted during endpoint execution |
| `CreatedAt` | `TEXT` | Not Null / Default `datetime('now')` | Timestamp of record creation |
| `UpdatedAt` | `TEXT` | Not Null / Default `datetime('now')` | Timestamp of last record update |

### Entity Relationships

- **`Collections` → `ApiEndpoints`**: One-to-Many. A collection can contain many API endpoints. When a collection is deleted, child endpoints have their `CollectionId` set to `NULL` (ON DELETE SET NULL).
- **`ApiEndpoints` → `Schedules`**: One-to-Many. An endpoint can have many schedules (though typically one). When an endpoint is deleted, all its schedules are cascade-deleted.
- **`ApiEndpoints` → `ApiResults`**: One-to-Many. Each endpoint execution produces one result record. Historical results accumulate over time. Deleting an endpoint cascade-deletes all its results.
- **`ApiEndpoints` → `ValidationRules`**: One-to-Many. An endpoint can have multiple validation rules that run in order. Deleting an endpoint cascade-deletes all its validation rules.
- **`Environments` → `EnvironmentVariables`**: One-to-Many. An environment can have many key/value variables. Deleting an environment cascade-deletes all its variables.

---

## 3. RESTful API Endpoint Reference

### Service Context & Global Defaults

- **Local Base Path:** `http://localhost:10021/api`
- **Global Headers:** `Content-Type: application/json`
- **Proxy:** Vite dev server proxies `/api/*` to `http://localhost:10021`
- **Health Check:** `GET /api/health` returns `{ "status": "ok" }`

---

### Route Catalog

#### `[GET /collections]`
* **Title:** List All Collections
* **Auth Level:** Public
* **Request Headers:** None
* **Request Body:** None
* **Success Response (200 OK):**
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

#### `[GET /collections/:id]`
* **Title:** Get Single Collection
* **Auth Level:** Public
* **Request Headers:** None
* **Request Body:** None
* **Success Response (200 OK):**
  ```json
  {
    "id": 1,
    "name": "My Collection",
    "description": "A group of endpoints",
    "createdAt": "2026-06-24 10:00:00",
    "updatedAt": "2026-06-24 10:00:00"
  }
  ```
* **Error Response (404 Not Found):**
  ```json
  { "error": "Not found" }
  ```

#### `[GET /collections/:id/endpoints]`
* **Title:** Get Endpoints in Collection
* **Auth Level:** Public
* **Request Headers:** None
* **Request Body:** None
* **Success Response (200 OK):**
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

#### `[POST /collections]`
* **Title:** Create Collection
* **Auth Level:** Public
* **Request Headers:** `Content-Type: application/json`
* **Request Body:**
  ```json
  {
    "name": "New Collection",
    "description": "Optional description"
  }
  ```
* **Success Response (201 Created):**
  ```json
  {
    "id": 2,
    "name": "New Collection",
    "description": "Optional description",
    "createdAt": "2026-06-24 12:00:00",
    "updatedAt": "2026-06-24 12:00:00"
  }
  ```

#### `[PUT /collections/:id]`
* **Title:** Update Collection
* **Auth Level:** Public
* **Request Headers:** `Content-Type: application/json`
* **Request Body:**
  ```json
  {
    "name": "Updated Name",
    "description": "Updated description"
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "id": 1,
    "name": "Updated Name",
    "description": "Updated description",
    "createdAt": "2026-06-24 10:00:00",
    "updatedAt": "2026-06-24 12:00:00"
  }
  ```
* **Error Response (404 Not Found):**
  ```json
  { "error": "Not found" }
  ```

#### `[DELETE /collections/:id]`
* **Title:** Delete Collection
* **Auth Level:** Public
* **Request Headers:** None
* **Request Body:** None
* **Success Response (204 No Content):** *No response body.*
* **Error Response (404 Not Found):**
  ```json
  { "error": "Not found" }
  ```

---

#### `[GET /endpoints?collectionId=1]`
* **Title:** List All Endpoints
* **Auth Level:** Public
* **Request Headers:** None
* **Query Parameters:** `collectionId` (optional) — filter by collection
* **Request Body:** None
* **Success Response (200 OK):**
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

#### `[GET /endpoints/:id]`
* **Title:** Get Single Endpoint
* **Auth Level:** Public
* **Request Headers:** None
* **Request Body:** None
* **Success Response (200 OK):**
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
* **Error Response (404 Not Found):**
  ```json
  { "error": "Not found" }
  ```

#### `[POST /endpoints]`
* **Title:** Create Endpoint
* **Auth Level:** Public
* **Request Headers:** `Content-Type: application/json`
* **Request Body:**
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
* **Success Response (201 Created):**
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

#### `[PUT /endpoints/:id]`
* **Title:** Update Endpoint
* **Auth Level:** Public
* **Request Headers:** `Content-Type: application/json`
* **Request Body:** Partial object — omitted fields fall back to existing values.
  ```json
  {
    "name": "Updated Name",
    "url": "https://api.example.com/new-path"
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "id": 1,
    "name": "Updated Name",
    "url": "https://api.example.com/new-path",
    "...": "..."
  }
  ```
* **Error Response (404 Not Found):**
  ```json
  { "error": "Not found" }
  ```

#### `[DELETE /endpoints/:id]`
* **Title:** Delete Endpoint
* **Auth Level:** Public
* **Request Headers:** None
* **Request Body:** None
* **Success Response (204 No Content):** *No response body.*
* **Error Response (404 Not Found):**
  ```json
  { "error": "Not found" }
  ```

#### `[POST /endpoints/:id/run]`
* **Title:** Run Single Endpoint
* **Auth Level:** Public
* **Request Headers:** None
* **Request Body:**
  ```json
  {
    "environmentId": 1
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "apiEndpointId": 1,
    "statusCode": 200,
    "responseTimeMs": 342,
    "isSuccess": true,
    "errorMessage": null
  }
  ```
* **Error Response (404 Not Found):**
  ```json
  { "error": "Not found" }
  ```

#### `[POST /endpoints/bulk-run]`
* **Title:** Bulk Run Endpoints
* **Auth Level:** Public
* **Request Headers:** `Content-Type: application/json`
* **Request Body:**
  ```json
  {
    "endpointIds": [1, 2, 3],
    "environmentId": 1
  }
  ```
* **Success Response (200 OK):**
  ```json
  [
    {
      "apiEndpointId": 1,
      "statusCode": 200,
      "responseTimeMs": 120,
      "isSuccess": true,
      "errorMessage": null
    },
    {
      "apiEndpointId": 2,
      "statusCode": 0,
      "responseTimeMs": 5000,
      "isSuccess": false,
      "errorMessage": "fetch failed"
    }
  ]
  ```

#### `[GET /endpoints/export?ids=1,2,3]`
* **Title:** Export Endpoints
* **Auth Level:** Public
* **Request Headers:** None
* **Query Parameters:** `ids` (required) — comma-separated list of endpoint IDs to export
* **Request Body:** None
* **Success Response (200 OK):**
  ```json
  {
    "endpoints": [
      {
        "name": "Get Users",
        "description": null,
        "method": "GET",
        "url": "https://api.example.com/users",
        "headers": null,
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
* **Error Response (400 Bad Request):**
  ```json
  { "error": "ids query param required" }
  ```

#### `[POST /endpoints/import]`
* **Title:** Import Endpoints
* **Auth Level:** Public
* **Request Headers:** `Content-Type: application/json`
* **Request Body:**
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
* **Success Response (200 OK):**
  ```json
  { "imported": 1 }
  ```

---

#### `[GET /schedules?endpointId=1]`
* **Title:** List All Schedules
* **Auth Level:** Public
* **Request Headers:** None
* **Query Parameters:** `endpointId` (optional) — filter by endpoint
* **Request Body:** None
* **Success Response (200 OK):**
  ```json
  [
    {
      "id": 1,
      "apiEndpointId": 1,
      "isEnabled": true,
      "intervalSeconds": 60,
      "lastRunAt": "2026-06-24 11:00:00",
      "nextRunAt": "2026-06-24 11:01:00",
      "createdAt": "2026-06-24 10:00:00",
      "updatedAt": "2026-06-24 11:00:00",
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

#### `[GET /schedules/:id]`
* **Title:** Get Single Schedule
* **Auth Level:** Public
* **Request Headers:** None
* **Request Body:** None
* **Success Response (200 OK):**
  ```json
  {
    "id": 1,
    "apiEndpointId": 1,
    "isEnabled": true,
    "intervalSeconds": 60,
    "lastRunAt": null,
    "nextRunAt": "2026-06-24 11:01:00",
    "createdAt": "2026-06-24 10:00:00",
    "updatedAt": "2026-06-24 10:00:00"
  }
  ```
* **Error Response (404 Not Found):**
  ```json
  { "error": "Not found" }
  ```

#### `[POST /schedules?endpointId=1]`
* **Title:** Create Schedule
* **Auth Level:** Public
* **Request Headers:** `Content-Type: application/json`
* **Query Parameters:** `endpointId` (alternative to body field)
* **Request Body:**
  ```json
  {
    "apiEndpointId": 1,
    "intervalSeconds": 60,
    "isEnabled": true
  }
  ```
* **Success Response (201 Created):**
  ```json
  {
    "id": 2,
    "apiEndpointId": 1,
    "isEnabled": true,
    "intervalSeconds": 60,
    "lastRunAt": null,
    "nextRunAt": "2026-06-24 12:01:00",
    "createdAt": "2026-06-24 12:00:00",
    "updatedAt": "2026-06-24 12:00:00"
  }
  ```

#### `[PUT /schedules/:id]`
* **Title:** Update Schedule
* **Auth Level:** Public
* **Request Headers:** `Content-Type: application/json`
* **Request Body:** Partial — only provided fields are updated.
  ```json
  {
    "isEnabled": false,
    "intervalSeconds": 300
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "id": 1,
    "apiEndpointId": 1,
    "isEnabled": false,
    "intervalSeconds": 300,
    "...": "..."
  }
  ```
* **Error Response (404 Not Found):**
  ```json
  { "error": "Not found" }
  ```

#### `[DELETE /schedules/:id]`
* **Title:** Delete Schedule
* **Auth Level:** Public
* **Request Headers:** None
* **Request Body:** None
* **Success Response (204 No Content):** *No response body.*
* **Error Response (404 Not Found):**
  ```json
  { "error": "Not found" }
  ```

---

#### `[GET /validation-rules?endpointId=1]`
* **Title:** List All Validation Rules
* **Auth Level:** Public
* **Request Headers:** None
* **Query Parameters:** `endpointId` (optional) — filter by endpoint
* **Request Body:** None
* **Success Response (200 OK):**
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

#### `[GET /validation-rules/:id]`
* **Title:** Get Single Validation Rule
* **Auth Level:** Public
* **Request Headers:** None
* **Request Body:** None
* **Success Response (200 OK):**
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
* **Error Response (404 Not Found):**
  ```json
  { "error": "Not found" }
  ```

#### `[POST /validation-rules?endpointId=1]`
* **Title:** Create Validation Rule
* **Auth Level:** Public
* **Request Headers:** `Content-Type: application/json`
* **Query Parameters:** `endpointId` (alternative to body field)
* **Request Body:**
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
* **Success Response (201 Created):**
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

#### `[PUT /validation-rules/:id]`
* **Title:** Update Validation Rule
* **Auth Level:** Public
* **Request Headers:** `Content-Type: application/json`
* **Request Body:** Partial — provided fields are updated; omitted fields retain existing values.
  ```json
  {
    "expectedValue": "201",
    "isEnabled": false
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "id": 1,
    "apiEndpointId": 1,
    "ruleType": "StatusCode",
    "expectedValue": "201",
    "comparisonType": "Equals",
    "isEnabled": false,
    "order": 0
  }
  ```
* **Error Response (404 Not Found):**
  ```json
  { "error": "Not found" }
  ```

#### `[DELETE /validation-rules/:id]`
* **Title:** Delete Validation Rule
* **Auth Level:** Public
* **Request Headers:** None
* **Request Body:** None
* **Success Response (204 No Content):** *No response body.*
* **Error Response (404 Not Found):**
  ```json
  { "error": "Not found" }
  ```

---

#### `[GET /results?endpointId=1&isSuccess=true&from=2026-06-01&to=2026-06-30&page=1&pageSize=50]`
* **Title:** List All Results
* **Auth Level:** Public
* **Request Headers:** None
* **Query Parameters:**
  - `endpointId` (optional) — filter by endpoint
  - `collectionId` (optional) — filter by collection
  - `isSuccess` (optional, `true`/`false`) — filter by pass/fail
  - `from` (optional, ISO datetime) — filter by executedAt >=
  - `to` (optional, ISO datetime) — filter by executedAt <=
  - `page` (optional, default 1) — pagination page
  - `pageSize` (optional, default 50, max 200) — results per page
* **Request Body:** None
* **Success Response (200 OK):**
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

#### `[GET /results/:id]`
* **Title:** Get Single Result
* **Auth Level:** Public
* **Request Headers:** None
* **Request Body:** None
* **Success Response (200 OK):**
  ```json
  {
    "id": 42,
    "apiEndpointId": 1,
    "statusCode": 200,
    "responseTimeMs": 342,
    "responseHeaders": "{\"content-type\":\"application/json\"}",
    "responseBody": "{\"users\":[]}",
    "requestBody": null,
    "requestHeaders": "{\"Content-Type\":\"application/json\"}",
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
  ```
* **Error Response (404 Not Found):**
  ```json
  { "error": "Not found" }
  ```

---

#### `[GET /dashboard]`
* **Title:** Get Dashboard Stats
* **Auth Level:** Public
* **Request Headers:** None
* **Request Body:** None
* **Success Response (200 OK):**
  ```json
  {
    "totalEndpoints": 10,
    "passCount": 7,
    "failCount": 3,
    "averageLatencyMs": 245,
    "totalSchedules": 4,
    "totalValidationRules": 12,
    "recentCollections": [
      {
        "collectionId": 1,
        "collectionName": "My Collection",
        "endpointCount": 5,
        "passCount": 4,
        "failCount": 1,
        "averageLatencyMs": 200,
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
        "responseTimeMs": 342,
        "isSuccess": 1,
        "executedAt": "2026-06-24 12:00:00"
      }
    ]
  }
  ```

---

#### `[GET /environments]`
* **Title:** List All Environments
* **Auth Level:** Public
* **Request Headers:** None
* **Request Body:** None
* **Success Response (200 OK):**
  ```json
  [
    {
      "id": 1,
      "name": "Production",
      "description": "Production environment",
      "isDefault": true,
      "createdAt": "2026-06-24 10:00:00",
      "updatedAt": "2026-06-24 10:00:00"
    }
  ]
  ```

#### `[GET /environments/:id]`
* **Title:** Get Single Environment (with variables)
* **Auth Level:** Public
* **Request Headers:** None
* **Request Body:** None
* **Success Response (200 OK):**
  ```json
  {
    "id": 1,
    "name": "Production",
    "description": "Production environment",
    "isDefault": true,
    "createdAt": "2026-06-24 10:00:00",
    "updatedAt": "2026-06-24 10:00:00",
    "variables": [
      {
        "id": 1,
        "environmentId": 1,
        "key": "API_BASE_URL",
        "value": "https://api.example.com",
        "createdAt": "2026-06-24 10:00:00",
        "updatedAt": "2026-06-24 10:00:00"
      }
    ]
  }
  ```
* **Error Response (404 Not Found):**
  ```json
  { "error": "Not found" }
  ```

#### `[POST /environments]`
* **Title:** Create Environment
* **Auth Level:** Public
* **Request Headers:** `Content-Type: application/json`
* **Request Body:**
  ```json
  {
    "name": "Staging",
    "description": "Staging environment",
    "isDefault": false
  }
  ```
* **Success Response (201 Created):**
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

#### `[PUT /environments/:id]`
* **Title:** Update Environment
* **Auth Level:** Public
* **Request Headers:** `Content-Type: application/json`
* **Request Body:**
  ```json
  {
    "name": "Updated Name",
    "isDefault": true
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "id": 1,
    "name": "Updated Name",
    "description": "Production environment",
    "isDefault": true,
    "createdAt": "2026-06-24 10:00:00",
    "updatedAt": "2026-06-24 12:00:00"
  }
  ```
* **Error Response (404 Not Found):**
  ```json
  { "error": "Not found" }
  ```

#### `[DELETE /environments/:id]`
* **Title:** Delete Environment
* **Auth Level:** Public
* **Request Headers:** None
* **Request Body:** None
* **Success Response (204 No Content):** *No response body.*
* **Error Response (404 Not Found):**
  ```json
  { "error": "Not found" }
  ```

#### `[GET /environments/:id/variables]`
* **Title:** List Environment Variables
* **Auth Level:** Public
* **Request Headers:** None
* **Request Body:** None
* **Success Response (200 OK):**
  ```json
  [
    {
      "id": 1,
      "environmentId": 1,
      "key": "API_BASE_URL",
      "value": "https://api.example.com",
      "createdAt": "2026-06-24 10:00:00",
      "updatedAt": "2026-06-24 10:00:00"
    }
  ]
  ```
* **Error Response (404 Not Found):**
  ```json
  { "error": "Environment not found" }
  ```

#### `[POST /environments/:id/variables]`
* **Title:** Create Environment Variable
* **Auth Level:** Public
* **Request Headers:** `Content-Type: application/json`
* **Request Body:**
  ```json
  {
    "key": "API_KEY",
    "value": "secret-value"
  }
  ```
* **Success Response (201 Created):**
  ```json
  {
    "id": 2,
    "environmentId": 1,
    "key": "API_KEY",
    "value": "secret-value",
    "createdAt": "2026-06-24 12:00:00",
    "updatedAt": "2026-06-24 12:00:00"
  }
  ```
* **Error Response (404 Not Found):**
  ```json
  { "error": "Environment not found" }
  ```

#### `[PUT /environments/:id/variables/:varId]`
* **Title:** Update Environment Variable
* **Auth Level:** Public
* **Request Headers:** `Content-Type: application/json`
* **Request Body:**
  ```json
  {
    "key": "API_KEY",
    "value": "new-value"
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "id": 2,
    "environmentId": 1,
    "key": "API_KEY",
    "value": "new-value",
    "createdAt": "2026-06-24 12:00:00",
    "updatedAt": "2026-06-24 12:30:00"
  }
  ```
* **Error Response (404 Not Found):**
  ```json
  { "error": "Variable not found" }
  ```

#### `[DELETE /environments/:id/variables/:varId]`
* **Title:** Delete Environment Variable
* **Auth Level:** Public
* **Request Headers:** None
* **Request Body:** None
* **Success Response (204 No Content):** *No response body.*
* **Error Response (404 Not Found):**
  ```json
  { "error": "Variable not found" }
  ```

#### `[PUT /environments/:id/set-default]`
* **Title:** Set Default Environment
* **Auth Level:** Public
* **Request Headers:** None
* **Request Body:** None
* **Success Response (200 OK):**
  ```json
  {
    "id": 1,
    "name": "Production",
    "description": "Production environment",
    "isDefault": true,
    "createdAt": "2026-06-24 10:00:00",
    "updatedAt": "2026-06-24 12:00:00"
  }
  ```
* **Error Response (404 Not Found):**
  ```json
  { "error": "Not found" }
  ```

---

#### `[GET /health]`
* **Title:** Health Check
* **Auth Level:** Public
* **Request Headers:** None
* **Request Body:** None
* **Success Response (200 OK):**
  ```json
  {
    "status": "ok"
  }
  ```

---

### Global Error Format

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
