using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using LithiumApp.Api.Models;

namespace LithiumApp.Api.Services;

public class ValidationService
{
    private readonly ILogger<ValidationService> _logger;

    public ValidationService(ILogger<ValidationService> logger)
    {
        _logger = logger;
    }

    public bool Validate(ApiResult result, List<ValidationRule> rules)
    {
        if (rules.Count == 0)
            return result.StatusCode >= 200 && result.StatusCode < 300;

        var enabledRules = rules.Where(r => r.IsEnabled).OrderBy(r => r.Order).ToList();
        if (enabledRules.Count == 0)
            return result.StatusCode >= 200 && result.StatusCode < 300;

        var allPassed = true;
        foreach (var rule in enabledRules)
        {
            var passed = EvaluateRule(result, rule);
            if (!passed)
            {
                allPassed = false;
                _logger.LogInformation("Rule failed: {RuleType} for endpoint {EndpointId}", rule.RuleType, result.ApiEndpointId);
            }
        }

        return allPassed;
    }

    private bool EvaluateRule(ApiResult result, ValidationRule rule)
    {
        try
        {
            return rule.RuleType switch
            {
                "StatusCode" => EvaluateStatusCode(result.StatusCode, rule.ExpectedValue, rule.ComparisonType),
                "ResponseTime" => EvaluateResponseTime(result.ResponseTimeMs, rule.ExpectedValue, rule.ComparisonType),
                "JsonPath" => EvaluateJsonPath(result.ResponseBody, rule.ExpectedValue, rule.ComparisonType),
                "BodyContains" => EvaluateBodyContains(result.ResponseBody, rule.ExpectedValue, rule.ComparisonType),
                "HeaderExists" => EvaluateHeaderExists(result.ResponseHeaders, rule.ExpectedValue),
                _ => true
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error evaluating rule {RuleType}", rule.RuleType);
            return false;
        }
    }

    private static bool EvaluateStatusCode(int actual, string expected, string comparison)
    {
        if (!int.TryParse(expected, out var expectedCode)) return false;
        return Compare(actual, expectedCode, comparison);
    }

    private static bool EvaluateResponseTime(long actualMs, string expected, string comparison)
    {
        if (!long.TryParse(expected, out var expectedMs)) return false;
        return Compare(actualMs, expectedMs, comparison);
    }

    private static bool EvaluateJsonPath(string? responseBody, string jsonPath, string comparison)
    {
        if (string.IsNullOrEmpty(responseBody)) return false;

        var parts = jsonPath.Split('=', 2);
        if (parts.Length != 2) return false;

        var path = parts[0].Trim();
        var expectedValue = parts[1].Trim();

        try
        {
            var token = JToken.Parse(responseBody);
            var selected = token.SelectToken(path);
            if (selected == null) return false;

            var actualValue = selected.ToString();
            return comparison switch
            {
                "Equals" => actualValue == expectedValue,
                "NotEquals" => actualValue != expectedValue,
                "Contains" => actualValue.Contains(expectedValue),
                "NotContains" => !actualValue.Contains(expectedValue),
                _ => actualValue == expectedValue
            };
        }
        catch
        {
            return false;
        }
    }

    private static bool EvaluateBodyContains(string? responseBody, string expected, string comparison)
    {
        var body = responseBody ?? string.Empty;
        return comparison switch
        {
            "Contains" => body.Contains(expected),
            "NotContains" => !body.Contains(expected),
            "Equals" => body == expected,
            _ => body.Contains(expected)
        };
    }

    private static bool EvaluateHeaderExists(string? responseHeaders, string headerName)
    {
        if (string.IsNullOrEmpty(responseHeaders)) return false;
        try
        {
            var headers = JsonConvert.DeserializeObject<Dictionary<string, string>>(responseHeaders);
            return headers != null && headers.Keys.Any(k => k.Equals(headerName, StringComparison.OrdinalIgnoreCase));
        }
        catch
        {
            return false;
        }
    }

    private static bool Compare(long actual, long expected, string comparison)
    {
        return comparison switch
        {
            "Equals" => actual == expected,
            "NotEquals" => actual != expected,
            "GreaterThan" => actual > expected,
            "LessThan" => actual < expected,
            _ => actual == expected
        };
    }
}
