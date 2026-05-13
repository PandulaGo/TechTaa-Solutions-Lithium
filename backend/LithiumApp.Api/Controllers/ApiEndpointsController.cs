using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LithiumApp.Api.Data;
using LithiumApp.Api.DTOs;
using LithiumApp.Api.Models;
using LithiumApp.Api.Services;

namespace LithiumApp.Api.Controllers;

[ApiController]
[Route("api/endpoints")]
public class ApiEndpointsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ApiExecutionService _executionService;
    private readonly ValidationService _validationService;
    private readonly ExportImportService _exportService;

    public ApiEndpointsController(AppDbContext db, ApiExecutionService executionService, ValidationService validationService, ExportImportService exportService)
    {
        _db = db;
        _executionService = executionService;
        _validationService = validationService;
        _exportService = exportService;
    }

    [HttpGet]
    public async Task<ActionResult<List<ApiEndpoint>>> GetAll([FromQuery] int? collectionId)
    {
        var query = _db.ApiEndpoints.Include(e => e.Collection).AsQueryable();
        if (collectionId.HasValue)
            query = query.Where(e => e.CollectionId == collectionId.Value);
        return await query.OrderByDescending(e => e.UpdatedAt).ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiEndpoint>> GetById(int id)
    {
        var endpoint = await _db.ApiEndpoints
            .Include(e => e.Collection)
            .Include(e => e.Schedules)
            .Include(e => e.ValidationRules)
            .FirstOrDefaultAsync(e => e.Id == id);
        return endpoint == null ? NotFound() : Ok(endpoint);
    }

    [HttpPost]
    public async Task<ActionResult<ApiEndpoint>> Create([FromBody] CreateEndpointDto dto)
    {
        var endpoint = new ApiEndpoint
        {
            Name = dto.Name,
            Description = dto.Description,
            Method = dto.Method.ToUpperInvariant(),
            Url = dto.Url,
            Headers = dto.Headers,
            Body = dto.Body,
            BodyType = dto.BodyType,
            AuthType = dto.AuthType,
            AuthConfig = dto.AuthConfig,
            CollectionId = dto.CollectionId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.ApiEndpoints.Add(endpoint);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = endpoint.Id }, endpoint);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ApiEndpoint>> Update(int id, [FromBody] UpdateEndpointDto dto)
    {
        var endpoint = await _db.ApiEndpoints.FindAsync(id);
        if (endpoint == null) return NotFound();

        if (dto.Name != null) endpoint.Name = dto.Name;
        if (dto.Description != null) endpoint.Description = dto.Description;
        if (dto.Method != null) endpoint.Method = dto.Method.ToUpperInvariant();
        if (dto.Url != null) endpoint.Url = dto.Url;
        if (dto.Headers != null) endpoint.Headers = dto.Headers;
        if (dto.Body != null) endpoint.Body = dto.Body;
        if (dto.BodyType != null) endpoint.BodyType = dto.BodyType;
        if (dto.AuthType != null) endpoint.AuthType = dto.AuthType;
        if (dto.AuthConfig != null) endpoint.AuthConfig = dto.AuthConfig;
        if (dto.CollectionId.HasValue) endpoint.CollectionId = dto.CollectionId;
        endpoint.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(endpoint);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var endpoint = await _db.ApiEndpoints.FindAsync(id);
        if (endpoint == null) return NotFound();
        _db.ApiEndpoints.Remove(endpoint);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id}/run")]
    public async Task<ActionResult<ApiResult>> Run(int id)
    {
        var endpoint = await _db.ApiEndpoints
            .Include(e => e.ValidationRules)
            .FirstOrDefaultAsync(e => e.Id == id);
        if (endpoint == null) return NotFound();

        var result = await _executionService.ExecuteAsync(endpoint);
        result.IsSuccess = _validationService.Validate(result, endpoint.ValidationRules);

        _db.ApiResults.Add(result);
        await _db.SaveChangesAsync();

        return Ok(result);
    }

    [HttpPost("bulk-run")]
    public async Task<ActionResult<List<ApiResult>>> BulkRun([FromBody] BulkRunRequest request)
    {
        var endpoints = await _db.ApiEndpoints
            .Include(e => e.ValidationRules)
            .Where(e => request.EndpointIds.Contains(e.Id))
            .ToListAsync();

        var results = new List<ApiResult>();
        var semaphore = new SemaphoreSlim(5);

        var tasks = endpoints.Select(async endpoint =>
        {
            await semaphore.WaitAsync();
            try
            {
                var result = await _executionService.ExecuteAsync(endpoint);
                result.IsSuccess = _validationService.Validate(result, endpoint.ValidationRules);
                lock (results) { results.Add(result); }
                _db.ApiResults.Add(result);
            }
            finally { semaphore.Release(); }
        });

        await Task.WhenAll(tasks);
        await _db.SaveChangesAsync();

        return Ok(results);
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] string ids)
    {
        if (string.IsNullOrWhiteSpace(ids))
            return BadRequest("No endpoint IDs provided");

        var idList = ids.Split(',').Select(int.Parse).ToList();
        var payload = await _exportService.ExportAsync(idList);
        return Ok(payload);
    }

    [HttpPost("import")]
    public async Task<IActionResult> Import([FromBody] ExportPayload payload)
    {
        var imported = await _exportService.ImportAsync(payload.Endpoints);
        return Ok(new { imported });
    }
}
