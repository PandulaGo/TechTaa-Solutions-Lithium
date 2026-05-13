namespace LithiumApp.Api.Models;

public class ValidationRule
{
    public int Id { get; set; }
    public int ApiEndpointId { get; set; }
    public string RuleType { get; set; } = string.Empty;
    public string ExpectedValue { get; set; } = string.Empty;
    public string ComparisonType { get; set; } = "Equals";
    public bool IsEnabled { get; set; } = true;
    public int Order { get; set; }

    public ApiEndpoint? ApiEndpoint { get; set; }
}
