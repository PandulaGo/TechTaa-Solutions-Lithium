namespace LithiumApp.Api.DTOs;

public record CreateEndpointDto(
    string Name,
    string? Description,
    string Method,
    string Url,
    string? Headers,
    string? Body,
    string? BodyType,
    string? AuthType,
    string? AuthConfig,
    int? CollectionId
);

public record UpdateEndpointDto(
    string? Name,
    string? Description,
    string? Method,
    string? Url,
    string? Headers,
    string? Body,
    string? BodyType,
    string? AuthType,
    string? AuthConfig,
    int? CollectionId
);

public record CreateScheduleDto(int IntervalSeconds, bool IsEnabled = true);
public record UpdateScheduleDto(int? IntervalSeconds, bool? IsEnabled);

public record CreateValidationRuleDto(
    string RuleType,
    string ExpectedValue,
    string ComparisonType,
    int Order,
    bool IsEnabled = true
);

public record UpdateValidationRuleDto(
    string? RuleType,
    string? ExpectedValue,
    string? ComparisonType,
    int? Order,
    bool? IsEnabled
);

public record CreateCollectionDto(string Name, string? Description);
public record UpdateCollectionDto(string? Name, string? Description);

public record DashboardStats(
    int TotalEndpoints,
    int PassCount,
    int FailCount,
    double AverageLatencyMs
);

public record BulkRunRequest(List<int> EndpointIds);

public record ExportPayload(
    List<ExportedEndpoint> Endpoints
);

public record ExportedEndpoint(
    string Name,
    string? Description,
    string Method,
    string Url,
    string? Headers,
    string? Body,
    string? BodyType,
    string? AuthType,
    string? AuthConfig,
    string? CollectionName,
    ExportedSchedule? Schedule,
    List<ExportedValidationRule> ValidationRules
);

public record ExportedSchedule(int IntervalSeconds, bool IsEnabled);
public record ExportedValidationRule(string RuleType, string ExpectedValue, string ComparisonType, int Order, bool IsEnabled);
