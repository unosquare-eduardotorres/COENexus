namespace OperationNexus.Api.Models.Entities;

public class SyncedEmployee
{
    public int Id { get; set; }
    public int UpstreamId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Seniority { get; set; } = string.Empty;
    public string MainSkill { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public decimal? GrossMonthlySalary { get; set; }
    public string? SalaryCurrency { get; set; }
    public string? LastAccount { get; set; }
    public DateTime? LastAccountStartDate { get; set; }
    public decimal? Rate { get; set; }
    public bool HasResume { get; set; }
    public int? ResumeNoteId { get; set; }
    public DateTime? ResumeDateCreated { get; set; }
    public string? ResumeFilename { get; set; }
    public bool IsBench { get; set; }
    public string JobTitle { get; set; } = string.Empty;
    public string Status { get; set; } = "synced";
    public string? StatusReason { get; set; }
    public bool Failed { get; set; }
    public DateTime SyncedAt { get; set; }
    public ResumeEmbedding? Embedding { get; set; }
}
