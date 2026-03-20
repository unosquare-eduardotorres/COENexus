using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OperationNexus.Api.Data;
using OperationNexus.Api.Models;
using OperationNexus.Api.Models.Entities;

namespace OperationNexus.Api.Controllers;

[ApiController]
[Route("api/sessions")]
public class SessionsController : ControllerBase
{
    private readonly NexusDbContext _dbContext;

    private static readonly HashSet<string> ValidContextTypes = ["candidate", "employee", "upload"];
    private static readonly HashSet<string> ValidStatuses = ["draft", "processing", "completed"];

    public SessionsController(NexusDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpPost]
    public async Task<IActionResult> CreateSession([FromBody] CreateOrUpdateSessionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { error = "Name is required" });

        if (!ValidContextTypes.Contains(request.ContextType))
            return BadRequest(new { error = $"ContextType must be one of: {string.Join(", ", ValidContextTypes)}" });

        if (request.ContextType is "candidate" or "employee" && request.ContextId == null)
            return BadRequest(new { error = "ContextId is required for candidate/employee sessions" });

        if (request.ContextType == "candidate" && request.ContextId.HasValue)
        {
            var exists = await _dbContext.SyncedCandidates.AnyAsync(c => c.Id == request.ContextId.Value);
            if (!exists)
                return BadRequest(new { error = $"Candidate {request.ContextId} not found" });
        }

        if (request.ContextType == "employee" && request.ContextId.HasValue)
        {
            var exists = await _dbContext.SyncedEmployees.AnyAsync(e => e.Id == request.ContextId.Value);
            if (!exists)
                return BadRequest(new { error = $"Employee {request.ContextId} not found" });
        }

        var now = DateTime.UtcNow;
        var session = new TransformSession
        {
            Name = request.Name,
            ContextType = request.ContextType,
            ContextId = request.ContextId,
            ContextName = request.ContextName ?? string.Empty,
            ProcessingMode = request.ProcessingMode ?? "single",
            RefinementMode = request.RefinementMode ?? string.Empty,
            JobDescription = request.JobDescription,
            JobDescriptionSource = request.JobDescriptionSource,
            SelectedPositionId = request.SelectedPositionId,
            ResumeContentJson = request.ResumeContentJson,
            WizardStateJson = request.WizardStateJson,
            Status = ValidStatuses.Contains(request.Status ?? "") ? request.Status! : "draft",
            CreatedAt = now,
            UpdatedAt = now,
        };

        _dbContext.TransformSessions.Add(session);
        await _dbContext.SaveChangesAsync();

        return CreatedAtAction(nameof(GetSession), new { id = session.Id }, MapToDetail(session));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateSession(int id, [FromBody] CreateOrUpdateSessionRequest request)
    {
        var session = await _dbContext.TransformSessions.FindAsync(id);
        if (session == null)
            return NotFound();

        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { error = "Name is required" });

        if (!ValidContextTypes.Contains(request.ContextType))
            return BadRequest(new { error = $"ContextType must be one of: {string.Join(", ", ValidContextTypes)}" });

        if (request.ContextType is "candidate" or "employee" && request.ContextId == null)
            return BadRequest(new { error = "ContextId is required for candidate/employee sessions" });

        if (request.ContextType == "candidate" && request.ContextId.HasValue)
        {
            var exists = await _dbContext.SyncedCandidates.AnyAsync(c => c.Id == request.ContextId.Value);
            if (!exists)
                return BadRequest(new { error = $"Candidate {request.ContextId} not found" });
        }

        if (request.ContextType == "employee" && request.ContextId.HasValue)
        {
            var exists = await _dbContext.SyncedEmployees.AnyAsync(e => e.Id == request.ContextId.Value);
            if (!exists)
                return BadRequest(new { error = $"Employee {request.ContextId} not found" });
        }

        session.Name = request.Name;
        session.ContextType = request.ContextType;
        session.ContextId = request.ContextId;
        session.ContextName = request.ContextName ?? session.ContextName;
        session.ProcessingMode = request.ProcessingMode ?? session.ProcessingMode;
        session.RefinementMode = request.RefinementMode ?? session.RefinementMode;
        session.JobDescription = request.JobDescription;
        session.JobDescriptionSource = request.JobDescriptionSource;
        session.SelectedPositionId = request.SelectedPositionId;
        session.ResumeContentJson = request.ResumeContentJson;
        session.WizardStateJson = request.WizardStateJson;
        session.Status = ValidStatuses.Contains(request.Status ?? "") ? request.Status! : session.Status;
        session.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();
        return Ok(MapToDetail(session));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetSession(int id)
    {
        var session = await _dbContext.TransformSessions.FindAsync(id);
        if (session == null)
            return NotFound();

        return Ok(MapToDetail(session));
    }

    [HttpGet]
    public async Task<IActionResult> ListSessions()
    {
        var sessions = await _dbContext.TransformSessions
            .OrderByDescending(s => s.UpdatedAt)
            .Select(s => new SessionSummaryDto(
                s.Id, s.Name, s.ContextType, s.ContextName,
                s.Status, s.CreatedAt, s.UpdatedAt))
            .ToListAsync();

        return Ok(sessions);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteSession(int id)
    {
        var session = await _dbContext.TransformSessions.FindAsync(id);
        if (session == null)
            return NotFound();

        _dbContext.TransformSessions.Remove(session);
        await _dbContext.SaveChangesAsync();
        return NoContent();
    }

    private static SessionDetailDto MapToDetail(TransformSession s) =>
        new(s.Id, s.Name, s.ContextType, s.ContextId, s.ContextName,
            s.ProcessingMode, s.RefinementMode, s.JobDescription,
            s.JobDescriptionSource, s.SelectedPositionId,
            s.ResumeContentJson, s.WizardStateJson,
            s.Status, s.CreatedAt, s.UpdatedAt);
}
