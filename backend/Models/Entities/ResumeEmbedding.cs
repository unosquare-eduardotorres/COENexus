using Pgvector;

namespace OperationNexus.Api.Models.Entities;

public class ResumeEmbedding
{
    public int Id { get; set; }
    public string SourceType { get; set; } = string.Empty;
    public int SourceId { get; set; }
    public int UpstreamId { get; set; }
    public Vector? Embedding { get; set; }
    public string? ResumeText { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public bool IsBench { get; set; }
}
