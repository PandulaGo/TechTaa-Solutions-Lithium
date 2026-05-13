using Newtonsoft.Json;
using LithiumApp.Api.Data;
using LithiumApp.Api.DTOs;
using LithiumApp.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace LithiumApp.Api.Services;

public class ExportImportService
{
    private readonly AppDbContext _db;

    public ExportImportService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<ExportPayload> ExportAsync(List<int> endpointIds)
    {
        var endpoints = await _db.ApiEndpoints
            .Include(e => e.Collection)
            .Include(e => e.Schedules)
            .Include(e => e.ValidationRules)
            .Where(e => endpointIds.Contains(e.Id))
            .ToListAsync();

        var payload = new ExportPayload(
            endpoints.Select(e => new ExportedEndpoint(
                e.Name,
                e.Description,
                e.Method,
                e.Url,
                e.Headers,
                e.Body,
                e.BodyType,
                e.AuthType,
                e.AuthConfig,
                e.Collection?.Name,
                e.Schedules.FirstOrDefault() is { } s
                    ? new ExportedSchedule(s.IntervalSeconds, s.IsEnabled)
                    : null,
                e.ValidationRules.Select(r => new ExportedValidationRule(
                    r.RuleType, r.ExpectedValue, r.ComparisonType, r.Order, r.IsEnabled
                )).ToList()
            )).ToList()
        );

        return payload;
    }

    public async Task<int> ImportAsync(List<ExportedEndpoint> importedEndpoints)
    {
        var created = 0;

        foreach (var item in importedEndpoints)
        {
            // Find or create collection
            int? collectionId = null;
            if (!string.IsNullOrWhiteSpace(item.CollectionName))
            {
                var collection = await _db.Collections
                    .FirstOrDefaultAsync(c => c.Name == item.CollectionName);
                if (collection == null)
                {
                    collection = new Collection { Name = item.CollectionName };
                    _db.Collections.Add(collection);
                    await _db.SaveChangesAsync();
                }
                collectionId = collection.Id;
            }

            var endpoint = new ApiEndpoint
            {
                Name = item.Name,
                Description = item.Description,
                Method = item.Method,
                Url = item.Url,
                Headers = item.Headers,
                Body = item.Body,
                BodyType = item.BodyType,
                AuthType = item.AuthType,
                AuthConfig = item.AuthConfig,
                CollectionId = collectionId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _db.ApiEndpoints.Add(endpoint);
            await _db.SaveChangesAsync();

            // Import schedule
            if (item.Schedule != null)
            {
                var schedule = new Schedule
                {
                    ApiEndpointId = endpoint.Id,
                    IntervalSeconds = item.Schedule.IntervalSeconds,
                    IsEnabled = item.Schedule.IsEnabled,
                    NextRunAt = DateTime.UtcNow
                };
                _db.Schedules.Add(schedule);
            }

            // Import validation rules
            foreach (var rule in item.ValidationRules)
            {
                var vr = new ValidationRule
                {
                    ApiEndpointId = endpoint.Id,
                    RuleType = rule.RuleType,
                    ExpectedValue = rule.ExpectedValue,
                    ComparisonType = rule.ComparisonType,
                    Order = rule.Order,
                    IsEnabled = rule.IsEnabled
                };
                _db.ValidationRules.Add(vr);
            }

            await _db.SaveChangesAsync();
            created++;
        }

        return created;
    }
}
