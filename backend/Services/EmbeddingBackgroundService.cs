using Microsoft.EntityFrameworkCore;
using OperationNexus.Api.Data;
using OperationNexus.Api.Models.Entities;
using Pgvector;

namespace OperationNexus.Api.Services;

public class EmbeddingBackgroundService : BackgroundService
{
    private readonly IEmbeddingJobQueue _queue;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IResumeTextExtractor _textExtractor;
    private readonly ILogger<EmbeddingBackgroundService> _logger;

    public EmbeddingBackgroundService(
        IEmbeddingJobQueue queue,
        IServiceScopeFactory scopeFactory,
        IResumeTextExtractor textExtractor,
        ILogger<EmbeddingBackgroundService> logger)
    {
        _queue = queue;
        _scopeFactory = scopeFactory;
        _textExtractor = textExtractor;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("EmbeddingBackgroundService started");

        await foreach (var job in _queue.DequeueAllAsync(stoppingToken))
        {
            try
            {
                await ProcessJobAsync(job, stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Unhandled error processing embedding job {Source}/{UpstreamId}",
                    job.Source, job.UpstreamId);
                await MarkFailedAsync(job, ex.Message, stoppingToken);
            }
        }
    }

    private async Task ProcessJobAsync(EmbeddingJob job, CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
        var upstreamApi = scope.ServiceProvider.GetRequiredService<IUpstreamApiService>();
        var voyageService = scope.ServiceProvider.GetRequiredService<IVoyageEmbeddingService>();

        _logger.LogInformation("Processing embedding for {Source}/{UpstreamId} ({Name})",
            job.Source, job.UpstreamId, job.Name);

        string resumeText;
        if (job.Source == "open-positions")
        {
            var op = await dbContext.SyncedOpenPositions
                .FirstOrDefaultAsync(o => o.Id == job.DbId, ct);
            if (op == null) return;
            resumeText = op.JobDescription;
        }
        else
        {
            if (job.ResumeNoteId == null)
            {
                await MarkFailedAsync(job, "No resume note ID", ct);
                return;
            }

            var fileBytes = await upstreamApi.GetNoteFileAsync(job.Token, job.ResumeNoteId.Value);
            resumeText = _textExtractor.ExtractText(fileBytes, job.ResumeFilename ?? "resume.pdf");
        }

        if (string.IsNullOrWhiteSpace(resumeText))
        {
            await MarkFailedAsync(job, "Empty text after extraction", ct);
            return;
        }

        resumeText = SanitizeUnicode(resumeText);
        await UpdateEntityStatusAsync(job, "extracted", false, null, ct);

        var textToVectorize = job.Source == "employees"
            ? await BuildEnrichedTextForEmployee(dbContext, job.DbId, resumeText, ct)
            : job.Source == "open-positions"
                ? await BuildEnrichedTextForOpenPosition(dbContext, job.DbId, resumeText, ct)
                : resumeText;

        var vector = await voyageService.GenerateEmbeddingAsync(textToVectorize, job.Model, ct);

        var existing = await dbContext.ResumeEmbeddings
            .FirstOrDefaultAsync(e => e.SourceType == job.Source && e.SourceId == job.DbId, ct);

        if (existing != null)
        {
            existing.Embedding = new Vector(vector);
            existing.ResumeText = resumeText;
            existing.UpstreamId = job.UpstreamId;
            existing.IsBench = job.IsBench;
            existing.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            dbContext.ResumeEmbeddings.Add(new ResumeEmbedding
            {
                SourceType = job.Source,
                SourceId = job.DbId,
                UpstreamId = job.UpstreamId,
                Embedding = new Vector(vector),
                ResumeText = resumeText,
                IsBench = job.IsBench,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
        }

        await dbContext.SaveChangesAsync(ct);
        await UpdateEntityStatusAsync(job, "vectorized", false, null, ct);

        _logger.LogInformation("Embedding completed for {Source}/{UpstreamId} ({Name})",
            job.Source, job.UpstreamId, job.Name);
    }

    private static async Task<string> BuildEnrichedTextForEmployee(
        NexusDbContext db, int dbId, string resumeText, CancellationToken ct)
    {
        var emp = await db.SyncedEmployees.FirstOrDefaultAsync(e => e.Id == dbId, ct);
        if (emp == null) return resumeText;
        return $"Job Title: {emp.JobTitle}\nSeniority: {emp.Seniority}\nMain Skill: {emp.MainSkill}\n\n{resumeText}";
    }

    private static async Task<string> BuildEnrichedTextForOpenPosition(
        NexusDbContext db, int dbId, string text, CancellationToken ct)
    {
        var op = await db.SyncedOpenPositions.FirstOrDefaultAsync(o => o.Id == dbId, ct);
        if (op == null) return text;
        return $"Account: {op.Account}\nMain Skill: {op.MainSkill}\nSeniority: {op.Seniorities}\n\n{text}";
    }

    private async Task MarkFailedAsync(EmbeddingJob job, string reason, CancellationToken ct)
    {
        try
        {
            await UpdateEntityStatusAsync(job, null, true, reason, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to mark {Source}/{UpstreamId} as failed", job.Source, job.UpstreamId);
        }
    }

    private async Task UpdateEntityStatusAsync(
        EmbeddingJob job, string? status, bool failed, string? reason, CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();

        if (job.Source == "employees")
        {
            var emp = await db.SyncedEmployees.FirstOrDefaultAsync(e => e.Id == job.DbId, ct);
            if (emp != null)
            {
                if (status != null) emp.Status = status;
                emp.Failed = failed;
                emp.StatusReason = reason;
                await db.SaveChangesAsync(ct);
            }
        }
        else if (job.Source == "candidates")
        {
            var cand = await db.SyncedCandidates.FirstOrDefaultAsync(c => c.Id == job.DbId, ct);
            if (cand != null)
            {
                if (status != null) cand.Status = status;
                cand.Failed = failed;
                cand.StatusReason = reason;
                await db.SaveChangesAsync(ct);
            }
        }
        else if (job.Source == "open-positions")
        {
            var op = await db.SyncedOpenPositions.FirstOrDefaultAsync(o => o.Id == job.DbId, ct);
            if (op != null)
            {
                if (status != null) op.Status = status;
                op.Failed = failed;
                op.StatusReason = reason;
                await db.SaveChangesAsync(ct);
            }
        }
    }

    private static string SanitizeUnicode(string text)
        => new(text.Where(c => !char.IsSurrogate(c) || char.IsHighSurrogate(c)).ToArray());
}
