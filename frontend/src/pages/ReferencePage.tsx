import { useState } from 'react';

interface FieldDoc {
  field: string;
  required: boolean;
  type: string;
  description: string;
  options?: string[];
}

const fields: FieldDoc[] = [
  {
    field: 'name',
    required: true,
    type: 'string',
    description: 'Display name for this endpoint. Appears on Dashboard, Schedules, Results tables.',
  },
  {
    field: 'description',
    required: false,
    type: 'string | null',
    description: 'Optional notes about what this endpoint does. Shown in the endpoint form.',
  },
  {
    field: 'method',
    required: true,
    type: 'string',
    description: 'HTTP method to use when sending the request.',
    options: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
  },
  {
    field: 'url',
    required: true,
    type: 'string',
    description: 'Full target URL for the API call, including protocol (https://).',
  },
  {
    field: 'headers',
    required: false,
    type: 'string | null',
    description: 'HTTP headers as a JSON string of key-value pairs. Must be a valid JSON object. Example: {"Authorization":"Bearer abc","Content-Type":"application/json"}. Each key becomes a request header.',
  },
  {
    field: 'body',
    required: false,
    type: 'string | null',
    description: 'Request body content. For JSON bodies, pass a valid JSON object as an escaped string. For raw text, pass the text directly. Ignored for GET/HEAD requests. Set to null if no body.',
  },
  {
    field: 'bodyType',
    required: false,
    type: 'string | null',
    description: 'Content type of the request body. Determines the Content-Type header if not already set in headers.',
    options: ['json', 'form-data', 'urlencoded', 'raw', 'GraphQL', '(null = no body)'],
  },
  {
    field: 'authType',
    required: false,
    type: 'string | null',
    description: 'Authentication method applied to the request before sending.',
    options: ['None', 'Bearer', 'Basic', 'ApiKey', 'OAuth2'],
  },
  {
    field: 'authConfig',
    required: false,
    type: 'string | null',
    description: 'JSON string with auth credentials. Format varies by authType. Set to null when authType is None.',
    options: [
      'Bearer:  {"token": "your-token-here"}',
      'Basic:   {"username": "admin", "password": "secret"}',
      'ApiKey:  {"key": "X-API-Key", "value": "abc123", "placement": "Header"}',
      'OAuth2:  {"access_token": "ya29.xxx"}',
    ],
  },
  {
    field: 'collectionName',
    required: false,
    type: 'string | null',
    description: 'Folder/group name for organizing endpoints on the Endpoints page. If the collection does not exist, it is auto-created during import.',
  },
  {
    field: 'schedule',
    required: false,
    type: 'object | null',
    description: 'Periodic execution configuration for this endpoint. Set to null to disable scheduling.',
  },
  {
    field: 'schedule.intervalSeconds',
    required: true,
    type: 'number',
    description: 'How often (in seconds) the endpoint should be executed. Minimum value is 1. Examples: 10 (every 10s), 60 (every 1 min), 3600 (every hour), 86400 (every day).',
  },
  {
    field: 'schedule.isEnabled',
    required: true,
    type: 'boolean',
    description: 'Whether the schedule is active on import. true = starts running immediately, false = paused.',
  },
  {
    field: 'validationRules',
    required: false,
    type: 'array',
    description: 'List of assertions to check against each response. All enabled rules must pass for the result to be marked as Success. If empty, defaults to checking for 2xx status codes.',
  },
  {
    field: 'validationRules[].ruleType',
    required: true,
    type: 'string',
    description: 'What aspect of the response to validate.',
    options: ['StatusCode', 'ResponseTime', 'JsonPath', 'BodyContains', 'HeaderExists'],
  },
  {
    field: 'validationRules[].expectedValue',
    required: true,
    type: 'string',
    description: 'The value to compare against. Interpretation depends on ruleType.',
    options: [
      'StatusCode:    "200" or "201"',
      'ResponseTime:  "5000" (milliseconds)',
      'JsonPath:     "$.data.id = 42" (path SPACE=SPACE expected)',
      'BodyContains:  "success" or "orderId"',
      'HeaderExists:  "Content-Type"',
    ],
  },
  {
    field: 'validationRules[].comparisonType',
    required: true,
    type: 'string',
    description: 'How to compare the actual value against expectedValue.',
    options: ['Equals', 'NotEquals', 'GreaterThan', 'LessThan', 'Contains', 'NotContains'],
  },
  {
    field: 'validationRules[].order',
    required: true,
    type: 'number',
    description: 'Execution order of this rule relative to others. Rules are evaluated in ascending order. All rules must pass for overall success.',
  },
  {
    field: 'validationRules[].isEnabled',
    required: true,
    type: 'boolean',
    description: 'Whether this rule is active. true = enforced, false = skipped during validation.',
  },
];

