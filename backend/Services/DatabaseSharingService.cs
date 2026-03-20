using System.Diagnostics;
using System.Text.Json;
using OperationNexus.Api.Data;
using OperationNexus.Api.Models;

namespace OperationNexus.Api.Services;

public interface IDatabaseSharingService
{
    DatabaseSharingConfig GetConfig();
    void SaveConfig(SaveConfigRequest request);
    Task<ExportResult> ExportSnapshot();
    Task<ImportResult> ImportSnapshot(string filename);
    List<SnapshotInfo> ListSnapshots();
    DatabaseStatus GetDatabaseStatus();
}

public class DatabaseSharingService : IDatabaseSharingService
{
    private readonly NexusDbContext _dbContext;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true
    };

    private static readonly string ConfigFilePath = Path.Combine(Directory.GetCurrentDirectory(), "db-sharing.json");

    public DatabaseSharingService(NexusDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public DatabaseSharingConfig GetConfig()
    {
        var state = ReadConfigState();
        return new DatabaseSharingConfig
        {
            SharedPath = state.SharedPath,
            ExporterName = state.ExporterName,
            IsConfigured = !string.IsNullOrWhiteSpace(state.SharedPath)
        };
    }

    public void SaveConfig(SaveConfigRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        var sharedPath = request.SharedPath.Trim();
        if (string.IsNullOrWhiteSpace(sharedPath))
            throw new InvalidOperationException("Shared path is required.");

        var fullSharedPath = Path.GetFullPath(sharedPath);
        Directory.CreateDirectory(fullSharedPath);

        var existing = ReadConfigState();
        var updated = existing with
        {
            SharedPath = fullSharedPath,
            ExporterName = request.ExporterName.Trim()
        };
        WriteConfigState(updated);
    }

    public async Task<ExportResult> ExportSnapshot()
    {
        var state = GetRequiredConfiguredState();
        Directory.CreateDirectory(state.SharedPath);

        var containerId = await GetContainerId();
        var exportedAt = DateTime.UtcNow;
        var filename = $"nexus-snapshot-{exportedAt:yyyyMMdd_HHmmss}.dump";
        var snapshotPath = Path.Combine(state.SharedPath, filename);

        var startInfo = new ProcessStartInfo("docker")
        {
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false
        };
        startInfo.ArgumentList.Add("exec");
        startInfo.ArgumentList.Add(containerId);
        startInfo.ArgumentList.Add("pg_dump");
        startInfo.ArgumentList.Add("-U");
        startInfo.ArgumentList.Add("nexus");
        startInfo.ArgumentList.Add("-d");
        startInfo.ArgumentList.Add("operation_nexus");
        startInfo.ArgumentList.Add("--format=custom");
        startInfo.ArgumentList.Add("--compress=6");
        startInfo.ArgumentList.Add("--no-owner");
        startInfo.ArgumentList.Add("--no-privileges");
        startInfo.ArgumentList.Add("--exclude-table=\"MatchSessions\"");

        using var process = Process.Start(startInfo) ?? throw new InvalidOperationException("Failed to start docker pg_dump process.");
        var stderrTask = process.StandardError.ReadToEndAsync();

        await using (var fileStream = File.Create(snapshotPath))
        {
            await process.StandardOutput.BaseStream.CopyToAsync(fileStream);
        }

        await process.WaitForExitAsync();
        var stderr = await stderrTask;
        if (process.ExitCode != 0)
            throw new InvalidOperationException($"Snapshot export failed: {stderr.Trim()}");

        var recordCounts = GetRecordCounts();
        var sizeBytes = new FileInfo(snapshotPath).Length;
        var meta = new SnapshotMeta
        {
            ExportedAt = exportedAt,
            ExportedBy = state.ExporterName,
            Tables = recordCounts.Keys.ToList(),
            RecordCounts = recordCounts,
            SizeBytes = sizeBytes,
            Version = "1.0"
        };

        var metaPath = $"{snapshotPath}.meta.json";
        var metaJson = JsonSerializer.Serialize(meta, JsonOptions);
        await File.WriteAllTextAsync(metaPath, metaJson);

        return new ExportResult
        {
            Filename = filename,
            SizeBytes = sizeBytes,
            RecordCounts = recordCounts,
            ExportedAt = exportedAt
        };
    }

    public async Task<ImportResult> ImportSnapshot(string filename)
    {
        if (string.IsNullOrWhiteSpace(filename))
            throw new InvalidOperationException("Filename is required.");

        var state = GetRequiredConfiguredState();
        var snapshotPath = Path.IsPathRooted(filename)
            ? filename
            : Path.Combine(state.SharedPath, filename);

        if (!File.Exists(snapshotPath))
            throw new FileNotFoundException("Snapshot file was not found.", snapshotPath);

        var containerId = await GetContainerId();
        var startInfo = new ProcessStartInfo("docker")
        {
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false
        };
        startInfo.ArgumentList.Add("exec");
        startInfo.ArgumentList.Add("-i");
        startInfo.ArgumentList.Add(containerId);
        startInfo.ArgumentList.Add("pg_restore");
        startInfo.ArgumentList.Add("-U");
        startInfo.ArgumentList.Add("nexus");
        startInfo.ArgumentList.Add("-d");
        startInfo.ArgumentList.Add("operation_nexus");
        startInfo.ArgumentList.Add("--clean");
        startInfo.ArgumentList.Add("--if-exists");
        startInfo.ArgumentList.Add("--no-owner");
        startInfo.ArgumentList.Add("--no-privileges");

        using var process = Process.Start(startInfo) ?? throw new InvalidOperationException("Failed to start docker pg_restore process.");
        var stdoutTask = process.StandardOutput.ReadToEndAsync();
        var stderrTask = process.StandardError.ReadToEndAsync();

        await using (var snapshotStream = File.OpenRead(snapshotPath))
        {
            await snapshotStream.CopyToAsync(process.StandardInput.BaseStream);
        }

        await process.StandardInput.FlushAsync();
        process.StandardInput.Close();

        await process.WaitForExitAsync();
        _ = await stdoutTask;
        var stderr = await stderrTask;
        if (process.ExitCode != 0)
            throw new InvalidOperationException($"Snapshot import failed: {stderr.Trim()}");

        var importedAt = DateTime.UtcNow;
        var updatedState = state with
        {
            LastImportedAt = importedAt,
            LastImportedFile = Path.GetFileName(snapshotPath)
        };
        WriteConfigState(updatedState);

        var recordCounts = GetRecordCounts();
        var tablesRestored = ReadSnapshotMeta(snapshotPath)?.Tables ?? recordCounts.Keys.ToList();

        return new ImportResult
        {
            Success = true,
            TablesRestored = tablesRestored.Count,
            RecordCounts = recordCounts
        };
    }

    public List<SnapshotInfo> ListSnapshots()
    {
        var state = ReadConfigState();
        if (string.IsNullOrWhiteSpace(state.SharedPath) || !Directory.Exists(state.SharedPath))
            return [];

        var snapshots = Directory
            .EnumerateFiles(state.SharedPath, "*.dump", SearchOption.TopDirectoryOnly)
            .Select(path => BuildSnapshotInfo(path, state.LastImportedAt, state.ExporterName))
            .OrderByDescending(snapshot => snapshot.ExportedAt)
            .ToList();

        return snapshots;
    }

    public DatabaseStatus GetDatabaseStatus()
    {
        var state = ReadConfigState();
        return new DatabaseStatus
        {
            RecordCounts = GetRecordCounts(),
            LastImportedAt = state.LastImportedAt,
            LastImportedFile = state.LastImportedFile
        };
    }

    private static SnapshotInfo BuildSnapshotInfo(string snapshotPath, DateTime? lastImportedAt, string defaultExporterName)
    {
        var fileInfo = new FileInfo(snapshotPath);
        var meta = ReadSnapshotMeta(snapshotPath);

        var exportedAt = meta?.ExportedAt ?? fileInfo.LastWriteTimeUtc;
        var exportedBy = string.IsNullOrWhiteSpace(meta?.ExportedBy) ? defaultExporterName : meta.ExportedBy;
        var sizeBytes = meta?.SizeBytes ?? fileInfo.Length;
        var recordCounts = meta?.RecordCounts ?? new Dictionary<string, int>();
        var isNew = !lastImportedAt.HasValue || exportedAt > lastImportedAt.Value;

        return new SnapshotInfo
        {
            Filename = fileInfo.Name,
            ExportedAt = exportedAt,
            ExportedBy = exportedBy,
            SizeBytes = sizeBytes,
            RecordCounts = recordCounts,
            IsNew = isNew
        };
    }

    private static SnapshotMeta? ReadSnapshotMeta(string snapshotPath)
    {
        var metaPath = $"{snapshotPath}.meta.json";
        if (!File.Exists(metaPath))
            return null;

        try
        {
            var json = File.ReadAllText(metaPath);
            return JsonSerializer.Deserialize<SnapshotMeta>(json, JsonOptions);
        }
        catch
        {
            return null;
        }
    }

    private async Task<string> GetContainerId()
    {
        var startInfo = new ProcessStartInfo("docker")
        {
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false
        };
        startInfo.ArgumentList.Add("ps");
        startInfo.ArgumentList.Add("-q");
        startInfo.ArgumentList.Add("--filter");
        startInfo.ArgumentList.Add("publish=5432");

        using var process = Process.Start(startInfo) ?? throw new InvalidOperationException("Failed to start docker process.");
        var stdoutTask = process.StandardOutput.ReadToEndAsync();
        var stderrTask = process.StandardError.ReadToEndAsync();

        await process.WaitForExitAsync();
        var stdout = await stdoutTask;
        var stderr = await stderrTask;
        if (process.ExitCode != 0)
            throw new InvalidOperationException($"Failed to locate PostgreSQL container: {stderr.Trim()}");

        var containerId = stdout
            .Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .FirstOrDefault();

        if (string.IsNullOrWhiteSpace(containerId))
            throw new InvalidOperationException("No running PostgreSQL container found with port 5432 published.");

        return containerId;
    }

    private DatabaseSharingConfigState GetRequiredConfiguredState()
    {
        var state = ReadConfigState();
        if (string.IsNullOrWhiteSpace(state.SharedPath))
            throw new InvalidOperationException("Database sharing configuration is missing.");

        return state with { SharedPath = Path.GetFullPath(state.SharedPath) };
    }

    private Dictionary<string, int> GetRecordCounts()
    {
        return new Dictionary<string, int>
        {
            ["SyncedEmployees"] = _dbContext.SyncedEmployees.Count(),
            ["SyncedCandidates"] = _dbContext.SyncedCandidates.Count(),
            ["ResumeEmbeddings"] = _dbContext.ResumeEmbeddings.Count(),
            ["SyncedOpenPositions"] = _dbContext.SyncedOpenPositions.Count(),
            ["OpenPositionCandidates"] = _dbContext.OpenPositionCandidates.Count()
        };
    }

    private static DatabaseSharingConfigState ReadConfigState()
    {
        if (!File.Exists(ConfigFilePath))
            return new DatabaseSharingConfigState();

        var json = File.ReadAllText(ConfigFilePath);
        if (string.IsNullOrWhiteSpace(json))
            return new DatabaseSharingConfigState();

        return JsonSerializer.Deserialize<DatabaseSharingConfigState>(json, JsonOptions) ?? new DatabaseSharingConfigState();
    }

    private static void WriteConfigState(DatabaseSharingConfigState state)
    {
        var json = JsonSerializer.Serialize(state, JsonOptions);
        File.WriteAllText(ConfigFilePath, json);
    }

    private sealed record DatabaseSharingConfigState
    {
        public string SharedPath { get; init; } = string.Empty;
        public string ExporterName { get; init; } = string.Empty;
        public DateTime? LastImportedAt { get; init; }
        public string? LastImportedFile { get; init; }
    }
}
