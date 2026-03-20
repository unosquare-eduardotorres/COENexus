using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using OperationNexus.Api.Data;
using OperationNexus.Api.Models;
using OperationNexus.Api.Services;

namespace OperationNexus.Api.Controllers;

[ApiController]
[Route("api/match")]
public class MatchController : ControllerBase
{
    private readonly IMatchEngineService _matchEngineService;
    private readonly MatchSearchCoordinator _coordinator;
    private readonly NexusDbContext _dbContext;
    private readonly BenchBurnService _benchBurnService;
    private static CancellationTokenSource? _searchCts;

    public MatchController(
        IMatchEngineService matchEngineService,
        MatchSearchCoordinator coordinator,
        NexusDbContext dbContext,
        BenchBurnService benchBurnService)
    {
        _matchEngineService = matchEngineService;
        _coordinator = coordinator;
        _dbContext = dbContext;
        _benchBurnService = benchBurnService;
    }

    [HttpGet("pool-counts")]
    public async Task<IActionResult> GetPoolCounts()
    {
        var counts = await _matchEngineService.GetPoolCountsAsync();
        return Ok(counts);
    }

    [HttpGet("filter-options")]
    public async Task<IActionResult> GetFilterOptions()
    {
        var options = await _matchEngineService.GetFilterOptionsAsync();
        return Ok(options);
    }

