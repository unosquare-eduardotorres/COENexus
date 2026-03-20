namespace OperationNexus.Api.Services;

public record EmbeddingJob(
    string Source,
    int DbId,
    int UpstreamId,
    string Name,
    int? ResumeNoteId,
    string? ResumeFilename,
    bool IsBench,
    string Token,
    string Model = "voyage-4-large"
);
