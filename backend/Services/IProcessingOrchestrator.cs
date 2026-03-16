using OperationNexus.Api.Models;

namespace OperationNexus.Api.Services;

public interface IProcessingOrchestrator
{
    IAsyncEnumerable<ProcessingEvent> ExtractAsync(string source, string token, int? year = null, CancellationToken ct = default);
    IAsyncEnumerable<ProcessingEvent> VectorizeAsync(string source, string model, int? year = null, CancellationToken ct = default);
    Task<ProcessingRecordDto> VectorizeSingleAsync(string source, string model, int upstreamId, CancellationToken ct = default);
}
