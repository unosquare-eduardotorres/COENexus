using OperationNexus.Api.Models;

namespace OperationNexus.Api.Services;

public interface ISyncOrchestrator
{
    IAsyncEnumerable<SyncEvent> SyncAsync(string source, string token, int? limit = null, int? skip = null, int? year = null, CancellationToken cancellationToken = default);
    Task<SyncRecordDto> SyncSingleAsync(string source, string token, int upstreamId, CancellationToken ct = default);
}
