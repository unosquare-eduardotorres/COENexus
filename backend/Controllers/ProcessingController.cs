using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Text.Json;
using OperationNexus.Api.Configuration;
using OperationNexus.Api.Data;
using OperationNexus.Api.Models;
using OperationNexus.Api.Services;

namespace OperationNexus.Api.Controllers;

[ApiController]
[Route("api/processing")]
public class ProcessingController : ControllerBase
{
    private readonly IProcessingOrchestrator _processingOrchestrator;
    private readonly NexusDbContext _dbContext;
    private readonly VoyageSettings _voyageSettings;
    private static CancellationTokenSource? _cts;
    private static CancellationTokenSource? _extractCts;
    private static CancellationTokenSource? _vectorizeCts;

    public ProcessingController(
        IProcessingOrchestrator processingOrchestrator,
        NexusDbContext dbContext,
        IOptions<VoyageSettings> voyageSettings)
    {
        _processingOrchestrator = processingOrchestrator;
        _dbContext = dbContext;
        _voyageSettings = voyageSettings.Value;
    }

    [HttpGet("voyage-key")]
    public IActionResult GetVoyageKeyStatus()
    {
        var key = _voyageSettings.ApiKey;
        if (string.IsNullOrEmpty(key))
            return Ok(new { configured = false, source = "environment" });

        var masked = key.Length > 7
            ? key[..3] + "****" + key[^4..]
            : "****";

        return Ok(new { configured = true, maskedKey = masked, source = "environment" });
    }

    [HttpGet("status/{source}")]
    public async Task<IActionResult> GetStatus(string source)
    {
        int totalEligible;
        int alreadyProcessed;

        int syncedCount;
        int extractedCount;
        int vectorizedCount;
        int failedCount;

        if (source == "employees")
        {
            var withResume = await _dbContext.SyncedEmployees.CountAsync(e => e.HasResume);
            alreadyProcessed = await _dbContext.ResumeEmbeddings.CountAsync(e => e.SourceType == "employees");
            syncedCount = await _dbContext.SyncedEmployees.CountAsync(e => e.Status == "synced" && e.HasResume);
            extractedCount = await _dbContext.SyncedEmployees.CountAsync(e => e.Status == "extracted");
            vectorizedCount = await _dbContext.SyncedEmployees.CountAsync(e => e.Status == "vectorized");
            failedCount = await _dbContext.SyncedEmployees.CountAsync(e => e.Failed);
            totalEligible = withResume;
        }
        else if (source == "candidates")
        {
            var withResume = await _dbContext.SyncedCandidates.CountAsync(c => c.HasResume);
            alreadyProcessed = await _dbContext.ResumeEmbeddings.CountAsync(e => e.SourceType == "candidates");
            syncedCount = await _dbContext.SyncedCandidates.CountAsync(c => c.Status == "synced" && c.HasResume);
            extractedCount = await _dbContext.SyncedCandidates.CountAsync(c => c.Status == "extracted");
            vectorizedCount = await _dbContext.SyncedCandidates.CountAsync(c => c.Status == "vectorized");
            failedCount = await _dbContext.SyncedCandidates.CountAsync(c => c.Failed);
            totalEligible = withResume;
        }
        else
        {
            return BadRequest();
        }

        return Ok(new { totalEligible, alreadyProcessed, syncedCount, extractedCount, vectorizedCount, failedCount });
    }

