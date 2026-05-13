using Microsoft.EntityFrameworkCore;
using LithiumApp.Api.Data;
using LithiumApp.Api.Models;

namespace LithiumApp.Api.Services;

public class ScheduleRunner : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ScheduleRunner> _logger;
    private static readonly TimeSpan TickInterval = TimeSpan.FromSeconds(1);

    public ScheduleRunner(IServiceScopeFactory scopeFactory, ILogger<ScheduleRunner> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("ScheduleRunner started");

        using var timer = new PeriodicTimer(TickInterval);

        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await ProcessDueSchedulesAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in ScheduleRunner loop");
            }
        }

        _logger.LogInformation("ScheduleRunner stopped");
    }

    private async Task ProcessDueSchedulesAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var executionService = scope.ServiceProvider.GetRequiredService<ApiExecutionService>();
        var validationService = scope.ServiceProvider.GetRequiredService<ValidationService>();

        var now = DateTime.UtcNow;

        var dueSchedules = await db.Schedules
            .Include(s => s.ApiEndpoint)
            .Where(s => s.IsEnabled && s.NextRunAt <= now)
            .ToListAsync(ct);

        if (dueSchedules.Count == 0) return;

        _logger.LogDebug("Processing {Count} due schedules", dueSchedules.Count);

        var semaphore = new SemaphoreSlim(5); // max 5 concurrent

        var tasks = dueSchedules.Select(async schedule =>
        {
            await semaphore.WaitAsync(ct);
            try
            {
                if (schedule.ApiEndpoint == null) return;

                var result = await executionService.ExecuteAsync(schedule.ApiEndpoint, ct);

                var rules = await db.ValidationRules
                    .Where(r => r.ApiEndpointId == schedule.ApiEndpointId)
                    .ToListAsync(ct);
                result.IsSuccess = validationService.Validate(result, rules);

                db.ApiResults.Add(result);

                schedule.LastRunAt = now;
                schedule.NextRunAt = now.AddSeconds(schedule.IntervalSeconds);

                await db.SaveChangesAsync(ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing schedule {ScheduleId}", schedule.Id);
            }
            finally
            {
                semaphore.Release();
            }
        });

        await Task.WhenAll(tasks);
    }
}
