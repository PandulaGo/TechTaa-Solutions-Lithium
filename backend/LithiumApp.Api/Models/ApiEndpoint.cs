namespace LithiumApp.Api.Models;

public class ApiEndpoint
{
    public int Id { get; set; }
    public int? CollectionId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Method { get; set; } = "GET";
    public string Url { get; set; } = string.Empty;
    public string? Headers { get; set; }
    public string? Body { get; set; }
    public string? BodyType { get; set; }
    public string? AuthType { get; set; }
    public string? AuthConfig { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Collection? Collection { get; set; }
    public List<Schedule> Schedules { get; set; } = new();
    public List<ApiResult> Results { get; set; } = new();
    public List<ValidationRule> ValidationRules { get; set; } = new();
}