    [HttpPost("search")]
    public async Task StreamSearch([FromBody] MatchRequest request)
    {
        Response.ContentType = "text/event-stream";
        Response.Headers["Cache-Control"] = "no-cache";
        Response.Headers["Connection"] = "keep-alive";

        _searchCts = new CancellationTokenSource();
        using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(HttpContext.RequestAborted, _searchCts.Token);

        var jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

        try
        {
            await foreach (var matchEvent in _matchEngineService.SearchAsync(request, linkedCts.Token))
            {
                var (eventName, data) = matchEvent switch
                {
                    MatchProgressEvent e => ("progress", JsonSerializer.Serialize(e.Progress, jsonOptions)),
                    MatchPipelineStagesEvent e => ("pipelineStages", JsonSerializer.Serialize(e.Stages, jsonOptions)),
                    MatchResultEvent e => ("result", JsonSerializer.Serialize(e.Result, jsonOptions)),
                    MatchHaikuConfirmEvent e => ("haikuConfirm", JsonSerializer.Serialize(e.Payload, jsonOptions)),
                    _ => throw new InvalidOperationException()
                };

                await Response.WriteAsync($"event: {eventName}\ndata: {data}\n\n");
                await Response.Body.FlushAsync();
            }
        }
        catch (OperationCanceledException) { }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[MatchSearch] Stream died: {ex}");
            var errorData = JsonSerializer.Serialize(new { error = ex.Message }, jsonOptions);
            await Response.WriteAsync($"event: error\ndata: {errorData}\n\n");
            await Response.Body.FlushAsync();
        }
    }

    [HttpPost("cancel")]
    public IActionResult CancelSearch()
    {
        _searchCts?.Cancel();
        return Ok();
    }

    [HttpPost("confirm")]
    public IActionResult ConfirmHaikuDecision([FromBody] HaikuConfirmRequest request)
    {
        _coordinator.TryResolveAll(request.Action);
        return Ok();
    }

    [HttpPost("sessions")]
    public async Task StreamSessionSearch([FromBody] CreateSessionRequest request)
    {
        Response.ContentType = "text/event-stream";
        Response.Headers["Cache-Control"] = "no-cache";
        Response.Headers["Connection"] = "keep-alive";

        _searchCts = new CancellationTokenSource();
        using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(HttpContext.RequestAborted, _searchCts.Token);

        var jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

        int sessionId;
        try
        {
            sessionId = await _matchEngineService.CreateSessionAsync(request, linkedCts.Token);
            await Response.WriteAsync($"event: session\ndata: {JsonSerializer.Serialize(new { sessionId }, jsonOptions)}\n\n");
            await Response.Body.FlushAsync();
        }
        catch (Exception ex)
        {
            var errorData = JsonSerializer.Serialize(new { error = ex.Message }, jsonOptions);
            await Response.WriteAsync($"event: error\ndata: {errorData}\n\n");
            await Response.Body.FlushAsync();
            return;
        }

        MatchSearchResult? searchResult = null;
        PipelineStagesDto? stages = null;

        try
        {
            await foreach (var matchEvent in _matchEngineService.SearchAsync(request, linkedCts.Token))
            {
                var (eventName, data) = matchEvent switch
                {
                    MatchProgressEvent e => ("progress", JsonSerializer.Serialize(e.Progress, jsonOptions)),
                    MatchPipelineStagesEvent e => ("pipelineStages", JsonSerializer.Serialize(e.Stages, jsonOptions)),
                    MatchResultEvent e => ("result", JsonSerializer.Serialize(e.Result, jsonOptions)),
                    MatchHaikuConfirmEvent e => ("haikuConfirm", JsonSerializer.Serialize(e.Payload, jsonOptions)),
                    _ => throw new InvalidOperationException()
                };

                if (matchEvent is MatchResultEvent re) searchResult = re.Result;
                if (matchEvent is MatchPipelineStagesEvent pe) stages = pe.Stages;

                await Response.WriteAsync($"event: {eventName}\ndata: {data}\n\n");
                await Response.Body.FlushAsync();
            }

            if (searchResult != null && stages != null)
                await _matchEngineService.SaveSessionResultAsync(sessionId, searchResult, stages, CancellationToken.None);
        }
        catch (OperationCanceledException)
        {
            await _matchEngineService.FailSessionAsync(sessionId, CancellationToken.None);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[MatchSession] Stream died: {ex}");
            await _matchEngineService.FailSessionAsync(sessionId, CancellationToken.None);
            var errorData = JsonSerializer.Serialize(new { error = ex.Message }, jsonOptions);
            await Response.WriteAsync($"event: error\ndata: {errorData}\n\n");
            await Response.Body.FlushAsync();
        }
    }

    [HttpGet("sessions")]
    public async Task<IActionResult> ListSessions()
    {
        var sessions = await _matchEngineService.ListSessionsAsync();
        return Ok(sessions);
    }

    [HttpGet("sessions/{id:int}")]
    public async Task<IActionResult> GetSession(int id)
    {
        var session = await _matchEngineService.GetSessionAsync(id);
        if (session == null) return NotFound();
        return Ok(session);
    }

    [HttpGet("proxy-status")]
    public async Task<IActionResult> GetProxyStatus()
    {
        try
        {
            using var httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(5) };
            var response = await httpClient.GetAsync("http://localhost:3456/v1/models");
            return Ok(new { connected = response.IsSuccessStatusCode });
        }
        catch
        {
            return Ok(new { connected = false });
        }
    }

    [HttpGet("bench-employees")]
    public async Task<IActionResult> GetBenchEmployees()
    {
        var employees = await _dbContext.SyncedEmployees
            .Where(e => e.IsBench)
            .Select(e => new
            {
                e.UpstreamId,
                Name = e.FullName,
                e.Email,
                e.Seniority,
                e.MainSkill,
                e.Country,
                e.GrossMonthlySalary,
                e.SalaryCurrency,
                e.LastAccount,
                IsVectorized = _dbContext.ResumeEmbeddings
                    .Any(re => re.SourceType == "employees" && re.UpstreamId == e.UpstreamId && re.Embedding != null)
            })
            .OrderBy(e => e.Name)
            .ToListAsync();
        return Ok(employees);
    }

    [HttpGet("all-employees")]
    public async Task<IActionResult> GetAllEmployees()
    {
        var employees = await _dbContext.SyncedEmployees
            .Select(e => new
            {
                e.UpstreamId,
                Name = e.FullName,
                e.Email,
                e.Seniority,
                e.MainSkill,
                e.Country,
                e.GrossMonthlySalary,
                e.SalaryCurrency,
                e.LastAccount,
                e.IsBench,
                IsVectorized = _dbContext.ResumeEmbeddings
                    .Any(re => re.SourceType == "employees" && re.UpstreamId == e.UpstreamId && re.Embedding != null)
            })
            .OrderBy(e => e.Name)
            .ToListAsync();
        return Ok(employees);
    }

    [HttpGet("open-positions")]
    public async Task<IActionResult> GetOpenPositions()
    {
        var positions = await _dbContext.SyncedOpenPositions
            .Select(op => new
            {
                op.UpstreamId,
                op.Id,
                op.Account,
                op.Coe,
                op.Practice,
                op.Stakeholder,
                op.MainSkill,
                op.JobTitle,
                op.JobDescription,
                IsVectorized = _dbContext.ResumeEmbeddings
                    .Any(re => re.SourceType == "open-positions" && re.UpstreamId == op.UpstreamId && re.Embedding != null)
            })
            .OrderBy(op => op.Account)
            .ThenBy(op => op.MainSkill)
            .ToListAsync();
        return Ok(positions);
    }

    [HttpGet("bench-burn/sessions/{id:int}")]
    public async Task<IActionResult> GetBenchBurnSession(int id)
    {
        var result = await _benchBurnService.GetSessionAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost("bench-burn")]
    public async Task StreamBenchBurn([FromBody] BenchBurnRequest request)
    {
        Response.ContentType = "text/event-stream";
        Response.Headers["Cache-Control"] = "no-cache";
        Response.Headers["Connection"] = "keep-alive";

        var jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

        try
        {
            await foreach (var evt in _benchBurnService.ExecuteAsync(request, HttpContext.RequestAborted))
            {
                var (eventName, data) = evt switch
                {
                    BenchBurnProgressEvent e => ("progress", JsonSerializer.Serialize(e.Progress, jsonOptions)),
                    BenchBurnResultEvent e => ("result", JsonSerializer.Serialize(e.Result, jsonOptions)),
                    _ => throw new InvalidOperationException()
                };

                await Response.WriteAsync($"event: {eventName}\ndata: {data}\n\n");
                await Response.Body.FlushAsync();
            }
        }
        catch (OperationCanceledException) { }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[BenchBurn] Stream died: {ex}");
            var errorData = JsonSerializer.Serialize(new { error = ex.Message }, jsonOptions);
            await Response.WriteAsync($"event: error\ndata: {errorData}\n\n");
            await Response.Body.FlushAsync();
        }
    }

    [HttpPost("bench-burn/retry")]
    public async Task StreamBenchBurnRetry([FromBody] BenchBurnRetryRequest request)
    {
        Response.ContentType = "text/event-stream";
        Response.Headers["Cache-Control"] = "no-cache";
        Response.Headers["Connection"] = "keep-alive";

        var jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

        try
        {
            await foreach (var evt in _benchBurnService.RetryPairsAsync(request, HttpContext.RequestAborted))
            {
                var (eventName, data) = evt switch
                {
                    BenchBurnProgressEvent e => ("progress", JsonSerializer.Serialize(e.Progress, jsonOptions)),
                    BenchBurnResultEvent e => ("result", JsonSerializer.Serialize(e.Result, jsonOptions)),
                    _ => throw new InvalidOperationException()
                };

                await Response.WriteAsync($"event: {eventName}\ndata: {data}\n\n");
                await Response.Body.FlushAsync();
            }
        }
        catch (OperationCanceledException) { }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[BenchBurn/Retry] Stream died: {ex}");
            var errorData = JsonSerializer.Serialize(new { error = ex.Message }, jsonOptions);
            await Response.WriteAsync($"event: error\ndata: {errorData}\n\n");
            await Response.Body.FlushAsync();
        }
    }

    [HttpPost("external-candidate")]
    public async Task StreamExternalCandidateMatch([FromBody] ExternalCandidateMatchRequest request)
    {
        Response.ContentType = "text/event-stream";
        Response.Headers["Cache-Control"] = "no-cache";
        Response.Headers["Connection"] = "keep-alive";
        var jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
        try
        {
            await foreach (var evt in _benchBurnService.ExecuteExternalCandidateAsync(request, HttpContext.RequestAborted))
            {
                var (eventName, data) = evt switch
                {
                    BenchBurnProgressEvent e => ("progress", JsonSerializer.Serialize(e.Progress, jsonOptions)),
                    BenchBurnResultEvent e => ("result", JsonSerializer.Serialize(e.Result, jsonOptions)),
                    _ => throw new InvalidOperationException()
                };
                await Response.WriteAsync($"event: {eventName}\ndata: {data}\n\n");
                await Response.Body.FlushAsync();
            }
        }
        catch (OperationCanceledException) { }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[ExternalCandidate] Stream died: {ex}");
            var errorData = JsonSerializer.Serialize(new { error = ex.Message }, jsonOptions);
            await Response.WriteAsync($"event: error\ndata: {errorData}\n\n");
            await Response.Body.FlushAsync();
        }
    }
}
