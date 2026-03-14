using OperationNexus.Api.Models;

namespace OperationNexus.Api.Services;

public interface IMatchEngineService
{
    IAsyncEnumerable<MatchEvent> SearchAsync(MatchRequest request, CancellationToken ct = default);
    Task<PoolCountsResponse> GetPoolCountsAsync(CancellationToken ct = default);
    Task<FilterOptionsResponse> GetFilterOptionsAsync(CancellationToken ct = default);
    Task<int> CreateSessionAsync(CreateSessionRequest request, CancellationToken ct = default);
    Task SaveSessionResultAsync(int sessionId, MatchSearchResult result, PipelineStagesDto stages, CancellationToken ct = default);
    Task FailSessionAsync(int sessionId, CancellationToken ct = default);
    Task<List<MatchSessionDto>> ListSessionsAsync(CancellationToken ct = default);
    Task<MatchSessionDetailDto?> GetSessionAsync(int id, CancellationToken ct = default);
}
