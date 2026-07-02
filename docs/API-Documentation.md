# RESTful API Reference Blueprint

> **AI Instruction:** Scan all active route files, controllers, and router configurations. Extract every public endpoint and document it using the explicit block layout detailed below.

## 1. Service Context & Base URL

- **Local Base Path:** `http://localhost:10021/api`
- **Global Content-Type:** `application/json`
- **Proxy:** Vite dev server proxies `/api/*` to `http://localhost:10021`
- **Health Check:** `GET /api/health` returns `{ "status": "ok" }`

---

## 2. Endpoint Registry

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

  Global Error (500 Internal Server Error)

  ```json
  {
    "success": false,
    "error": "ERROR_CODE_STRING",
    "message": "Human readable explanation of what failed."
  }
  ```

---

### [Endpoints — Run Single]

* **URL String:** `/endpoints/:id/run`
* **HTTP Protocol Method:** `POST`
* **Required Header Keys:** None
* **Request Payload Schema:** None

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
    "endpointIds": [1, 2, 3]
  }
  ```

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
      "order": 0
    }
  ]
  ```

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
* **Request Payload Schema:** Partial — provided fields are updated; omitted fields retain existing values.

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

* **URL String:** `/results?endpointId=1&isSuccess=true&from=2026-06-01&to=2026-06-30&page=1&pageSize=50`
* **HTTP Protocol Method:** `GET`
* **Required Header Keys:** None
* **Query Parameters:**
  - `endpointId` (optional) — filter by endpoint
  - `isSuccess` (optional, `true`/`false`) — filter by pass/fail
  - `from` (optional, ISO datetime) — filter by executedAt >=
  - `to` (optional, ISO datetime) — filter by executedAt <=
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
    "averageLatencyMs": 245
  }
  ```

---

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
