using System.Net.Http.Headers;
using System.Text;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using LithiumApp.Api.Models;

namespace LithiumApp.Api.Services;

public class ApiExecutionService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<ApiExecutionService> _logger;

    public ApiExecutionService(IHttpClientFactory httpClientFactory, ILogger<ApiExecutionService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<ApiResult> ExecuteAsync(ApiEndpoint endpoint, CancellationToken ct = default)
    {
        var result = new ApiResult
        {
            ApiEndpointId = endpoint.Id,
            ExecutedAt = DateTime.UtcNow
        };

        try
        {
            var client = _httpClientFactory.CreateClient("LithiumApi");
            client.Timeout = TimeSpan.FromSeconds(30);

            var request = new HttpRequestMessage(new HttpMethod(endpoint.Method), endpoint.Url);

            // Apply headers
            var headerLines = new List<string>();
            if (!string.IsNullOrEmpty(endpoint.Headers))
            {
                try
                {
                    var headers = JsonConvert.DeserializeObject<Dictionary<string, string>>(endpoint.Headers);
                    if (headers != null)
                    {
                        foreach (var (key, value) in headers)
                        {
                            if (!key.StartsWith("Content-Type", StringComparison.OrdinalIgnoreCase))
                            {
                                request.Headers.TryAddWithoutValidation(key, value);
                            }
                            headerLines.Add($"{key}: {value}");
                        }
                    }
                }
                catch { }
            }

            // Apply auth
            ApplyAuth(request, endpoint.AuthType, endpoint.AuthConfig);

            // Apply body
            if (!string.IsNullOrEmpty(endpoint.Body) && endpoint.Method != "GET" && endpoint.Method != "HEAD")
            {
                var contentType = GetContentType(endpoint.BodyType, endpoint.Headers);
                request.Content = new StringContent(endpoint.Body, Encoding.UTF8, contentType);
            }

            result.RequestHeaders = string.Join("\n", headerLines);
            result.RequestBody = endpoint.Body;

            // Execute
            var sw = System.Diagnostics.Stopwatch.StartNew();
            var response = await client.SendAsync(request, HttpCompletionOption.ResponseContentRead, ct);
            sw.Stop();

            result.StatusCode = (int)response.StatusCode;
            result.ResponseTimeMs = sw.ElapsedMilliseconds;
            result.ResponseBody = await response.Content.ReadAsStringAsync(ct);

            var respHeaders = new Dictionary<string, string>();
            foreach (var h in response.Headers)
                respHeaders[h.Key] = string.Join(", ", h.Value);
            foreach (var h in response.Content.Headers)
                respHeaders[h.Key] = string.Join(", ", h.Value);
            result.ResponseHeaders = JsonConvert.SerializeObject(respHeaders);
        }
        catch (Exception ex)
        {
            result.StatusCode = 0;
            result.ResponseTimeMs = 0;
            result.ErrorMessage = ex.Message;
            _logger.LogError(ex, "Error executing endpoint {EndpointName}", endpoint.Name);
        }

        return result;
    }

    private void ApplyAuth(HttpRequestMessage request, string? authType, string? authConfig)
    {
        if (string.IsNullOrEmpty(authType) || authType == "None" || string.IsNullOrEmpty(authConfig))
            return;

        try
        {
            var config = JsonConvert.DeserializeObject<Dictionary<string, string>>(authConfig);
            if (config == null) return;

            switch (authType)
            {
                case "Bearer":
                    if (config.TryGetValue("token", out var token))
                        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
                    break;
                case "Basic":
                    if (config.TryGetValue("username", out var user) && config.TryGetValue("password", out var pass))
                    {
                        var creds = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{user}:{pass}"));
                        request.Headers.Authorization = new AuthenticationHeaderValue("Basic", creds);
                    }
                    break;
                case "ApiKey":
                    if (config.TryGetValue("key", out var keyName) && config.TryGetValue("value", out var keyValue))
                    {
                        var placement = config.GetValueOrDefault("placement", "Header");
                        if (placement == "Header")
                            request.Headers.TryAddWithoutValidation(keyName, keyValue);
                        else
                            request.RequestUri = new Uri(request.RequestUri!.GetLeftPart(UriPartial.Path)
                                + "?" + keyName + "=" + Uri.EscapeDataString(keyValue));
                    }
                    break;
                case "OAuth2":
                    if (config.TryGetValue("access_token", out var accessToken))
                        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
                    break;
            }
        }
        catch
        {
            _logger.LogWarning("Failed to apply auth for type {AuthType}", authType);
        }
    }

    private static string GetContentType(string? bodyType, string? headers)
    {
        if (!string.IsNullOrEmpty(headers))
        {
            try
            {
                var h = JsonConvert.DeserializeObject<Dictionary<string, string>>(headers);
                if (h != null && h.TryGetValue("Content-Type", out var ct))
                    return ct;
            }
            catch { }
        }

        return bodyType switch
        {
            "JSON" or "json" => "application/json",
            "form-data" => "multipart/form-data",
            "urlencoded" => "application/x-www-form-urlencoded",
            "GraphQL" => "application/json",
            _ => "text/plain"
        };
    }
}
