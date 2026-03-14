using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using OperationNexus.Api.Data;
using OperationNexus.Api.Models;
using OperationNexus.Api.Services;

namespace OperationNexus.Api.Controllers;

public record TokenRequest(string Token);

[ApiController]
[Route("api/sync")]
public class SyncController : ControllerBase
{
    private readonly ISyncOrchestrator _syncOrchestrator;
    private readonly NexusDbContext _dbContext;
    private readonly ICatalogService _catalogService;
    private readonly IUpstreamApiService _upstreamApi;

    private static CancellationTokenSource? _cts;

    public SyncController(
        ISyncOrchestrator syncOrchestrator,
        NexusDbContext dbContext,
        ICatalogService catalogService,
        IUpstreamApiService upstreamApi)
    {
        _syncOrchestrator = syncOrchestrator;
        _dbContext = dbContext;
        _catalogService = catalogService;
        _upstreamApi = upstreamApi;
    }

    [HttpPost("validate-token")]
    public async Task<IActionResult> ValidateToken([FromBody] TokenRequest request)
    {
        try
        {
            var trimmedToken = request.Token?.Trim();
            if (string.IsNullOrEmpty(trimmedToken))
                return BadRequest(new { error = "Token is empty" });

            await _upstreamApi.GetEmployeesPagedAsync(trimmedToken, 0, 1);
            return Ok(new { valid = true });
        }
        catch (HttpRequestException ex)
        {
            var statusCode = ex.StatusCode.HasValue ? (int)ex.StatusCode.Value : 0;
            return StatusCode(statusCode > 0 ? statusCode : 502, new
            {
                error = $"Upstream API returned {ex.StatusCode}: {ex.Message}"
            });
        }
        catch (Exception ex)
        {
            return StatusCode(502, new { error = $"Upstream call failed: {ex.Message}" });
        }
    }

    [HttpGet("status/{source}")]
    public async Task<IActionResult> GetStatus(string source, [FromQuery] int? year = null)
    {
        if (source == "employees")
        {
            var total = await _dbContext.SyncedEmployees.CountAsync();
            var synced = await _dbContext.SyncedEmployees.CountAsync(e => e.Status == "synced");
            var incomplete = await _dbContext.SyncedEmployees.CountAsync(e => e.Status == "incomplete");
            var notProcessed = await _dbContext.SyncedEmployees.CountAsync(e => e.Status == "not-processed");
            var extracted = await _dbContext.SyncedEmployees.CountAsync(e => e.Status == "extracted");
            var vectorized = await _dbContext.SyncedEmployees.CountAsync(e => e.Status == "vectorized");
            var failed = await _dbContext.SyncedEmployees.CountAsync(e => e.Failed);
            return Ok(new
            {
                totalRecords = total,
                syncedCount = synced,
                incompleteCount = incomplete,
                notProcessedCount = notProcessed,
                extractedCount = extracted,
                vectorizedCount = vectorized,
                failedCount = failed
            });
        }

        if (source == "candidates")
        {
            var query = _dbContext.SyncedCandidates.AsQueryable();
            if (year.HasValue)
                query = ApplyCandidateYearFilter(query, year.Value);

            var total = await query.CountAsync();
            var synced = await query.CountAsync(e => e.Status == "synced");
            var incomplete = await query.CountAsync(e => e.Status == "incomplete");
            var notProcessed = await query.CountAsync(e => e.Status == "not-processed");
            var extracted = await query.CountAsync(e => e.Status == "extracted");
            var vectorized = await query.CountAsync(e => e.Status == "vectorized");
            var failed = await query.CountAsync(e => e.Failed);
            return Ok(new
            {
                totalRecords = total,
                syncedCount = synced,
                incompleteCount = incomplete,
                notProcessedCount = notProcessed,
                extractedCount = extracted,
                vectorizedCount = vectorized,
                failedCount = failed
            });
        }

        return BadRequest();
    }

