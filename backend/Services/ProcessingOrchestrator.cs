using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using OperationNexus.Api.Configuration;
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
    private readonly VoyageSettings _voyageSettings;

    public ProcessingOrchestrator(
        IUpstreamApiService upstreamApi,
        IResumeTextExtractor textExtractor,
        IVoyageEmbeddingService voyageService,
        NexusDbContext dbContext,
        IOptions<VoyageSettings> voyageSettings)
    {
        _upstreamApi = upstreamApi;
        _textExtractor = textExtractor;
        _voyageService = voyageService;
        _dbContext = dbContext;
        _voyageSettings = voyageSettings.Value;
    }

    public async IAsyncEnumerable<ProcessingEvent> ExtractAsync(
        string source, string token, int? year = null,
        [EnumeratorCancellation] CancellationToken ct = default)
    {
        var eligibleIds = source == "employees"
            ? await GetEligibleEmployeesForExtraction(ct)
            : await GetEligibleCandidatesForExtraction(year, ct);

        int total = eligibleIds.Count;
        int processed = 0, success = 0, failed = 0, skipped = 0;
        int consecutiveAuthFailures = 0;
        const int authFailureThreshold = 3;

        yield return MakeProgress(source, total, processed, success, failed, skipped);

        const int batchSize = 5;

        for (int batchStart = 0; batchStart < eligibleIds.Count; batchStart += batchSize)
        {
            ct.ThrowIfCancellationRequested();

            var currentBatch = eligibleIds
                .Skip(batchStart)
                .Take(batchSize)
                .ToList();

            var fetchTasks = currentBatch.Select(async item =>
            {
                var (dbId, upstreamId, name, noteId, filename, isBench) = item;
                var recordId = $"{source}-{upstreamId}";

                try
                {
                    if (noteId == null)
                    {
                        return (
                            Item: item,
                            RecordId: recordId,
                            FileBytes: (byte[]?)null,
                            Text: (string?)null,
                            Error: "No resume note ID",
                            IsAuthFailure: false,
                            Exception: (Exception?)null
                        );
                    }

                    var fileBytes = await _upstreamApi.GetNoteFileAsync(token, noteId.Value);
                    var text = _textExtractor.ExtractText(fileBytes, filename ?? "resume.pdf");

                    return (
                        Item: item,
                        RecordId: recordId,
                        FileBytes: (byte[]?)fileBytes,
                        Text: (string?)text,
                        Error: (string?)null,
                        IsAuthFailure: false,
                        Exception: (Exception?)null
                    );
                }
                catch (HttpRequestException httpEx) when (httpEx.StatusCode == System.Net.HttpStatusCode.Unauthorized)
                {
                    return (
                        Item: item,
                        RecordId: recordId,
                        FileBytes: (byte[]?)null,
                        Text: (string?)null,
                        Error: (string?)null,
                        IsAuthFailure: true,
                        Exception: (Exception?)httpEx
                    );
                }
                catch (Exception ex)
                {
                    return (
                        Item: item,
                        RecordId: recordId,
                        FileBytes: (byte[]?)null,
                        Text: (string?)null,
                        Error: (string?)null,
                        IsAuthFailure: false,
                        Exception: (Exception?)ex
                    );
                }
            }).ToList();

            var fetchResults = await Task.WhenAll(fetchTasks);

            int batchAuthFailures = fetchResults.Count(r => r.IsAuthFailure);
            if (batchAuthFailures > 0 && batchAuthFailures == fetchResults.Count(r => r.Exception != null || r.Error == null))
            {
                consecutiveAuthFailures += batchAuthFailures;
            }
            else if (batchAuthFailures == 0)
            {
                consecutiveAuthFailures = 0;
            }

            if (consecutiveAuthFailures >= authFailureThreshold)
            {
                yield return new ProcessingCompleteEvent(new ProcessingProgressDto
                {
                    Source = source, Status = "auth_failed",
                    TotalRecords = total, ProcessedRecords = processed,
                    SuccessCount = success, FailedCount = failed, SkippedCount = skipped
                });
                yield break;
            }

            foreach (var result in fetchResults)
            {
                var (dbId, upstreamId, name, noteId, filename, isBench) = result.Item;
                processed++;

                ProcessingRecordEvent recordEvent;

                if (result.IsAuthFailure)
                {
                    recordEvent = new ProcessingRecordEvent(new ProcessingRecordDto
                    {
                        Id = result.RecordId, UpstreamId = upstreamId, Name = name,
                        Status = "failed", Error = "Unauthorized – token may be expired"
                    });
                }
                else if (result.Exception != null)
                {
                    var errorMessage = GetInnermostMessage(result.Exception);
                    Console.Error.WriteLine($"[ExtractAsync] {source}/{dbId} ({name}) failed: {result.Exception}");
                    _dbContext.ChangeTracker.Clear();
                    try { await MarkEntityFailed(source, dbId, errorMessage, ct); }
                    catch (Exception markEx)
                    {
                        Console.Error.WriteLine($"Failed to mark {source}/{dbId} as failed: {markEx.Message}");
                    }
                    recordEvent = new ProcessingRecordEvent(new ProcessingRecordDto
                    {
                        Id = result.RecordId, UpstreamId = upstreamId, Name = name,
                        Status = "failed", Error = errorMessage
                    });
                }
                else if (result.Error == "No resume note ID")
                {
                    await MarkEntityFailed(source, dbId, "No resume note ID", ct);
                    recordEvent = new ProcessingRecordEvent(new ProcessingRecordDto
                    {
                        Id = result.RecordId, UpstreamId = upstreamId, Name = name,
                        Status = "failed", Error = "No resume note ID"
                    });
                }
                else if (string.IsNullOrWhiteSpace(result.Text))
                {
                    await MarkEntityFailed(source, dbId, "Empty text after extraction", ct);
                    recordEvent = new ProcessingRecordEvent(new ProcessingRecordDto
                    {
                        Id = result.RecordId, UpstreamId = upstreamId, Name = name,
                        Status = "failed", Error = "Empty text after extraction",
                        ResumeSizeKb = result.FileBytes?.Length / 1024 ?? 0
                    });
                }
                else
                {
                    var sanitizedText = SanitizeUnicode(result.Text);

                    try
                    {
                        var existing = await _dbContext.ResumeEmbeddings
                            .FirstOrDefaultAsync(e => e.SourceType == source && e.SourceId == dbId, ct);

                        if (existing != null)
                        {
                            existing.ResumeText = sanitizedText;
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
                                ResumeText = sanitizedText,
                                IsBench = isBench,
                                CreatedAt = DateTime.UtcNow,
                                UpdatedAt = DateTime.UtcNow
                            });
                        }

                        await UpdateEntityStatus(source, dbId, "extracted", false, ct);

                        recordEvent = new ProcessingRecordEvent(new ProcessingRecordDto
                        {
                            Id = result.RecordId, UpstreamId = upstreamId, Name = name,
                            Status = "completed", ResumeSizeKb = result.FileBytes!.Length / 1024,
                            ExtractedChunks = (int)Math.Ceiling(sanitizedText.Length / 512.0)
                        });
                    }
                    catch (Exception saveEx)
                    {
                        var saveError = GetInnermostMessage(saveEx);
                        Console.Error.WriteLine($"[ExtractAsync] {source}/{dbId} ({name}) save failed: {saveError}");
                        _dbContext.ChangeTracker.Clear();
                        try { await MarkEntityFailed(source, dbId, saveError, ct); }
                        catch { /* best effort */ }
                        recordEvent = new ProcessingRecordEvent(new ProcessingRecordDto
                        {
                            Id = result.RecordId, UpstreamId = upstreamId, Name = name,
                            Status = "failed", Error = saveError
                        });
                    }
                }

                if (recordEvent.Record.Status == "completed")
                    success++;
                else if (recordEvent.Record.Error is "No resume note ID" or "Empty text after extraction")
                    skipped++;
                else
                    failed++;

                yield return recordEvent;
                yield return MakeProgress(source, total, processed, success, failed, skipped);
            }
        }

        yield return new ProcessingCompleteEvent(new ProcessingProgressDto
        {
            Source = source, Status = "completed",
            TotalRecords = total, ProcessedRecords = processed,
            SuccessCount = success, FailedCount = failed, SkippedCount = skipped
        });
    }

    public async IAsyncEnumerable<ProcessingEvent> VectorizeAsync(
        string source, string model, int? year = null,
        [EnumeratorCancellation] CancellationToken ct = default)
    {
        var eligibleIds = source == "employees"
            ? await GetEligibleEmployeesForVectorization(ct)
            : await GetEligibleCandidatesForVectorization(year, ct);

        int total = eligibleIds.Count;
        int processed = 0, success = 0, failed = 0, skipped = 0;

        yield return MakeProgress(source, total, processed, success, failed, skipped);

        var keys = _voyageSettings.ApiKeys.Count > 0
            ? _voyageSettings.ApiKeys
            : [_voyageSettings.ApiKey];
        int batchSize = keys.Count;

        for (int batchStart = 0; batchStart < eligibleIds.Count; batchStart += batchSize)
        {
            ct.ThrowIfCancellationRequested();

            var currentBatch = eligibleIds
                .Skip(batchStart)
                .Take(batchSize)
                .ToList();

            var batchData = new List<(
                (int DbId, int UpstreamId, string Name) Item,
                string RecordId, string ApiKey, string? TextToVectorize, string? Error)>();

            foreach (var (item, idx) in currentBatch.Select((item, idx) => (item, idx)))
            {
                var (dbId, upstreamId, name) = item;
                var recordId = $"{source}-{upstreamId}";
                var apiKey = keys[idx % keys.Count];

                var embedding = await _dbContext.ResumeEmbeddings
                    .AsNoTracking()
                    .FirstOrDefaultAsync(e => e.SourceType == source && e.SourceId == dbId, ct);

                if (embedding == null || string.IsNullOrWhiteSpace(embedding.ResumeText))
                {
                    batchData.Add((item, recordId, apiKey, null, "No extracted resume text found"));
                    continue;
                }

                var textToVectorize = source == "employees"
                    ? await BuildEnrichedTextForEmployee(dbId, embedding.ResumeText, ct)
                    : embedding.ResumeText;

                batchData.Add((item, recordId, apiKey, textToVectorize, null));
            }

            var vectorizeTasks = batchData.Select(async (entry, idx) =>
            {
                if (idx > 0) await Task.Delay(300 * idx, ct);

                if (entry.TextToVectorize == null)
                {
                    return (Item: entry.Item, RecordId: entry.RecordId, Vector: (float[]?)null,
                        Error: entry.Error, Exception: (Exception?)null);
                }

                try
                {
                    var vector = await _voyageService.GenerateEmbeddingWithKeyAsync(
                        entry.TextToVectorize, model, entry.ApiKey, ct);

                    return (Item: entry.Item, RecordId: entry.RecordId, Vector: (float[]?)vector,
                        Error: (string?)null, Exception: (Exception?)null);
                }
                catch (Exception ex)
                {
                    return (Item: entry.Item, RecordId: entry.RecordId, Vector: (float[]?)null,
                        Error: (string?)null, Exception: (Exception?)ex);
                }
            }).ToList();

            var results = await Task.WhenAll(vectorizeTasks);

            foreach (var result in results)
            {
                var (dbId, upstreamId, name) = result.Item;
                processed++;

                ProcessingRecordEvent recordEvent;

                if (result.Exception != null)
                {
                    var errorMessage = GetInnermostMessage(result.Exception);
                    Console.Error.WriteLine($"[VectorizeAsync] {source}/{dbId} ({name}) failed: {result.Exception}");
                    _dbContext.ChangeTracker.Clear();
                    try { await MarkEntityFailed(source, dbId, errorMessage, ct); }
                    catch (Exception markEx)
                    {
                        Console.Error.WriteLine($"Failed to mark {source}/{dbId} as failed: {markEx.Message}");
                    }
                    recordEvent = new ProcessingRecordEvent(new ProcessingRecordDto
                    {
                        Id = result.RecordId, UpstreamId = upstreamId, Name = name,
                        Status = "failed", Error = errorMessage
                    });
                }
                else if (result.Error == "No extracted resume text found")
                {
                    recordEvent = new ProcessingRecordEvent(new ProcessingRecordDto
                    {
                        Id = result.RecordId, UpstreamId = upstreamId, Name = name,
                        Status = "failed", Error = result.Error
                    });
                }
                else
                {
                    try
                    {
                        var embeddingEntity = await _dbContext.ResumeEmbeddings
                            .FirstOrDefaultAsync(e => e.SourceType == source && e.SourceId == dbId, ct);

                        embeddingEntity!.Embedding = new Vector(result.Vector!);
                        embeddingEntity.UpdatedAt = DateTime.UtcNow;

                        await UpdateEntityStatus(source, dbId, "vectorized", false, ct);

                        recordEvent = new ProcessingRecordEvent(new ProcessingRecordDto
                        {
                            Id = result.RecordId, UpstreamId = upstreamId, Name = name,
                            Status = "completed", VectorDimensions = 1024
                        });
                    }
                    catch (Exception saveEx)
                    {
                        var saveError = GetInnermostMessage(saveEx);
                        Console.Error.WriteLine($"[VectorizeAsync] {source}/{dbId} ({name}) save failed: {saveError}");
                        _dbContext.ChangeTracker.Clear();
                        try { await MarkEntityFailed(source, dbId, saveError, ct); }
                        catch { }
                        recordEvent = new ProcessingRecordEvent(new ProcessingRecordDto
                        {
                            Id = result.RecordId, UpstreamId = upstreamId, Name = name,
                            Status = "failed", Error = saveError
                        });
                    }
                }

                if (recordEvent.Record.Status == "completed")
                    success++;
                else if (recordEvent.Record.Error == "No extracted resume text found")
                    skipped++;
                else
                    failed++;

                yield return recordEvent;
                yield return MakeProgress(source, total, processed, success, failed, skipped);
            }

            if (batchStart + batchSize < eligibleIds.Count)
                await Task.Delay(TimeSpan.FromSeconds(21), ct);
        }

        yield return new ProcessingCompleteEvent(new ProcessingProgressDto
        {
            Source = source, Status = "completed",
            TotalRecords = total, ProcessedRecords = processed,
            SuccessCount = success, FailedCount = failed, SkippedCount = skipped
        });
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

            text = SanitizeUnicode(text);
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
            var errorMessage = GetInnermostMessage(ex);
            Console.Error.WriteLine($"[ProcessSingleRecord] {source}/{dbId} ({name}) failed: {ex}");
            _dbContext.ChangeTracker.Clear();
            events.Add(new ProcessingRecordEvent(new ProcessingRecordDto
            {
                Id = recordId, UpstreamId = upstreamId, Name = name,
                Status = "failed", Error = errorMessage
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
            await MarkEntityFailed(source, dbId, recordEvent?.Record.Error, ct);

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
                await MarkEntityFailed(source, dbId, "No extracted resume text found", ct);
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
                await MarkEntityFailed(source, dbId, ex.Message, ct);
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

    private async Task MarkEntityFailed(string source, int dbId, string? reason, CancellationToken ct)
    {
        if (source == "employees")
        {
            var emp = await _dbContext.SyncedEmployees.FirstOrDefaultAsync(e => e.Id == dbId, ct);
            if (emp != null)
            {
                emp.Failed = true;
                emp.StatusReason = reason;
                await _dbContext.SaveChangesAsync(ct);
            }
        }
        else
        {
            var cand = await _dbContext.SyncedCandidates.FirstOrDefaultAsync(c => c.Id == dbId, ct);
            if (cand != null)
            {
                cand.Failed = true;
                cand.StatusReason = reason;
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

    private async Task<List<(int DbId, int UpstreamId, string Name, int? NoteId, string? Filename, bool IsBench)>> GetEligibleCandidatesForExtraction(int? year, CancellationToken ct)
    {
        var query = _dbContext.SyncedCandidates
            .Where(c => c.Status == "synced" && c.HasResume && !c.Failed);

        if (year.HasValue)
        {
            if (year.Value <= 2013)
                query = query.Where(c => c.LastStatusUpdate == null || c.LastStatusUpdate.Value.Year <= 2013);
            else
                query = query.Where(c => c.LastStatusUpdate != null && c.LastStatusUpdate.Value.Year == year.Value);
        }

        return await query
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

    private async Task<List<(int DbId, int UpstreamId, string Name)>> GetEligibleCandidatesForVectorization(int? year, CancellationToken ct)
    {
        var query = _dbContext.SyncedCandidates
            .Where(c => c.Status == "extracted" && !c.Failed);

        if (year.HasValue)
        {
            if (year.Value <= 2013)
                query = query.Where(c => c.LastStatusUpdate == null || c.LastStatusUpdate.Value.Year <= 2013);
            else
                query = query.Where(c => c.LastStatusUpdate != null && c.LastStatusUpdate.Value.Year == year.Value);
        }

        return await query
            .Select(c => new { c.Id, c.UpstreamId, c.FullName })
            .AsAsyncEnumerable()
            .Select(c => (c.Id, c.UpstreamId, c.FullName))
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

    private static string GetInnermostMessage(Exception ex)
    {
        var inner = ex;
        while (inner is System.Reflection.TargetInvocationException && inner.InnerException != null)
            inner = inner.InnerException;
        return inner.Message;
    }

    private static string SanitizeUnicode(string input)
    {
        var sb = new System.Text.StringBuilder(input.Length);
        for (int i = 0; i < input.Length; i++)
        {
            char c = input[i];
            if (char.IsHighSurrogate(c))
            {
                if (i + 1 < input.Length && char.IsLowSurrogate(input[i + 1]))
                {
                    sb.Append(c);
                    sb.Append(input[i + 1]);
                    i++;
                }
            }
            else if (char.IsLowSurrogate(c))
            {
                // lone low surrogate — skip
            }
            else
            {
                sb.Append(c);
            }
        }
        return sb.ToString();
    }
}
