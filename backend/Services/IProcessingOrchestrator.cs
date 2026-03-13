using OperationNexus.Api.Models;

namespace OperationNexus.Api.Services;

public interface IProcessingOrchestrator
{
    IAsyncEnumerable<ProcessingEvent> ProcessAsync(string source, string token, string model, CancellationToken ct = default);
    IAsyncEnumerable<ProcessingEvent> ExtractAsync(string source, string token, CancellationToken ct = default);
    IAsyncEnumerable<ProcessingEvent> VectorizeAsync(string source, string model, CancellationToken ct = default);
    Task<ProcessingRecordDto> VectorizeSingleAsync(string source, string model, int upstreamId, CancellationToken ct = default);
}
