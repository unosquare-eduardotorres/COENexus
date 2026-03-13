namespace OperationNexus.Api.Models.Entities;

public class SyncedCandidate
{
    public int Id { get; set; }
    public int UpstreamId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Seniority { get; set; }
    public string? MainSkill { get; set; }
    public string? Country { get; set; }
    public decimal? CurrentSalary { get; set; }
    public string? SalaryCurrency { get; set; }
    public bool HasResume { get; set; }
    public int? ResumeNoteId { get; set; }
    public DateTime? ResumeDateCreated { get; set; }
    public string? ResumeFilename { get; set; }
    public string Status { get; set; } = "synced";
    public string? StatusReason { get; set; }
    public bool Failed { get; set; }
    public DateTime SyncedAt { get; set; }
    public ResumeEmbedding? Embedding { get; set; }
}
