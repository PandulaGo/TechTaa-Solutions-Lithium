using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LithiumApp.Api.Data;
using LithiumApp.Api.DTOs;
using LithiumApp.Api.Models;

namespace LithiumApp.Api.Controllers;

[ApiController]
[Route("api/collections")]
public class CollectionsController : ControllerBase
{
    private readonly AppDbContext _db;

    public CollectionsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<List<Collection>>> GetAll()
    {
        return await _db.Collections.OrderBy(c => c.Name).ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Collection>> GetById(int id)
    {
        var collection = await _db.Collections.Include(c => c.Endpoints).FirstOrDefaultAsync(c => c.Id == id);
        return collection == null ? NotFound() : Ok(collection);
    }

    [HttpGet("{id}/endpoints")]
    public async Task<ActionResult<List<ApiEndpoint>>> GetEndpoints(int id)
    {
        return await _db.ApiEndpoints.Where(e => e.CollectionId == id).ToListAsync();
    }

    [HttpPost]
    public async Task<ActionResult<Collection>> Create([FromBody] CreateCollectionDto dto)
    {
        var collection = new Collection
        {
            Name = dto.Name,
            Description = dto.Description,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _db.Collections.Add(collection);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = collection.Id }, collection);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<Collection>> Update(int id, [FromBody] UpdateCollectionDto dto)
    {
        var collection = await _db.Collections.FindAsync(id);
        if (collection == null) return NotFound();
        if (dto.Name != null) collection.Name = dto.Name;
        if (dto.Description != null) collection.Description = dto.Description;
        collection.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(collection);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var collection = await _db.Collections.FindAsync(id);
        if (collection == null) return NotFound();
        _db.Collections.Remove(collection);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
