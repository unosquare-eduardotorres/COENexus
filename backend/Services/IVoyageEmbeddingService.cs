namespace OperationNexus.Api.Services;

public interface IVoyageEmbeddingService
{
    Task<float[]> GenerateEmbeddingAsync(string text, string model, CancellationToken ct = default);
    Task<float[]> GenerateEmbeddingWithKeyAsync(string text, string model, string apiKey, CancellationToken ct = default);
}
