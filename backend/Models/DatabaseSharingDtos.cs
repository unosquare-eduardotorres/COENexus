namespace OperationNexus.Api.Models;

public record DatabaseSharingConfig
{
    public string SharedPath { get; init; } = string.Empty;
    public bool IsConfigured { get; init; }
    public string ExporterName { get; init; } = string.Empty;
}

public record SaveConfigRequest
{
    public string SharedPath { get; init; } = string.Empty;
    public string ExporterName { get; init; } = string.Empty;
}

public record ExportResult
{
    public string Filename { get; init; } = string.Empty;
    public long SizeBytes { get; init; }
    public Dictionary<string, int> RecordCounts { get; init; } = new();
    public DateTime ExportedAt { get; init; }
}

public record ImportRequest
{
    public string Filename { get; init; } = string.Empty;
}

public record ImportResult
{
    public bool Success { get; init; }
    public List<string> TablesRestored { get; init; } = [];
    public Dictionary<string, int> RecordCounts { get; init; } = new();
}

public record SnapshotInfo
{
    public string Filename { get; init; } = string.Empty;
    public DateTime ExportedAt { get; init; }
    public string ExportedBy { get; init; } = string.Empty;
    public long SizeBytes { get; init; }
    public Dictionary<string, int> RecordCounts { get; init; } = new();
    public bool IsNew { get; init; }
}

public record SnapshotsResponse
{
    public List<SnapshotInfo> Snapshots { get; init; } = [];
}

public record DatabaseStatus
{
    public Dictionary<string, int> RecordCounts { get; init; } = new();
    public DateTime? LastImportedAt { get; init; }
    public string? LastImportedFile { get; init; }
}

public record SnapshotMeta
{
    public DateTime ExportedAt { get; init; }
    public string ExportedBy { get; init; } = string.Empty;
    public List<string> Tables { get; init; } = [];
    public Dictionary<string, int> RecordCounts { get; init; } = new();
    public long SizeBytes { get; init; }
    public string Version { get; init; } = "1.0";
}
