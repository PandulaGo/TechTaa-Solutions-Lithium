import { JSONPath } from 'jsonpath-plus';
import type { ValidationRule, ExecutionResult } from '../types';

function compare(actual: string, expected: string, comparisonType: string): boolean {
  switch (comparisonType) {
    case 'Equals':
      return actual === expected;
    case 'NotEquals':
      return actual !== expected;
    case 'Contains':
      return actual.includes(expected);
    case 'NotContains':
      return !actual.includes(expected);
    case 'GreaterThan': {
      const a = parseFloat(actual);
      const b = parseFloat(expected);
      return !isNaN(a) && !isNaN(b) && a > b;
    }
    case 'LessThan': {
      const a = parseFloat(actual);
      const b = parseFloat(expected);
      return !isNaN(a) && !isNaN(b) && a < b;
    }
    default:
      return actual === expected;
  }
}

export function validateResult(result: ExecutionResult, rules: ValidationRule[]): boolean {
  const enabledRules = rules.filter(r => r.isEnabled).sort((a, b) => a.order - b.order);

  if (enabledRules.length === 0) {
    return result.statusCode >= 200 && result.statusCode < 300;
  }

  for (const rule of enabledRules) {
    try {
      let actualValue: string;

      switch (rule.ruleType) {
        case 'StatusCode':
          actualValue = String(result.statusCode);
          break;

        case 'ResponseTime':
          actualValue = String(result.responseTimeMs);
          break;

        case 'JsonPath': {
          const parsed = tryParseJson(result.responseBody);
          if (!parsed) return false;
          const pathResult = JSONPath({ path: rule.expectedValue, json: parsed, wrap: false });
          actualValue = pathResult !== undefined ? String(pathResult) : '';
          break;
        }

        case 'BodyContains':
          actualValue = result.responseBody || '';
          break;

        case 'HeaderExists': {
          const headers = tryParseJson(result.responseHeaders) || {};
          actualValue = Object.keys(headers).find(k => k.toLowerCase() === rule.expectedValue.toLowerCase()) ? rule.expectedValue : '';
          break;
        }

        default:
          return false;
      }

      if (!compare(actualValue, rule.expectedValue, rule.comparisonType)) {
        return false;
      }
    } catch {
      return false;
    }
  }

  return true;
}

function tryParseJson(str: string | null): any {
  if (!str) return null;
  try { return JSON.parse(str); } catch { return null; }
}
