using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LithiumApp.Api.Data;
using LithiumApp.Api.DTOs;
using LithiumApp.Api.Models;

namespace LithiumApp.Api.Controllers;

[ApiController]
[Route("api/schedules")]
public class SchedulesController : ControllerBase
{
    private readonly AppDbContext _db;

    public SchedulesController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<List<Schedule>>> GetAll([FromQuery] int? endpointId)
    {
        var query = _db.Schedules.Include(s => s.ApiEndpoint).AsQueryable();
        if (endpointId.HasValue)
            query = query.Where(s => s.ApiEndpointId == endpointId.Value);
        return await query.ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Schedule>> GetById(int id)
    {
        var schedule = await _db.Schedules.Include(s => s.ApiEndpoint).FirstOrDefaultAsync(s => s.Id == id);
        return schedule == null ? NotFound() : Ok(schedule);
    }

    [HttpPost]
    public async Task<ActionResult<Schedule>> Create([FromBody] CreateScheduleDto dto, [FromQuery] int endpointId)
    {
        if (!await _db.ApiEndpoints.AnyAsync(e => e.Id == endpointId))
            return BadRequest("Endpoint not found");

        var schedule = new Schedule
        {
            ApiEndpointId = endpointId,
            IntervalSeconds = dto.IntervalSeconds,
            IsEnabled = dto.IsEnabled,
            NextRunAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _db.Schedules.Add(schedule);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = schedule.Id }, schedule);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<Schedule>> Update(int id, [FromBody] UpdateScheduleDto dto)
    {
        var schedule = await _db.Schedules.FindAsync(id);
        if (schedule == null) return NotFound();
        if (dto.IntervalSeconds.HasValue) schedule.IntervalSeconds = dto.IntervalSeconds.Value;
        if (dto.IsEnabled.HasValue) schedule.IsEnabled = dto.IsEnabled.Value;
        schedule.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(schedule);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var schedule = await _db.Schedules.FindAsync(id);
        if (schedule == null) return NotFound();
        _db.Schedules.Remove(schedule);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
