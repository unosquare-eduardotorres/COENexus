namespace OperationNexus.Api.Services;

public interface IEmbeddingJobQueue
{
    ValueTask EnqueueAsync(EmbeddingJob job, CancellationToken ct = default);
    IAsyncEnumerable<EmbeddingJob> DequeueAllAsync(CancellationToken ct);
    int PendingCount { get; }
}
