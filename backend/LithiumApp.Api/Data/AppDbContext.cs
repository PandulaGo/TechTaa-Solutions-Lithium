using Microsoft.EntityFrameworkCore;
using LithiumApp.Api.Models;

namespace LithiumApp.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<ApiEndpoint> ApiEndpoints => Set<ApiEndpoint>();
    public DbSet<Collection> Collections => Set<Collection>();
    public DbSet<Schedule> Schedules => Set<Schedule>();
    public DbSet<ApiResult> ApiResults => Set<ApiResult>();
    public DbSet<ValidationRule> ValidationRules => Set<ValidationRule>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ApiEndpoint>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Collection)
                .WithMany(c => c.Endpoints)
                .HasForeignKey(e => e.CollectionId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Schedule>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.ApiEndpoint)
                .WithMany(a => a.Schedules)
                .HasForeignKey(e => e.ApiEndpointId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ApiResult>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.ApiEndpoint)
                .WithMany(a => a.Results)
                .HasForeignKey(e => e.ApiEndpointId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => e.ApiEndpointId);
            entity.HasIndex(e => e.ExecutedAt);
        });

        modelBuilder.Entity<ValidationRule>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.ApiEndpoint)
                .WithMany(a => a.ValidationRules)
                .HasForeignKey(e => e.ApiEndpointId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
