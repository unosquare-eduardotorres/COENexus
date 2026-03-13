using System.Text.Json.Serialization;

namespace OperationNexus.Api.Models;

[JsonDerivedType(typeof(ProcessingRecordEvent), "record")]
[JsonDerivedType(typeof(ProcessingProgressEvent), "progress")]
[JsonDerivedType(typeof(ProcessingCompleteEvent), "complete")]
public abstract record ProcessingEvent;

public record ProcessingRecordEvent(ProcessingRecordDto Record) : ProcessingEvent;
public record ProcessingProgressEvent(ProcessingProgressDto Progress) : ProcessingEvent;
public record ProcessingCompleteEvent(ProcessingProgressDto Progress) : ProcessingEvent;

public record ProcessingRecordDto
{
    public string Id { get; init; } = string.Empty;
    public int UpstreamId { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Status { get; init; } = string.Empty;
    public string? Error { get; init; }
    public int? ResumeSizeKb { get; init; }
    public int? ExtractedChunks { get; init; }
    public int? VectorDimensions { get; init; }
}

public record ProcessingProgressDto
{
    public string Source { get; init; } = string.Empty;
    public string Status { get; init; } = string.Empty;
    public int TotalRecords { get; init; }
    public int ProcessedRecords { get; init; }
    public int SuccessCount { get; init; }
    public int FailedCount { get; init; }
    public int SkippedCount { get; init; }
}
