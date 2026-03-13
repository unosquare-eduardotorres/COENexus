using Microsoft.EntityFrameworkCore;
using OperationNexus.Api.Data;
using OperationNexus.Api.Models.Entities;

namespace OperationNexus.Tests;

public class TestDbContext : NexusDbContext
{
    public TestDbContext(DbContextOptions<NexusDbContext> options) : base(options) { }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<SyncedEmployee>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UpstreamId).IsUnique();
            entity.Ignore(e => e.Embedding);
        });

        modelBuilder.Entity<SyncedCandidate>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UpstreamId).IsUnique();
            entity.Ignore(e => e.Embedding);
        });

        modelBuilder.Entity<ResumeEmbedding>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.SourceType, e.SourceId }).IsUnique();
            entity.Ignore(e => e.Embedding);
        });
    }
}