    [HttpGet("stream/{source}")]
    public async Task StreamProcessing(string source, [FromQuery] string token, [FromQuery] string model = "voyage-4-large")
    {
        Response.ContentType = "text/event-stream";
        Response.Headers["Cache-Control"] = "no-cache";
        Response.Headers["Connection"] = "keep-alive";

        _cts = new CancellationTokenSource();
        using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(HttpContext.RequestAborted, _cts.Token);

        var jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

        try
        {
            await foreach (var processingEvent in _processingOrchestrator.ProcessAsync(source, token, model, linkedCts.Token))
            {
                var (eventName, data) = processingEvent switch
                {
                    ProcessingRecordEvent e => ("record", JsonSerializer.Serialize(e.Record, jsonOptions)),
                    ProcessingProgressEvent e => ("progress", JsonSerializer.Serialize(e.Progress, jsonOptions)),
                    ProcessingCompleteEvent e => ("complete", JsonSerializer.Serialize(e.Progress, jsonOptions)),
                    _ => throw new InvalidOperationException()
                };

                await Response.WriteAsync($"event: {eventName}\ndata: {data}\n\n");
                await Response.Body.FlushAsync();
            }
        }
        catch (OperationCanceledException) { }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[StreamProcessing] Stream died: {ex}");
        }
    }

    [HttpPost("vectorize-single")]
    public async Task<IActionResult> VectorizeSingle(
        [FromQuery] string source,
        [FromQuery] int upstreamId,
        [FromQuery] string model = "voyage-4-large")
    {
        if (source is not ("employees" or "candidates"))
            return BadRequest("Invalid source");

        try
        {
            var result = await _processingOrchestrator.VectorizeSingleAsync(source, model, upstreamId);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    [HttpPost("pause")]
    public IActionResult Pause()
    {
        _cts?.Cancel();
        return Ok();
    }

    [HttpGet("extract-stream/{source}")]
    public async Task StreamExtraction(string source, [FromQuery] string token)
    {
        Response.ContentType = "text/event-stream";
        Response.Headers["Cache-Control"] = "no-cache";
        Response.Headers["Connection"] = "keep-alive";

        _extractCts = new CancellationTokenSource();
        using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(HttpContext.RequestAborted, _extractCts.Token);

        var jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

        try
        {
            await foreach (var processingEvent in _processingOrchestrator.ExtractAsync(source, token, linkedCts.Token))
            {
                var (eventName, data) = processingEvent switch
                {
                    ProcessingRecordEvent e => ("record", JsonSerializer.Serialize(e.Record, jsonOptions)),
                    ProcessingProgressEvent e => ("progress", JsonSerializer.Serialize(e.Progress, jsonOptions)),
                    ProcessingCompleteEvent e => ("complete", JsonSerializer.Serialize(e.Progress, jsonOptions)),
                    _ => throw new InvalidOperationException()
                };

                await Response.WriteAsync($"event: {eventName}\ndata: {data}\n\n");
                await Response.Body.FlushAsync();
            }
        }
        catch (OperationCanceledException) { }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[StreamExtraction] Stream died: {ex}");
        }
    }

    [HttpPost("extract-pause")]
    public IActionResult PauseExtraction()
    {
        _extractCts?.Cancel();
        return Ok();
    }

    [HttpGet("vectorize-stream/{source}")]
    public async Task StreamVectorization(string source, [FromQuery] string model = "voyage-4-large")
    {
        Response.ContentType = "text/event-stream";
        Response.Headers["Cache-Control"] = "no-cache";
        Response.Headers["Connection"] = "keep-alive";

        _vectorizeCts = new CancellationTokenSource();
        using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(HttpContext.RequestAborted, _vectorizeCts.Token);

        var jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

        try
        {
            await foreach (var processingEvent in _processingOrchestrator.VectorizeAsync(source, model, linkedCts.Token))
            {
                var (eventName, data) = processingEvent switch
                {
                    ProcessingRecordEvent e => ("record", JsonSerializer.Serialize(e.Record, jsonOptions)),
                    ProcessingProgressEvent e => ("progress", JsonSerializer.Serialize(e.Progress, jsonOptions)),
                    ProcessingCompleteEvent e => ("complete", JsonSerializer.Serialize(e.Progress, jsonOptions)),
                    _ => throw new InvalidOperationException()
                };

                await Response.WriteAsync($"event: {eventName}\ndata: {data}\n\n");
                await Response.Body.FlushAsync();
            }
        }
        catch (OperationCanceledException) { }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[StreamVectorization] Stream died: {ex}");
        }
    }

    [HttpPost("vectorize-pause")]
    public IActionResult PauseVectorization()
    {
        _vectorizeCts?.Cancel();
        return Ok();
    }

    [HttpPost("reset-status/{source}/{upstreamId}")]
    public async Task<IActionResult> ResetStatus(string source, int upstreamId)
    {
        if (source == "employees")
        {
            var emp = await _dbContext.SyncedEmployees.FirstOrDefaultAsync(e => e.UpstreamId == upstreamId);
            if (emp == null) return NotFound();
            emp.Status = "synced";
            emp.Failed = false;
            await _dbContext.SaveChangesAsync();
            return Ok(new { emp.UpstreamId, emp.FullName, emp.Status });
        }
        else if (source == "candidates")
        {
            var cand = await _dbContext.SyncedCandidates.FirstOrDefaultAsync(c => c.UpstreamId == upstreamId);
            if (cand == null) return NotFound();
            cand.Status = "synced";
            cand.Failed = false;
            await _dbContext.SaveChangesAsync();
            return Ok(new { cand.UpstreamId, cand.FullName, cand.Status });
        }
        else
        {
            return BadRequest("Invalid source. Use 'employees' or 'candidates'.");
        }
    }
}
