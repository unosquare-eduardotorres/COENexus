namespace OperationNexus.Api.Models.Entities;

public class ResumeSession
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string SourceType { get; set; } = string.Empty;
    public int? CandidateUpstreamId { get; set; }
    public int? EmployeeUpstreamId { get; set; }
    public string CurrentStepKey { get; set; } = "processing";
    public string? CompletedStepsJson { get; set; }
    public string? StepperContextJson { get; set; }
    public string? ResumeContentJson { get; set; }
    public string? OriginalResumeText { get; set; }
    public string? OriginalFileName { get; set; }
    public string? OriginalFileType { get; set; }
    public string ProcessingMode { get; set; } = "single";
    public string? RefinementMode { get; set; }
    public string UploadStatus { get; set; } = "pending";
    public string VectorizationStatus { get; set; } = "pending";
    public int Version { get; set; } = 1;
    public string Status { get; set; } = "active";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int? ResumeEmbeddingId { get; set; }
    public ResumeEmbedding? ResumeEmbedding { get; set; }
}
