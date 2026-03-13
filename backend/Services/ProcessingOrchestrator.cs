using Microsoft.EntityFrameworkCore;
using OperationNexus.Api.Data;
using OperationNexus.Api.Models;
using OperationNexus.Api.Models.Entities;
using Pgvector;
using System.Runtime.CompilerServices;

namespace OperationNexus.Api.Services;

public class ProcessingOrchestrator : IProcessingOrchestrator
{
    private readonly IUpstreamApiService _upstreamApi;
    private readonly IResumeTextExtractor _textExtractor;
    private readonly IVoyageEmbeddingService _voyageService;
    private readonly NexusDbContext _dbContext;

    public ProcessingOrchestrator(
        IUpstreamApiService upstreamApi,
        IResumeTextExtractor textExtractor,
        IVoyageEmbeddingService voyageService,
        NexusDbContext dbContext)
    {
        _upstreamApi = upstreamApi;
        _textExtractor = textExtractor;
        _voyageService = voyageService;
        _dbContext = dbContext;
    }

    public async IAsyncEnumerable<ProcessingEvent> ProcessAsync(
        string source, string token, string model,
        [EnumeratorCancellation] CancellationToken ct = default)
    {
        var eligibleIds = source == "employees"
            ? await GetEligibleEmployeeIds(ct)
            : await GetEligibleCandidateIds(ct);

        int total = eligibleIds.Count;
        int processed = 0, success = 0, failed = 0, skipped = 0;
        int index = 0;

        foreach (var (dbId, upstreamId, name, noteId, filename, isBench) in eligibleIds)
        {
            ct.ThrowIfCancellationRequested();
            index++;

            var recordId = $"{source}-{upstreamId}";
            var events = await ProcessSingleRecord(
                source, token, model, dbId, upstreamId, name, noteId, filename, isBench, recordId, ct);

            bool madeEmbeddingCall = false;
            foreach (var evt in events)
            {
                if (evt is ProcessingRecordEvent rec)
                {
                    processed++;
                    switch (rec.Record.Status)
                    {
                        case "completed": success++; madeEmbeddingCall = true; break;
                        case "failed" when rec.Record.Error is "No resume note ID" or "Empty text after extraction": skipped++; break;
                        case "failed": failed++; madeEmbeddingCall = true; break;
                    }
                }
                yield return evt;
            }

            yield return MakeProgress(source, total, processed, success, failed, skipped);

            if (madeEmbeddingCall && index < total)
                await Task.Delay(TimeSpan.FromSeconds(21), ct);
        }

        yield return new ProcessingCompleteEvent(new ProcessingProgressDto
        {
            Source = source, Status = "completed",
            TotalRecords = total, ProcessedRecords = processed,
            SuccessCount = success, FailedCount = failed, SkippedCount = skipped
        });
    }

    public async IAsyncEnumerable<ProcessingEvent> ExtractAsync(
        string source, string token,
        [EnumeratorCancellation] CancellationToken ct = default)
    {
        var eligibleIds = source == "employees"
            ? await GetEligibleEmployeesForExtraction(ct)
            : await GetEligibleCandidatesForExtraction(ct);

        int total = eligibleIds.Count;
        int processed = 0, success = 0, failed = 0, skipped = 0;

        foreach (var (dbId, upstreamId, name, noteId, filename, isBench) in eligibleIds)
        {
            ct.ThrowIfCancellationRequested();

            var recordId = $"{source}-{upstreamId}";
            processed++;

            var recordEvent = await ExtractSingleRecord(source, token, dbId, upstreamId, name, noteId, filename, isBench, recordId, ct);

            if (recordEvent.Record.Status == "completed")
                success++;
            else if (recordEvent.Record.Error is "No resume note ID" or "Empty text after extraction")
                skipped++;
            else
                failed++;

            yield return recordEvent;
            yield return MakeProgress(source, total, processed, success, failed, skipped);
        }

        yield return new ProcessingCompleteEvent(new ProcessingProgressDto
        {
            Source = source, Status = "completed",
            TotalRecords = total, ProcessedRecords = processed,
            SuccessCount = success, FailedCount = failed, SkippedCount = skipped
        });
    }

