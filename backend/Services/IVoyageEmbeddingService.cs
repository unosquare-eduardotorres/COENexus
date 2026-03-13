namespace OperationNexus.Api.Services;

public interface IVoyageEmbeddingService
{
    Task<float[]> GenerateEmbeddingAsync(string text, string model, CancellationToken ct = default);
}
