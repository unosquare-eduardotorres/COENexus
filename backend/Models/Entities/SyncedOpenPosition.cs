namespace OperationNexus.Api.Models.Entities;

public class SyncedOpenPosition
{
    public int Id { get; set; }
    public int UpstreamId { get; set; }
    public string Account { get; set; } = string.Empty;
    public string Coe { get; set; } = string.Empty;
    public string Practice { get; set; } = string.Empty;
    public string Stakeholder { get; set; } = string.Empty;
    public string MainSkill { get; set; } = string.Empty;
    public string Countries { get; set; } = string.Empty;
    public string Seniorities { get; set; } = string.Empty;
    public string AvailableRange { get; set; } = string.Empty;

    public string AccountOverview { get; set; } = string.Empty;
    public string JobDescription { get; set; } = string.Empty;
    public string JobTitle { get; set; } = string.Empty;

    public string PositionStatus { get; set; } = "Active";
    public int Aging { get; set; }
    public string? Created { get; set; }
    public string? ReadyDate { get; set; }
    public string? LastModification { get; set; }
    public string Sourcing { get; set; } = string.Empty;
    public bool Replacement { get; set; }

    public string Status { get; set; } = "synced";
    public string? StatusReason { get; set; }
    public bool Failed { get; set; }
    public DateTime SyncedAt { get; set; }
    public ResumeEmbedding? Embedding { get; set; }
}
