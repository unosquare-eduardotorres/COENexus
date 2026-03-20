namespace OperationNexus.Api.Services;

public interface IResumeSessionVectorizer
{
    Task VectorizeSessionAsync(int sessionId, string model = "voyage-4-large", CancellationToken ct = default);
}