const ruleTypeOptions: Record<string, string> = {
  StatusCode: 'Checks if the HTTP status code matches. Example: expectedValue="200", comparisonType="Equals" → response must return 200.',
  ResponseTime: 'Checks response latency. Example: expectedValue="5000", comparisonType="LessThan" → response must be faster than 5 seconds.',
  JsonPath: 'Queries the JSON response body using JSONPath syntax. Format: "$.path.to.field = expected". Example: "$.data.total > 0". Uses Newtonsoft.Json SelectToken.',
  BodyContains: 'Checks if the response body contains (or does not contain) a substring. Example: expectedValue="success", comparisonType="Contains".',
  HeaderExists: 'Checks if a response header is present (case-insensitive). Example: expectedValue="X-Request-Id" checks for that header.',
};

export default function ReferencePage() {
  const [expandedType, setExpandedType] = useState<string | null>(null);
  const [showSample, setShowSample] = useState(false);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Import JSON Reference</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Every field in the import JSON is documented below. Use this as a reference when
        building your own import files.
      </p>

      {/* Field reference table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800 text-left text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900 sticky top-0">
              <th className="p-3 w-48">Field</th>
              <th className="p-3 w-16">Req</th>
              <th className="p-3 w-24">Type</th>
              <th className="p-3">Description</th>
              <th className="p-3 w-72">Valid Options / Examples</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((f) => (
              <tr key={f.field} className="border-b border-gray-200 dark:border-gray-800/50 hover:bg-gray-100/50 dark:hover:bg-gray-800/30 align-top">
                <td className="p-3 font-mono text-purple-400 text-xs">{f.field}</td>
                <td className="p-3">
                  {f.required ? (
                    <span className="text-red-400 text-xs font-bold">Yes</span>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-600 text-xs">No</span>
                  )}
                </td>
                <td className="p-3 text-gray-500 dark:text-gray-500 text-xs">{f.type}</td>
                <td className="p-3 text-gray-700 dark:text-gray-300">{f.description}</td>
                <td className="p-3">
                  {f.options ? (
                    <ul className="space-y-0.5">
                      {f.options.map((opt, i) => (
                        <li key={i} className="text-xs font-mono text-gray-600 dark:text-gray-400">{opt}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-600 text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Rule types deep dive */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Validation Rule Types — Details</h3>
        <div className="space-y-2">
          {Object.entries(ruleTypeOptions).map(([type, desc]) => (
            <div
              key={type}
              className="border border-gray-200 dark:border-gray-800 rounded cursor-pointer"
              onClick={() => setExpandedType(expandedType === type ? null : type)}
            >
              <div className="flex justify-between items-center px-3 py-2">
                <span className="text-sm font-mono text-purple-400">{type}</span>
                <span className="text-xs text-gray-500 dark:text-gray-500">{expandedType === type ? '▲' : '▼'}</span>
              </div>
              {expandedType === type && (
                <div className="px-3 pb-3 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-800 pt-2">
                  {desc}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Comparison types */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Comparison Types</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800 text-left text-gray-600 dark:text-gray-400">
              <th className="p-2">Type</th>
              <th className="p-2">Meaning</th>
              <th className="p-2">Valid for Rule Types</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-200 dark:border-gray-800/50">
              <td className="p-2 font-mono text-purple-400 text-xs">Equals</td>
              <td className="p-2 text-gray-600 dark:text-gray-400">Actual value must match expected value exactly</td>
              <td className="p-2 text-xs text-gray-500 dark:text-gray-500">All</td>
            </tr>
            <tr className="border-b border-gray-200 dark:border-gray-800/50">
              <td className="p-2 font-mono text-purple-400 text-xs">NotEquals</td>
              <td className="p-2 text-gray-600 dark:text-gray-400">Actual value must NOT match</td>
              <td className="p-2 text-xs text-gray-500 dark:text-gray-500">All</td>
            </tr>
            <tr className="border-b border-gray-200 dark:border-gray-800/50">
              <td className="p-2 font-mono text-purple-400 text-xs">GreaterThan</td>
              <td className="p-2 text-gray-600 dark:text-gray-400">Actual value &gt; expected value</td>
              <td className="p-2 text-xs text-gray-500 dark:text-gray-500">StatusCode, ResponseTime</td>
            </tr>
            <tr className="border-b border-gray-200 dark:border-gray-800/50">
              <td className="p-2 font-mono text-purple-400 text-xs">LessThan</td>
              <td className="p-2 text-gray-600 dark:text-gray-400">Actual value &lt; expected value</td>
              <td className="p-2 text-xs text-gray-500 dark:text-gray-500">StatusCode, ResponseTime</td>
            </tr>
            <tr className="border-b border-gray-200 dark:border-gray-800/50">
              <td className="p-2 font-mono text-purple-400 text-xs">Contains</td>
              <td className="p-2 text-gray-600 dark:text-gray-400">Actual value must contain expected value as substring</td>
              <td className="p-2 text-xs text-gray-500 dark:text-gray-500">JsonPath, BodyContains</td>
            </tr>
            <tr>
              <td className="p-2 font-mono text-purple-400 text-xs">NotContains</td>
              <td className="p-2 text-gray-600 dark:text-gray-400">Actual value must NOT contain expected value</td>
              <td className="p-2 text-xs text-gray-500 dark:text-gray-500">JsonPath, BodyContains</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Auth config examples */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">authConfig — Formats Per Auth Type</h3>
        <div className="grid grid-cols-1 gap-3">
          <div className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded p-3">
            <p className="text-xs text-purple-400 font-mono mb-1">None</p>
            <pre className="text-xs text-gray-600 dark:text-gray-400">null</pre>
          </div>
          <div className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded p-3">
            <p className="text-xs text-purple-400 font-mono mb-1">Bearer Token</p>
            <pre className="text-xs text-gray-600 dark:text-gray-400">{`{"token": "eyJhbGciOiJIUzI1NiIs..."}`}</pre>
            <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">Adds header: Authorization: Bearer eyJhbGciOiJIUzI1NiIs...</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded p-3">
            <p className="text-xs text-purple-400 font-mono mb-1">Basic Auth</p>
            <pre className="text-xs text-gray-600 dark:text-gray-400">{`{"username": "admin", "password": "secret123"}`}</pre>
            <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">Base64 encodes "admin:secret123" → adds Authorization: Basic header</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded p-3">
            <p className="text-xs text-purple-400 font-mono mb-1">API Key</p>
            <pre className="text-xs text-gray-600 dark:text-gray-400">{`{"key": "X-API-Key", "value": "sk-abc123xyz", "placement": "Header"}`}</pre>
            <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">placement="Header" → adds as header. placement="Query" → adds as query parameter.</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded p-3">
            <p className="text-xs text-purple-400 font-mono mb-1">OAuth 2.0</p>
            <pre className="text-xs text-gray-600 dark:text-gray-400">{`{"access_token": "ya29.a0AfH6SM..."}`}</pre>
            <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">Adds header: Authorization: Bearer ya29.a0AfH6SM...</p>
          </div>
        </div>
      </div>

      {/* Full sample */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
        <div
          className="flex justify-between items-center cursor-pointer"
          onClick={() => setShowSample(!showSample)}
        >
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Full Sample Import JSON</h3>
          <span className="text-xs text-gray-500 dark:text-gray-500">{showSample ? '▲' : '▼'}</span>
        </div>
        {showSample && (
          <pre className="bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded p-4 text-xs text-gray-700 dark:text-gray-300 overflow-auto max-h-[500px] whitespace-pre leading-relaxed mt-3">
{`{
  "endpoints": [
    {
      "name": "Get Users",
      "description": "Fetches list of users",
      "method": "GET",
      "url": "https://api.example.com/v1/users",
      "headers": "{\\"Authorization\\":\\"Bearer abc123\\",\\"Accept\\":\\"application/json\\"}",
      "body": null,
      "bodyType": null,
      "authType": "Bearer",
      "authConfig": "{\\"token\\":\\"abc123\\"}",
      "collectionName": "User Service",
      "schedule": {
        "intervalSeconds": 300,
        "isEnabled": true
      },
      "validationRules": [
        {
          "ruleType": "StatusCode",
          "expectedValue": "200",
          "comparisonType": "Equals",
          "order": 1,
          "isEnabled": true
        },
        {
          "ruleType": "ResponseTime",
          "expectedValue": "5000",
          "comparisonType": "LessThan",
          "order": 2,
          "isEnabled": true
        },
        {
          "ruleType": "JsonPath",
          "expectedValue": "$.total > 0",
          "comparisonType": "Equals",
          "order": 3,
          "isEnabled": true
        }
      ]
    },
    {
      "name": "Create Order",
      "description": "Creates a new order",
      "method": "POST",
      "url": "https://api.example.com/v1/orders",
      "headers": "{\\"Content-Type\\":\\"application/json\\"}",
      "body": "{\\"customerId\\":42,\\"items\\":[{\\"productId\\":1,\\"quantity\\":2}]}",
      "bodyType": "json",
      "authType": "Bearer",
      "authConfig": "{\\"token\\":\\"abc123\\"}",
      "collectionName": "Order Service",
      "schedule": {
        "intervalSeconds": 3600,
        "isEnabled": true
      },
      "validationRules": [
        {
          "ruleType": "StatusCode",
          "expectedValue": "201",
          "comparisonType": "Equals",
          "order": 1,
          "isEnabled": true
        },
        {
          "ruleType": "BodyContains",
          "expectedValue": "orderId",
          "comparisonType": "Contains",
          "order": 2,
          "isEnabled": true
        }
      ]
    }
  ]
}`}
          </pre>
        )}
      </div>
    </div>
  );
}
