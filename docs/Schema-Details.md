# Database Schema & Data Models Matrix

> **AI Instruction:** Inspect the database definition layers (e.g., Prisma schema, Mongoose models, SQL initialization files). Map out table schemas and entity-relationship rules using precise Markdown tabular grids.

## 1. Entity Attributes Grid

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

| Attribute Name | Storage Data Type | Key/Modifiers | Logical Field Description |
| :--- | :--- | :--- | :--- |
| `Id` | `INTEGER` | Primary Key / Auto-increment | Unique schedule identifier. |
| `ApiEndpointId` | `INTEGER` | Foreign Key → ApiEndpoints.Id / Not Null / ON DELETE CASCADE | The endpoint this schedule executes. |
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
| `ApiEndpointId` | `INTEGER` | Foreign Key → ApiEndpoints.Id / Not Null / ON DELETE CASCADE | The endpoint that was executed. |
| `StatusCode` | `INTEGER` | Not Null / Default `0` | HTTP response status code (0 if request failed). |
| `ResponseTimeMs` | `INTEGER` | Not Null / Default `0` | Total response time in milliseconds. |
| `ResponseHeaders` | `TEXT` | Nullable | JSON string of response headers. |
| `ResponseBody` | `TEXT` | Nullable | Raw response body content. |
| `RequestBody` | `TEXT` | Nullable | Copy of the request body sent. |
| `RequestHeaders` | `TEXT` | Nullable | JSON string of the request headers sent. |
| `IsSuccess` | `INTEGER` | Not Null / Default `0` | Boolean flag (0/1) — true if all validation rules passed or status is 2xx. |
| `ErrorMessage` | `TEXT` | Nullable | Error message if the request failed (network error, timeout, etc.). |
| `ExecutedAt` | `TEXT` | Not Null / Default `datetime('now')` | Timestamp of when the execution occurred. |

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

## 2. Architectural Entity Relationships

* **Collections** $\rightarrow$ **ApiEndpoints**: **One-to-Many**. A collection can contain many API endpoints. When a collection is deleted, child endpoints have their `CollectionId` set to `NULL` (ON DELETE SET NULL).
* **ApiEndpoints** $\rightarrow$ **Schedules**: **One-to-Many**. An endpoint can have many schedules (though typically one). When an endpoint is deleted, all its schedules are cascade-deleted.
* **ApiEndpoints** $\rightarrow$ **ApiResults**: **One-to-Many**. Each endpoint execution produces one result record. Historical results accumulate over time. Deleting an endpoint cascade-deletes all its results.
* **ApiEndpoints** $\rightarrow$ **ValidationRules**: **One-to-Many**. An endpoint can have multiple validation rules that run in order. Deleting an endpoint cascade-deletes all its validation rules.
* **Environments** $\rightarrow$ **EnvironmentVariables**: **One-to-Many**. An environment can contain many variables (key-value pairs). When an environment is deleted, all its variables are cascade-deleted. The combination of `EnvironmentId` + `Key` is unique.