    private static IQueryable<Models.Entities.SyncedCandidate> ApplyCandidateYearFilter(
        IQueryable<Models.Entities.SyncedCandidate> query, int year)
    {
        if (year >= 2014)
        {
            var start = new DateTime(year, 1, 1, 0, 0, 0, DateTimeKind.Utc);
            var end = new DateTime(year + 1, 1, 1, 0, 0, 0, DateTimeKind.Utc);
            return query.Where(c => c.LastStatusUpdate >= start && c.LastStatusUpdate < end);
        }

        var cutoff = new DateTime(2014, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        return query.Where(c => c.LastStatusUpdate == null || c.LastStatusUpdate < cutoff);
    }

    [HttpGet("stream/{source}")]
    public async Task StreamSync(string source, [FromQuery] string token, [FromQuery] int? limit = null, [FromQuery] int? skip = null, [FromQuery] int? year = null)
    {
        Response.ContentType = "text/event-stream";
        Response.Headers["Cache-Control"] = "no-cache";
        Response.Headers["Connection"] = "keep-alive";

        _cts = new CancellationTokenSource();
        using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(HttpContext.RequestAborted, _cts.Token);

        var jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        try
        {
            await foreach (var syncEvent in _syncOrchestrator.SyncAsync(source, token, limit, skip, year, linkedCts.Token))
            {
                var (eventName, data) = syncEvent switch
                {
                    SyncRecordEvent e => ("record", JsonSerializer.Serialize(e.Record, jsonOptions)),
                    SyncProgressEvent e => ("progress", JsonSerializer.Serialize(e.Progress, jsonOptions)),
                    SyncCompleteEvent e => ("complete", JsonSerializer.Serialize(e.Progress, jsonOptions)),
                    _ => throw new InvalidOperationException()
                };

                await Response.WriteAsync($"event: {eventName}\ndata: {data}\n\n");
                await Response.Body.FlushAsync();
            }
        }
        catch (OperationCanceledException)
        {
            return;
        }
        catch (Exception ex)
        {
            var errorData = JsonSerializer.Serialize(new { error = ex.Message }, jsonOptions);
            await Response.WriteAsync($"event: error\ndata: {errorData}\n\n");
            await Response.Body.FlushAsync();
        }
    }

    [HttpPost("pause")]
    public IActionResult Pause()
    {
        _cts?.Cancel();
        return Ok();
    }

    [HttpPost("sync-one/{source}/{upstreamId}")]
    public async Task<IActionResult> SyncSingle(string source, int upstreamId, [FromQuery] string token)
    {
        var result = await _syncOrchestrator.SyncSingleAsync(source, token, upstreamId, HttpContext.RequestAborted);
        return Ok(result);
    }

    [HttpGet("retry-failed/{source}")]
    public async Task RetryFailed(string source, [FromQuery] string token, [FromQuery] int? year = null)
    {
        Response.ContentType = "text/event-stream";
        Response.Headers["Cache-Control"] = "no-cache";
        Response.Headers["Connection"] = "keep-alive";

        var jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        try
        {
            List<int> failedIds;
            if (source == "employees")
            {
                failedIds = await _dbContext.SyncedEmployees
                    .Where(e => e.Status == "incomplete" || e.Status == "not-processed")
                    .Select(e => e.UpstreamId)
                    .ToListAsync();
            }
            else if (source == "candidates")
            {
                var candidateQuery = _dbContext.SyncedCandidates
                    .Where(e => e.Status == "incomplete" || e.Status == "not-processed");
                if (year.HasValue)
                    candidateQuery = ApplyCandidateYearFilter(candidateQuery, year.Value)
                        .Where(e => e.Status == "incomplete" || e.Status == "not-processed");
                failedIds = await candidateQuery
                    .Select(e => e.UpstreamId)
                    .ToListAsync();
            }
            else
            {
                await Response.WriteAsync($"event: error\ndata: {{\"error\":\"Invalid source\"}}\n\n");
                return;
            }

            var total = failedIds.Count;
            var retried = 0;

            foreach (var upstreamId in failedIds)
            {
                if (HttpContext.RequestAborted.IsCancellationRequested) break;

                try
                {
                    var result = await _syncOrchestrator.SyncSingleAsync(source, token, upstreamId, HttpContext.RequestAborted);
                    retried++;

                    var recordData = JsonSerializer.Serialize(result, jsonOptions);
                    await Response.WriteAsync($"event: record\ndata: {recordData}\n\n");

                    var progress = new { total, retried };
                    var progressData = JsonSerializer.Serialize(progress, jsonOptions);
                    await Response.WriteAsync($"event: progress\ndata: {progressData}\n\n");
                    await Response.Body.FlushAsync();
                }
                catch (Exception ex)
                {
                    var errorRecord = new { upstreamId, error = ex.Message };
                    var errorData = JsonSerializer.Serialize(errorRecord, jsonOptions);
                    await Response.WriteAsync($"event: record-error\ndata: {errorData}\n\n");
                    await Response.Body.FlushAsync();
                    retried++;
                }
            }

            var completeData = JsonSerializer.Serialize(new { total, retried }, jsonOptions);
            await Response.WriteAsync($"event: complete\ndata: {completeData}\n\n");
            await Response.Body.FlushAsync();
        }
        catch (OperationCanceledException) { }
        catch (Exception ex)
        {
            var errorData = JsonSerializer.Serialize(new { error = ex.Message }, jsonOptions);
            await Response.WriteAsync($"event: error\ndata: {errorData}\n\n");
            await Response.Body.FlushAsync();
        }
    }

    [HttpGet("records/{source}")]
    public async Task<IActionResult> GetRecords(string source, [FromQuery] int? year = null)
    {
        if (source == "employees")
        {
            var employees = await _dbContext.SyncedEmployees
                .OrderBy(e => e.FullName)
                .ToListAsync();

            var records = employees.Select(e => new SyncRecordDto
            {
                Id = $"emp-{e.UpstreamId}",
                Source = "employees",
                Status = e.Status,
                Name = e.FullName,
                Email = e.Email,
                Seniority = e.Seniority,
                MainSkill = e.MainSkill,
                Country = e.Country,
                GrossMonthlySalary = e.GrossMonthlySalary,
                Currency = e.SalaryCurrency,
                ExpectedRate = e.Rate,
                LastAccount = e.LastAccount,
                LastAccountStartDate = e.LastAccountStartDate?.ToString("o"),
                HasResume = e.HasResume,
                ResumeNoteId = e.ResumeNoteId,
                ResumeFilename = e.ResumeFilename,
                IsBench = e.IsBench,
                Reason = e.StatusReason,
                ResumeChanged = false,
                UpstreamId = e.UpstreamId,
                Failed = e.Failed,
                SyncedAt = e.SyncedAt.ToString("o"),
                ResumeDateCreated = e.ResumeDateCreated?.ToString("o"),
                JobTitle = e.JobTitle,
            }).ToList();

            return Ok(records);
        }

        if (source == "candidates")
        {
            var query = _dbContext.SyncedCandidates.AsQueryable();
            if (year.HasValue)
                query = ApplyCandidateYearFilter(query, year.Value);

            var candidates = await query
                .OrderBy(e => e.FullName)
                .ToListAsync();

            var records = candidates.Select(e => new SyncRecordDto
            {
                Id = $"cand-{e.UpstreamId}",
                Source = "candidates",
                Status = e.Status,
                Name = e.FullName,
                Email = e.Email ?? string.Empty,
                Seniority = e.Seniority,
                MainSkill = e.MainSkill,
                Country = e.Country,
                GrossMonthlySalary = e.CurrentSalary,
                Currency = e.SalaryCurrency,
                CoeCertified = e.CoeCertified,
                CandidateStatus = e.CandidateStatus,
                LastStatusUpdate = e.LastStatusUpdate?.ToString("o"),
                SalaryExpectations = e.SalaryExpectations,
                SalaryExpectationsCurrency = e.SalaryExpectationsCurrency,
                HasResume = e.HasResume,
                ResumeNoteId = e.ResumeNoteId,
                ResumeFilename = e.ResumeFilename,
                Reason = e.StatusReason,
                ResumeChanged = false,
                UpstreamId = e.UpstreamId,
                Failed = e.Failed,
                SyncedAt = e.SyncedAt.ToString("o"),
                ResumeDateCreated = e.ResumeDateCreated?.ToString("o"),
            }).ToList();

            return Ok(records);
        }

        return BadRequest(new { error = "Invalid source. Use 'employees' or 'candidates'." });
    }

    [HttpDelete("clear/{source}")]
    public async Task<IActionResult> ClearSyncedData(string source, [FromQuery] int? year = null)
    {
        if (source == "employees")
        {
            var embeddings = await _dbContext.ResumeEmbeddings
                .Where(e => e.SourceType == "employees")
                .ToListAsync();
            _dbContext.ResumeEmbeddings.RemoveRange(embeddings);
            _dbContext.SyncedEmployees.RemoveRange(_dbContext.SyncedEmployees);
            await _dbContext.SaveChangesAsync();
            return Ok(new { cleared = "employees" });
        }

        if (source == "candidates")
        {
            if (year.HasValue)
            {
                var candidatesToDelete = await ApplyCandidateYearFilter(_dbContext.SyncedCandidates.AsQueryable(), year.Value)
                    .ToListAsync();
                var candidateIds = candidatesToDelete.Select(c => c.Id).ToList();
                var embeddings = await _dbContext.ResumeEmbeddings
                    .Where(e => e.SourceType == "candidates" && candidateIds.Contains(e.SourceId))
                    .ToListAsync();
                _dbContext.ResumeEmbeddings.RemoveRange(embeddings);
                _dbContext.SyncedCandidates.RemoveRange(candidatesToDelete);
            }
            else
            {
                var embeddings = await _dbContext.ResumeEmbeddings
                    .Where(e => e.SourceType == "candidates")
                    .ToListAsync();
                _dbContext.ResumeEmbeddings.RemoveRange(embeddings);
                _dbContext.SyncedCandidates.RemoveRange(_dbContext.SyncedCandidates);
            }
            await _dbContext.SaveChangesAsync();
            return Ok(new { cleared = "candidates" });
        }

        if (source == "all")
        {
            _dbContext.ResumeEmbeddings.RemoveRange(_dbContext.ResumeEmbeddings);
            _dbContext.SyncedEmployees.RemoveRange(_dbContext.SyncedEmployees);
            _dbContext.SyncedCandidates.RemoveRange(_dbContext.SyncedCandidates);
            await _dbContext.SaveChangesAsync();
            return Ok(new { cleared = "all" });
        }

        return BadRequest(new { error = "Invalid source. Use 'employees', 'candidates', or 'all'." });
    }

    [HttpGet("catalogs/skills")]
    public async Task<IActionResult> GetSkills([FromQuery] string token)
    {
        return Ok(await _catalogService.GetMainSkillsAsync(token));
    }
}
