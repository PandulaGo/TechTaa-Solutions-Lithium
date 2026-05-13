using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LithiumApp.Api.Data;
using LithiumApp.Api.DTOs;
using LithiumApp.Api.Models;

namespace LithiumApp.Api.Controllers;

[ApiController]
[Route("api")]
public class ResultsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ResultsController(AppDbContext db) => _db = db;

    [HttpGet("results")]
    public async Task<ActionResult<List<ApiResult>>> GetAll(
        [FromQuery] int? endpointId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] bool? isSuccess = null,
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null)
    {
        var query = _db.ApiResults.Include(r => r.ApiEndpoint).AsQueryable();

        if (endpointId.HasValue)
            query = query.Where(r => r.ApiEndpointId == endpointId.Value);
        if (isSuccess.HasValue)
            query = query.Where(r => r.IsSuccess == isSuccess.Value);
        if (from.HasValue)
            query = query.Where(r => r.ExecutedAt >= from.Value);
        if (to.HasValue)
            query = query.Where(r => r.ExecutedAt <= to.Value);

        return await query
            .OrderByDescending(r => r.ExecutedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    [HttpGet("results/{id}")]
    public async Task<ActionResult<ApiResult>> GetById(int id)
    {
        var result = await _db.ApiResults
            .Include(r => r.ApiEndpoint)
            .FirstOrDefaultAsync(r => r.Id == id);
        return result == null ? NotFound() : Ok(result);
    }

    [HttpGet("dashboard")]
    public async Task<ActionResult<DashboardStats>> GetDashboard()
    {
        var totalEndpoints = await _db.ApiEndpoints.CountAsync();

        var recentResults = await _db.ApiResults
            .GroupBy(r => r.ApiEndpointId)
            .Select(g => g.OrderByDescending(r => r.ExecutedAt).First())
            .ToListAsync();

        var passCount = recentResults.Count(r => r.IsSuccess);
        var failCount = recentResults.Count(r => !r.IsSuccess);
        var avgLatency = recentResults.Count > 0 ? recentResults.Average(r => r.ResponseTimeMs) : 0;

        return Ok(new DashboardStats(totalEndpoints, passCount, failCount, avgLatency));
    }
}
