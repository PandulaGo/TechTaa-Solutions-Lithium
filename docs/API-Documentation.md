# RESTful API Reference Blueprint

> **AI Instruction:** Scan all active route files, controllers, and router configurations. Extract every public endpoint and document it using the explicit block layout detailed below.

## 1. Service Context & Base URL

- **Local Base Path:** `http://localhost:10021/api`
- **Global Content-Type:** `application/json`
- **Proxy:** Vite dev server proxies `/api/*` to `http://localhost:10021`
- **Health Check:** `GET /api/health` returns `{ "status": "ok" }`

---

## 2. Endpoint Registry

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
* **Request Payload Schema:** None

* **Response:**

  Success (204 No Content)

  *No response body.*

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

  `environmentId` is optional. Each endpoint is run sequentially in the order given.

* **Response:**

  Success (200 OK)

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

### [Schedules — List All]

* **URL String:** `/schedules?endpointId=1`
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
    "apiEndpointId": 1,
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

* **URL String:** `/schedules?endpointId=1`
* **HTTP Protocol Method:** `POST`
* **Required Header Keys:** `Content-Type: application/json`
* **Query Parameters:** `endpointId` (alternative to body field)
* **Request Payload Schema:**

  ```json
  {
    "apiEndpointId": 1,
    "intervalSeconds": 60,
    "isEnabled": true
  }
  ```

* **Response:**

  Success (201 Created)

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
    "apiEndpointId": 1,
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
    "apiEndpointId": 1,
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

  Success (200 OK)

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

  Error (404 Not Found)

  ```json
  { "error": "Not found" }
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

  > **Note:** The response now includes 6 stat fields (adding `totalSchedules` and `totalValidationRules`), plus `recentCollections` (top 5) and `recentEndpoints` (last 25) arrays. Each uses a subquery to return only the latest result per endpoint.

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
