namespace LithiumApp.Api.Models;

public class Schedule
{
    public int Id { get; set; }
    public int ApiEndpointId { get; set; }
    public bool IsEnabled { get; set; } = true;
    public int IntervalSeconds { get; set; } = 60;
    public DateTime? LastRunAt { get; set; }
    public DateTime NextRunAt { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ApiEndpoint? ApiEndpoint { get; set; }
}
