using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LithiumApp.Api.Data;
using LithiumApp.Api.DTOs;
using LithiumApp.Api.Models;

namespace LithiumApp.Api.Controllers;

[ApiController]
[Route("api/validation-rules")]
public class ValidationRulesController : ControllerBase
{
    private readonly AppDbContext _db;

    public ValidationRulesController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<List<ValidationRule>>> GetAll([FromQuery] int? endpointId)
    {
        var query = _db.ValidationRules.AsQueryable();
        if (endpointId.HasValue)
            query = query.Where(r => r.ApiEndpointId == endpointId.Value);
        return await query.OrderBy(r => r.Order).ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ValidationRule>> GetById(int id)
    {
        var rule = await _db.ValidationRules.FindAsync(id);
        return rule == null ? NotFound() : Ok(rule);
    }

    [HttpPost]
    public async Task<ActionResult<ValidationRule>> Create([FromBody] CreateValidationRuleDto dto, [FromQuery] int endpointId)
    {
        if (!await _db.ApiEndpoints.AnyAsync(e => e.Id == endpointId))
            return BadRequest("Endpoint not found");

        var rule = new ValidationRule
        {
            ApiEndpointId = endpointId,
            RuleType = dto.RuleType,
            ExpectedValue = dto.ExpectedValue,
            ComparisonType = dto.ComparisonType,
            Order = dto.Order,
            IsEnabled = dto.IsEnabled
        };
        _db.ValidationRules.Add(rule);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = rule.Id }, rule);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ValidationRule>> Update(int id, [FromBody] UpdateValidationRuleDto dto)
    {
        var rule = await _db.ValidationRules.FindAsync(id);
        if (rule == null) return NotFound();
        if (dto.RuleType != null) rule.RuleType = dto.RuleType;
        if (dto.ExpectedValue != null) rule.ExpectedValue = dto.ExpectedValue;
        if (dto.ComparisonType != null) rule.ComparisonType = dto.ComparisonType;
        if (dto.Order.HasValue) rule.Order = dto.Order.Value;
        if (dto.IsEnabled.HasValue) rule.IsEnabled = dto.IsEnabled.Value;
        await _db.SaveChangesAsync();
        return Ok(rule);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var rule = await _db.ValidationRules.FindAsync(id);
        if (rule == null) return NotFound();
        _db.ValidationRules.Remove(rule);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
