using Microsoft.EntityFrameworkCore;
using OperationNexus.Api.Data;
using OperationNexus.Api.Models.Entities;
using Pgvector;

namespace OperationNexus.Api.Services;

public class ResumeSessionVectorizer : IResumeSessionVectorizer
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ResumeSessionVectorizer> _logger;

    public ResumeSessionVectorizer(
        IServiceScopeFactory scopeFactory,
        ILogger<ResumeSessionVectorizer> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public async Task VectorizeSessionAsync(int sessionId, string model, CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
        var voyageService = scope.ServiceProvider.GetRequiredService<IVoyageEmbeddingService>();

        var session = await dbContext.ResumeSessions.FindAsync([sessionId], ct);
        if (session == null)
        {
            _logger.LogWarning("Session {SessionId} not found for vectorization", sessionId);
            return;
        }

        if (string.IsNullOrWhiteSpace(session.OriginalResumeText))
        {
            session.VectorizationStatus = "failed";
            session.UpdatedAt = DateTime.UtcNow;
            await dbContext.SaveChangesAsync(ct);
            _logger.LogWarning("Session {SessionId} has no resume text to vectorize", sessionId);
            return;
        }

        try
        {
            session.VectorizationStatus = "processing";
            session.UpdatedAt = DateTime.UtcNow;
            await dbContext.SaveChangesAsync(ct);

            var vector = await voyageService.GenerateEmbeddingAsync(session.OriginalResumeText, model, ct);

            var embedding = await dbContext.ResumeEmbeddings
                .FirstOrDefaultAsync(e => e.SourceType == "resume-session" && e.SourceId == session.Id, ct);

            if (embedding == null)
            {
                embedding = new ResumeEmbedding
                {
                    SourceType = "resume-session",
                    SourceId = session.Id,
                    UpstreamId = session.CandidateUpstreamId ?? session.EmployeeUpstreamId ?? 0,
                    ResumeText = session.OriginalResumeText,
                    Embedding = new Vector(vector),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsBench = false
                };
                dbContext.ResumeEmbeddings.Add(embedding);
                await dbContext.SaveChangesAsync(ct);
            }
            else
            {
                embedding.Embedding = new Vector(vector);
                embedding.ResumeText = session.OriginalResumeText;
                embedding.UpdatedAt = DateTime.UtcNow;
                await dbContext.SaveChangesAsync(ct);
            }

            session.ResumeEmbeddingId = embedding.Id;
            session.VectorizationStatus = "completed";
            session.UpdatedAt = DateTime.UtcNow;
            await dbContext.SaveChangesAsync(ct);

            _logger.LogInformation("Session {SessionId} vectorized successfully (embedding {EmbeddingId})",
                sessionId, embedding.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to vectorize session {SessionId}", sessionId);
            dbContext.ChangeTracker.Clear();

            try
            {
                var failedSession = await dbContext.ResumeSessions.FindAsync([sessionId], ct);
                if (failedSession != null)
                {
                    failedSession.VectorizationStatus = "failed";
                    failedSession.UpdatedAt = DateTime.UtcNow;
                    await dbContext.SaveChangesAsync(ct);
                }
            }
            catch (Exception markEx)
            {
                _logger.LogError(markEx, "Failed to mark session {SessionId} as failed", sessionId);
            }
        }
    }
}