    private async Task<ProcessingRecordEvent> ExtractSingleRecord(
        string source, string token, int dbId, int upstreamId, string name,
        int? noteId, string? filename, bool isBench, string recordId, CancellationToken ct)
    {
        try
        {
            if (noteId == null)
            {
                await MarkEntityFailed(source, dbId, ct);
                return new ProcessingRecordEvent(new ProcessingRecordDto
                {
                    Id = recordId, UpstreamId = upstreamId, Name = name,
                    Status = "failed", Error = "No resume note ID"
                });
            }

            var fileBytes = await _upstreamApi.GetNoteFileAsync(token, noteId.Value);
            var text = _textExtractor.ExtractText(fileBytes, filename ?? "resume.pdf");

            if (string.IsNullOrWhiteSpace(text))
            {
                await MarkEntityFailed(source, dbId, ct);
                return new ProcessingRecordEvent(new ProcessingRecordDto
                {
                    Id = recordId, UpstreamId = upstreamId, Name = name,
                    Status = "failed", Error = "Empty text after extraction",
                    ResumeSizeKb = fileBytes.Length / 1024
                });
            }

            var existing = await _dbContext.ResumeEmbeddings
                .FirstOrDefaultAsync(e => e.SourceType == source && e.SourceId == dbId, ct);

            if (existing != null)
            {
                existing.ResumeText = text;
                existing.Embedding = null;
                existing.UpstreamId = upstreamId;
                existing.IsBench = isBench;
                existing.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                _dbContext.ResumeEmbeddings.Add(new ResumeEmbedding
                {
                    SourceType = source,
                    SourceId = dbId,
                    UpstreamId = upstreamId,
                    Embedding = null,
                    ResumeText = text,
                    IsBench = isBench,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }

            await UpdateEntityStatus(source, dbId, "extracted", false, ct);

            return new ProcessingRecordEvent(new ProcessingRecordDto
            {
                Id = recordId, UpstreamId = upstreamId, Name = name,
                Status = "completed", ResumeSizeKb = fileBytes.Length / 1024,
                ExtractedChunks = (int)Math.Ceiling(text.Length / 512.0)
            });
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[ExtractSingleRecord] {source}/{dbId} ({name}) failed: {ex}");
            _dbContext.ChangeTracker.Clear();
            try
            {
                await MarkEntityFailed(source, dbId, ct);
            }
            catch (Exception markEx)
            {
                Console.Error.WriteLine($"Failed to mark {source}/{dbId} as failed: {markEx.Message}");
            }
            return new ProcessingRecordEvent(new ProcessingRecordDto
            {
                Id = recordId, UpstreamId = upstreamId, Name = name,
                Status = "failed", Error = ex.Message
            });
        }
    }

    public async IAsyncEnumerable<ProcessingEvent> VectorizeAsync(
        string source, string model,
        [EnumeratorCancellation] CancellationToken ct = default)
    {
        var eligibleIds = source == "employees"
            ? await GetEligibleEmployeesForVectorization(ct)
            : await GetEligibleCandidatesForVectorization(ct);

        int total = eligibleIds.Count;
        int processed = 0, success = 0, failed = 0, skipped = 0;
        int index = 0;

        foreach (var (dbId, upstreamId, name) in eligibleIds)
        {
            ct.ThrowIfCancellationRequested();
            index++;

            var recordId = $"{source}-{upstreamId}";
            processed++;

            var recordEvent = await VectorizeSingleRecord(source, model, dbId, upstreamId, name, recordId, ct);

            if (recordEvent.Record.Status == "completed")
                success++;
            else if (recordEvent.Record.Error == "No extracted resume text found")
                skipped++;
            else
                failed++;

            yield return recordEvent;
            yield return MakeProgress(source, total, processed, success, failed, skipped);

            if (index < total)
                await Task.Delay(TimeSpan.FromSeconds(21), ct);
        }

        yield return new ProcessingCompleteEvent(new ProcessingProgressDto
        {
            Source = source, Status = "completed",
            TotalRecords = total, ProcessedRecords = processed,
            SuccessCount = success, FailedCount = failed, SkippedCount = skipped
        });
    }

    private async Task<ProcessingRecordEvent> VectorizeSingleRecord(
        string source, string model, int dbId, int upstreamId, string name,
        string recordId, CancellationToken ct)
    {
        try
        {
            var embedding = await _dbContext.ResumeEmbeddings
                .FirstOrDefaultAsync(e => e.SourceType == source && e.SourceId == dbId, ct);

            if (embedding == null || string.IsNullOrWhiteSpace(embedding.ResumeText))
            {
                return new ProcessingRecordEvent(new ProcessingRecordDto
                {
                    Id = recordId, UpstreamId = upstreamId, Name = name,
                    Status = "failed", Error = "No extracted resume text found"
                });
            }

            var textToVectorize = source == "employees"
                ? await BuildEnrichedTextForEmployee(dbId, embedding.ResumeText, ct)
                : embedding.ResumeText;
            var vector = await _voyageService.GenerateEmbeddingAsync(textToVectorize, model, ct);
            embedding.Embedding = new Vector(vector);
            embedding.UpdatedAt = DateTime.UtcNow;

            await UpdateEntityStatus(source, dbId, "vectorized", false, ct);

            return new ProcessingRecordEvent(new ProcessingRecordDto
            {
                Id = recordId, UpstreamId = upstreamId, Name = name,
                Status = "completed", VectorDimensions = 1024
            });
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[VectorizeSingleRecord] {source}/{dbId} ({name}) failed: {ex}");
            _dbContext.ChangeTracker.Clear();
            try
            {
                await MarkEntityFailed(source, dbId, ct);
            }
            catch (Exception markEx)
            {
                Console.Error.WriteLine($"Failed to mark {source}/{dbId} as failed: {markEx.Message}");
            }
            return new ProcessingRecordEvent(new ProcessingRecordDto
            {
                Id = recordId, UpstreamId = upstreamId, Name = name,
                Status = "failed", Error = ex.Message
            });
        }
    }

    private async Task<List<ProcessingEvent>> ProcessSingleRecord(
        string source, string token, string model,
        int dbId, int upstreamId, string name, int? noteId, string? filename,
        bool isBench, string recordId, CancellationToken ct)
    {
        var events = new List<ProcessingEvent>();

        try
        {
            if (noteId == null)
            {
                events.Add(new ProcessingRecordEvent(new ProcessingRecordDto
                {
                    Id = recordId, UpstreamId = upstreamId, Name = name,
                    Status = "failed", Error = "No resume note ID"
                }));
                return events;
            }

            var fileBytes = await _upstreamApi.GetNoteFileAsync(token, noteId.Value);
            var sizeKb = fileBytes.Length / 1024;

            var text = _textExtractor.ExtractText(fileBytes, filename ?? "resume.pdf");
            if (string.IsNullOrWhiteSpace(text))
            {
                events.Add(new ProcessingRecordEvent(new ProcessingRecordDto
                {
                    Id = recordId, UpstreamId = upstreamId, Name = name,
                    Status = "failed", Error = "Empty text after extraction",
                    ResumeSizeKb = sizeKb
                }));
                return events;
            }

            var chunks = (int)Math.Ceiling(text.Length / 512.0);
            var textToVectorize = source == "employees"
                ? await BuildEnrichedTextForEmployee(dbId, text, ct)
                : text;
            var embedding = await _voyageService.GenerateEmbeddingAsync(textToVectorize, model, ct);

            var existing = await _dbContext.ResumeEmbeddings
                .FirstOrDefaultAsync(e => e.SourceType == source && e.SourceId == dbId, ct);

            if (existing != null)
            {
                existing.Embedding = new Vector(embedding);
                existing.ResumeText = text;
                existing.UpstreamId = upstreamId;
                existing.IsBench = isBench;
                existing.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                _dbContext.ResumeEmbeddings.Add(new ResumeEmbedding
                {
                    SourceType = source,
                    SourceId = dbId,
                    UpstreamId = upstreamId,
                    Embedding = new Vector(embedding),
                    ResumeText = text,
                    IsBench = isBench,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }

            await _dbContext.SaveChangesAsync(ct);

            events.Add(new ProcessingRecordEvent(new ProcessingRecordDto
            {
                Id = recordId, UpstreamId = upstreamId, Name = name,
                Status = "completed", ResumeSizeKb = sizeKb,
                ExtractedChunks = chunks, VectorDimensions = 1024
            }));
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[ProcessSingleRecord] {source}/{dbId} ({name}) failed: {ex}");
            _dbContext.ChangeTracker.Clear();
            events.Add(new ProcessingRecordEvent(new ProcessingRecordDto
            {
                Id = recordId, UpstreamId = upstreamId, Name = name,
                Status = "failed", Error = ex.Message
            }));
        }

        return events;
    }

    public async Task<ProcessingRecordDto> VectorizeSingleAsync(
        string source, string model, int upstreamId, CancellationToken ct = default)
    {
        int dbId;
        string name;
        int? noteId;
        string? filename;
        bool isBench;
        string entityStatus;

        if (source == "employees")
        {
            var emp = await _dbContext.SyncedEmployees
                .FirstOrDefaultAsync(e => e.UpstreamId == upstreamId, ct)
                ?? throw new InvalidOperationException($"Employee with upstreamId {upstreamId} not found");
            dbId = emp.Id;
            name = emp.FullName;
            noteId = emp.ResumeNoteId;
            filename = emp.ResumeFilename;
            isBench = emp.IsBench;
            entityStatus = emp.Status;
        }
        else
        {
            var cand = await _dbContext.SyncedCandidates
                .FirstOrDefaultAsync(c => c.UpstreamId == upstreamId, ct)
                ?? throw new InvalidOperationException($"Candidate with upstreamId {upstreamId} not found");
            dbId = cand.Id;
            name = cand.FullName;
            noteId = cand.ResumeNoteId;
            filename = cand.ResumeFilename;
            isBench = false;
            entityStatus = cand.Status;
        }

        var recordId = $"{source}-{upstreamId}";

        if (entityStatus == "extracted")
            return await VectorizeSingleFromExtracted(source, model, dbId, upstreamId, name, recordId, ct);

        var events = await ProcessSingleRecord(source, "", model, dbId, upstreamId, name, noteId, filename, isBench, recordId, ct);

        var recordEvent = events.OfType<ProcessingRecordEvent>().FirstOrDefault();
        if (recordEvent?.Record.Status == "completed")
            await UpdateEntityStatus(source, dbId, "vectorized", false, ct);
        else if (recordEvent?.Record.Status == "failed")
            await MarkEntityFailed(source, dbId, ct);

        return recordEvent?.Record ?? new ProcessingRecordDto
        {
            Id = recordId,
            UpstreamId = upstreamId,
            Name = name,
            Status = "failed",
            Error = "No result produced"
        };
    }

    private async Task<ProcessingRecordDto> VectorizeSingleFromExtracted(
        string source, string model, int dbId, int upstreamId, string name,
        string recordId, CancellationToken ct)
    {
        try
        {
            var embedding = await _dbContext.ResumeEmbeddings
                .FirstOrDefaultAsync(e => e.SourceType == source && e.SourceId == dbId, ct);

            if (embedding == null || string.IsNullOrWhiteSpace(embedding.ResumeText))
            {
                await MarkEntityFailed(source, dbId, ct);
                return new ProcessingRecordDto
                {
                    Id = recordId, UpstreamId = upstreamId, Name = name,
                    Status = "failed", Error = "No extracted resume text found"
                };
            }

            var textToVectorize = source == "employees"
                ? await BuildEnrichedTextForEmployee(dbId, embedding.ResumeText, ct)
                : embedding.ResumeText;
            var vector = await _voyageService.GenerateEmbeddingAsync(textToVectorize, model, ct);
            embedding.Embedding = new Vector(vector);
            embedding.UpdatedAt = DateTime.UtcNow;

            await UpdateEntityStatus(source, dbId, "vectorized", false, ct);

            return new ProcessingRecordDto
            {
                Id = recordId, UpstreamId = upstreamId, Name = name,
                Status = "completed", VectorDimensions = 1024
            };
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[VectorizeSingleFromExtracted] {source}/{dbId} ({name}) failed: {ex}");
            _dbContext.ChangeTracker.Clear();
            try
            {
                await MarkEntityFailed(source, dbId, ct);
            }
            catch (Exception markEx)
            {
                Console.Error.WriteLine($"Failed to mark {source}/{dbId} as failed: {markEx.Message}");
            }
            return new ProcessingRecordDto
            {
                Id = recordId, UpstreamId = upstreamId, Name = name,
                Status = "failed", Error = ex.Message
            };
        }
    }

    private async Task UpdateEntityStatus(string source, int dbId, string status, bool failed, CancellationToken ct)
    {
        if (source == "employees")
        {
            var emp = await _dbContext.SyncedEmployees.FirstOrDefaultAsync(e => e.Id == dbId, ct);
            if (emp != null)
            {
                emp.Status = status;
                emp.Failed = failed;
                await _dbContext.SaveChangesAsync(ct);
            }
        }
        else
        {
            var cand = await _dbContext.SyncedCandidates.FirstOrDefaultAsync(c => c.Id == dbId, ct);
            if (cand != null)
            {
                cand.Status = status;
                cand.Failed = failed;
                await _dbContext.SaveChangesAsync(ct);
            }
        }
    }

    private async Task MarkEntityFailed(string source, int dbId, CancellationToken ct)
    {
        if (source == "employees")
        {
            var emp = await _dbContext.SyncedEmployees.FirstOrDefaultAsync(e => e.Id == dbId, ct);
            if (emp != null)
            {
                emp.Failed = true;
                await _dbContext.SaveChangesAsync(ct);
            }
        }
        else
        {
            var cand = await _dbContext.SyncedCandidates.FirstOrDefaultAsync(c => c.Id == dbId, ct);
            if (cand != null)
            {
                cand.Failed = true;
                await _dbContext.SaveChangesAsync(ct);
            }
        }
    }

    private async Task<List<(int DbId, int UpstreamId, string Name, int? NoteId, string? Filename, bool IsBench)>> GetEligibleEmployeesForExtraction(CancellationToken ct)
    {
        return await _dbContext.SyncedEmployees
            .Where(e => e.Status == "synced" && e.HasResume && !e.Failed)
            .Select(e => new { e.Id, e.UpstreamId, e.FullName, e.ResumeNoteId, e.ResumeFilename, e.IsBench })
            .AsAsyncEnumerable()
            .Select(e => (e.Id, e.UpstreamId, e.FullName, e.ResumeNoteId, e.ResumeFilename, e.IsBench))
            .ToListAsync(ct);
    }

    private async Task<List<(int DbId, int UpstreamId, string Name, int? NoteId, string? Filename, bool IsBench)>> GetEligibleCandidatesForExtraction(CancellationToken ct)
    {
        return await _dbContext.SyncedCandidates
            .Where(c => c.Status == "synced" && c.HasResume && !c.Failed)
            .Select(c => new { c.Id, c.UpstreamId, c.FullName, c.ResumeNoteId, c.ResumeFilename, IsBench = false })
            .AsAsyncEnumerable()
            .Select(c => (c.Id, c.UpstreamId, c.FullName, c.ResumeNoteId, c.ResumeFilename, c.IsBench))
            .ToListAsync(ct);
    }

    private async Task<List<(int DbId, int UpstreamId, string Name)>> GetEligibleEmployeesForVectorization(CancellationToken ct)
    {
        return await _dbContext.SyncedEmployees
            .Where(e => e.Status == "extracted" && !e.Failed)
            .Select(e => new { e.Id, e.UpstreamId, e.FullName })
            .AsAsyncEnumerable()
            .Select(e => (e.Id, e.UpstreamId, e.FullName))
            .ToListAsync(ct);
    }

    private async Task<List<(int DbId, int UpstreamId, string Name)>> GetEligibleCandidatesForVectorization(CancellationToken ct)
    {
        return await _dbContext.SyncedCandidates
            .Where(c => c.Status == "extracted" && !c.Failed)
            .Select(c => new { c.Id, c.UpstreamId, c.FullName })
            .AsAsyncEnumerable()
            .Select(c => (c.Id, c.UpstreamId, c.FullName))
            .ToListAsync(ct);
    }

    private async Task<List<(int DbId, int UpstreamId, string Name, int? NoteId, string? Filename, bool IsBench)>> GetEligibleEmployeeIds(CancellationToken ct)
    {
        var alreadyVectorized = await _dbContext.ResumeEmbeddings
            .Where(e => e.SourceType == "employees")
            .Select(e => e.SourceId)
            .ToListAsync(ct);

        return await _dbContext.SyncedEmployees
            .Where(e => e.HasResume && !alreadyVectorized.Contains(e.Id))
            .Select(e => new { e.Id, e.UpstreamId, e.FullName, e.ResumeNoteId, e.ResumeFilename, e.IsBench })
            .AsAsyncEnumerable()
            .Select(e => (e.Id, e.UpstreamId, e.FullName, e.ResumeNoteId, e.ResumeFilename, e.IsBench))
            .ToListAsync(ct);
    }

    private async Task<List<(int DbId, int UpstreamId, string Name, int? NoteId, string? Filename, bool IsBench)>> GetEligibleCandidateIds(CancellationToken ct)
    {
        var alreadyVectorized = await _dbContext.ResumeEmbeddings
            .Where(e => e.SourceType == "candidates")
            .Select(e => e.SourceId)
            .ToListAsync(ct);

        return await _dbContext.SyncedCandidates
            .Where(c => c.HasResume && !alreadyVectorized.Contains(c.Id))
            .Select(c => new { c.Id, c.UpstreamId, c.FullName, c.ResumeNoteId, c.ResumeFilename, IsBench = false })
            .AsAsyncEnumerable()
            .Select(c => (c.Id, c.UpstreamId, c.FullName, c.ResumeNoteId, c.ResumeFilename, c.IsBench))
            .ToListAsync(ct);
    }

    private async Task<string> BuildEnrichedTextForEmployee(int dbId, string rawText, CancellationToken ct)
    {
        var emp = await _dbContext.SyncedEmployees.FirstOrDefaultAsync(e => e.Id == dbId, ct);
        if (emp == null)
            return rawText;

        var lines = new List<string>();

        if (!string.IsNullOrWhiteSpace(emp.JobTitle))
            lines.Add($"Job Title: {emp.JobTitle}");
        if (!string.IsNullOrWhiteSpace(emp.MainSkill))
            lines.Add($"Main Skill: {emp.MainSkill}");
        if (!string.IsNullOrWhiteSpace(emp.Seniority))
            lines.Add($"Seniority: {emp.Seniority}");
        lines.Add($"Availability: {(emp.IsBench ? "Available (On Bench)" : "Currently Assigned")}");
        if (!string.IsNullOrWhiteSpace(emp.Country))
            lines.Add($"Country: {emp.Country}");
        if (!string.IsNullOrWhiteSpace(emp.LastAccount))
            lines.Add($"Last Account: {emp.LastAccount}");

        if (lines.Count == 0)
            return rawText;

        return string.Join("\n", lines) + "\n---\n" + rawText;
    }

    private static ProcessingProgressEvent MakeProgress(string source, int total, int processed, int success, int failed, int skipped)
        => new(new ProcessingProgressDto
        {
            Source = source, Status = "processing",
            TotalRecords = total, ProcessedRecords = processed,
            SuccessCount = success, FailedCount = failed, SkippedCount = skipped
        });
}
