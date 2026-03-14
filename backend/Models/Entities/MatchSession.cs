namespace OperationNexus.Api.Models.Entities;

public class MatchSession
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string MatchFlowType { get; set; } = string.Empty;
    public string DataSource { get; set; } = string.Empty;
    public int TopN { get; set; }
    public string JobDescription { get; set; } = string.Empty;
    public string JdSource { get; set; } = string.Empty;
    public string? ConstraintsJson { get; set; }
    public string? PipelineStatsJson { get; set; }
    public string? PipelineStagesJson { get; set; }
    public string? ResultsJson { get; set; }
    public string Status { get; set; } = "running";
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}
