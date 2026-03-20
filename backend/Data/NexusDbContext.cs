using Microsoft.EntityFrameworkCore;
using OperationNexus.Api.Models.Entities;

namespace OperationNexus.Api.Data;

public class NexusDbContext : DbContext
{
    public NexusDbContext(DbContextOptions<NexusDbContext> options) : base(options) { }

    public DbSet<SyncedEmployee> SyncedEmployees => Set<SyncedEmployee>();
    public DbSet<SyncedCandidate> SyncedCandidates => Set<SyncedCandidate>();
    public DbSet<ResumeEmbedding> ResumeEmbeddings => Set<ResumeEmbedding>();
    public DbSet<MatchSession> MatchSessions => Set<MatchSession>();
    public DbSet<SyncedOpenPosition> SyncedOpenPositions => Set<SyncedOpenPosition>();
    public DbSet<OpenPositionCandidate> OpenPositionCandidates => Set<OpenPositionCandidate>();
    public DbSet<ResumeSession> ResumeSessions => Set<ResumeSession>();
    public DbSet<TransformSession> TransformSessions => Set<TransformSession>();

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

        modelBuilder.Entity<MatchSession>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.CreatedAt).IsDescending();
        });

        modelBuilder.Entity<SyncedOpenPosition>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UpstreamId).IsUnique();
            entity.Ignore(e => e.Embedding);
        });

        modelBuilder.Entity<OpenPositionCandidate>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.OpenPositionId, e.CandidateRequisitionId }).IsUnique();
        });

        modelBuilder.Entity<ResumeSession>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.CreatedAt).IsDescending();
            entity.HasIndex(e => e.CandidateUpstreamId);
            entity.HasIndex(e => e.EmployeeUpstreamId);

            entity.HasOne(e => e.ResumeEmbedding)
                  .WithMany()
                  .HasForeignKey(e => e.ResumeEmbeddingId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<TransformSession>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.CreatedAt).IsDescending();
            entity.HasIndex(e => new { e.ContextType, e.ContextId });
        });
    }
}
