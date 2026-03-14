using System.Text.Json.Serialization;

namespace OperationNexus.Api.Models;

[JsonDerivedType(typeof(SyncRecordEvent), "record")]
[JsonDerivedType(typeof(SyncProgressEvent), "progress")]
[JsonDerivedType(typeof(SyncCompleteEvent), "complete")]
public abstract record SyncEvent;

public record SyncRecordEvent(SyncRecordDto Record) : SyncEvent;
public record SyncProgressEvent(SyncProgressDto Progress) : SyncEvent;
public record SyncCompleteEvent(SyncProgressDto Progress) : SyncEvent;

public record SyncRecordDto
{
    public string Id { get; init; } = string.Empty;
    public string Source { get; init; } = string.Empty;
    public string Status { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string? Seniority { get; init; }
    public string? MainSkill { get; init; }
    public string? Country { get; init; }
    public decimal? GrossMonthlySalary { get; init; }
    public decimal? ExpectedRate { get; init; }
    public string? Currency { get; init; }
    public string? LastAccount { get; init; }
    public string? LastAccountStartDate { get; init; }
    public bool HasResume { get; init; }
    public int? ResumeNoteId { get; init; }
    public string? ResumeFilename { get; init; }
    public bool IsBench { get; init; }
    public string? Reason { get; init; }
    public bool ResumeChanged { get; init; }
    public int UpstreamId { get; init; }
    public bool Failed { get; init; }
    public string? SyncDetail { get; init; }
    public string SyncedAt { get; init; } = string.Empty;
    public string? ResumeDateCreated { get; init; }
    public bool CoeCertified { get; init; }
    public string? LastStatusUpdate { get; init; }
    public decimal? SalaryExpectations { get; init; }
    public string? SalaryExpectationsCurrency { get; init; }
    public string? JobTitle { get; init; }
    public string? CandidateStatus { get; init; }
}

public record SyncProgressDto
{
    public int TotalRecords { get; init; }
    public int FetchedRecords { get; init; }
    public int SyncedCount { get; init; }
    public int IncompleteCount { get; init; }
    public int NotProcessedCount { get; init; }
    public int UpdatedCount { get; init; }
    public int UnchangedCount { get; init; }
    public int SkippedCount { get; init; }
    public string? CurrentRecord { get; init; }
    public string Status { get; init; } = string.Empty;
}
