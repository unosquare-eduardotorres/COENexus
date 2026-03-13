using Microsoft.EntityFrameworkCore;
using OperationNexus.Api.Models.Entities;

namespace OperationNexus.Api.Data;

public class NexusDbContext : DbContext
{
    public NexusDbContext(DbContextOptions<NexusDbContext> options) : base(options) { }

    public DbSet<SyncedEmployee> SyncedEmployees => Set<SyncedEmployee>();
    public DbSet<SyncedCandidate> SyncedCandidates => Set<SyncedCandidate>();
    public DbSet<ResumeEmbedding> ResumeEmbeddings => Set<ResumeEmbedding>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasPostgresExtension("vector");

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
            entity.Property(e => e.Embedding).HasColumnType("vector(1024)").IsRequired(false);
        });
    }
}
