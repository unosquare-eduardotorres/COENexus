using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using OperationNexus.Api.Models;
using OperationNexus.Api.Services;

namespace OperationNexus.Api.Controllers;

[ApiController]
[Route("api/match")]
public class MatchController : ControllerBase
{
    private readonly IMatchEngineService _matchEngineService;
    private readonly MatchSearchCoordinator _coordinator;
    private static CancellationTokenSource? _searchCts;

    public MatchController(IMatchEngineService matchEngineService, MatchSearchCoordinator coordinator)
    {
        _matchEngineService = matchEngineService;
        _coordinator = coordinator;
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
}
