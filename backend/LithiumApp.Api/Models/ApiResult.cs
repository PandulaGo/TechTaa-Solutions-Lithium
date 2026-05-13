namespace LithiumApp.Api.Models;

public class ApiResult
{
    public int Id { get; set; }
    public int ApiEndpointId { get; set; }
    public int StatusCode { get; set; }
    public long ResponseTimeMs { get; set; }
    public string? ResponseHeaders { get; set; }
    public string? ResponseBody { get; set; }
    public string? RequestBody { get; set; }
    public string? RequestHeaders { get; set; }
    public bool IsSuccess { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime ExecutedAt { get; set; } = DateTime.UtcNow;

    public ApiEndpoint? ApiEndpoint { get; set; }
}
