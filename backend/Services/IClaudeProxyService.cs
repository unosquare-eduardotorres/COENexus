namespace OperationNexus.Api.Services;

public interface IClaudeProxyService
{
    Task<string> ChatAsync(string model, string prompt, int maxTokens = 4096, double temperature = 0.1, string? systemPrompt = null, CancellationToken ct = default);
}
