using Microsoft.AspNetCore.Mvc;
using OperationNexus.Api.Models;
using OperationNexus.Api.Services;

namespace OperationNexus.Api.Controllers;

[ApiController]
[Route("api/database")]
public class DatabaseController : ControllerBase
{
    private readonly IDatabaseSharingService _databaseSharingService;

    public DatabaseController(IDatabaseSharingService databaseSharingService)
    {
        _databaseSharingService = databaseSharingService;
    }

    [HttpGet("config")]
    public IActionResult GetConfig()
    {
        try
        {
            var config = _databaseSharingService.GetConfig();
            return Ok(config);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("config")]
    public IActionResult SaveConfig([FromBody] SaveConfigRequest request)
    {
        try
        {
            _databaseSharingService.SaveConfig(request);
            return Ok(new { success = true });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("export")]
    public async Task<IActionResult> ExportSnapshot()
    {
        try
        {
            var result = await _databaseSharingService.ExportSnapshot();
            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("import")]
    public async Task<IActionResult> ImportSnapshot([FromBody] ImportRequest request)
    {
        try
        {
            var result = await _databaseSharingService.ImportSnapshot(request.Filename);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("snapshots")]
    public IActionResult ListSnapshots()
    {
        try
        {
            var snapshots = _databaseSharingService.ListSnapshots();
            return Ok(new SnapshotsResponse { Snapshots = snapshots });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("status")]
    public IActionResult GetDatabaseStatus()
    {
        try
        {
            var status = _databaseSharingService.GetDatabaseStatus();
            return Ok(status);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }
}
