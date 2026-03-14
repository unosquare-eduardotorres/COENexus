using System.Diagnostics;
using System.Net;
using Microsoft.Extensions.Options;
using OperationNexus.Api.Configuration;

namespace OperationNexus.Api.Services;

public class VoyageEmbeddingService : IVoyageEmbeddingService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<VoyageEmbeddingService> _logger;
    private readonly string _apiUrl;
    private readonly string _apiKey;
    private const int MaxRetries = 5;
    private static readonly int[] BackoffSeconds = [2, 5, 10, 20, 40];

    public VoyageEmbeddingService(HttpClient httpClient, IOptions<VoyageSettings> settings, ILogger<VoyageEmbeddingService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _apiUrl = settings.Value.ApiUrl.TrimEnd('/');
        _apiKey = settings.Value.ApiKey;
    }

    public async Task<float[]> GenerateEmbeddingAsync(string text, string model, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_apiKey))
            throw new InvalidOperationException("Voyage API key not configured. Set the Voyage__ApiKey environment variable.");

        for (int attempt = 0; attempt <= MaxRetries; attempt++)
        {
            var request = new HttpRequestMessage(HttpMethod.Post, $"{_apiUrl}/embeddings");
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _apiKey);
            request.Content = JsonContent.Create(new
            {
                input = new[] { text },
                model
            });

            var sw = Stopwatch.StartNew();
            var response = await _httpClient.SendAsync(request, ct);
            sw.Stop();

            if (response.StatusCode == HttpStatusCode.TooManyRequests && attempt < MaxRetries)
            {
                var retryAfter = response.Headers.RetryAfter?.Delta?.TotalSeconds
                    ?? BackoffSeconds[Math.Min(attempt, BackoffSeconds.Length - 1)];
                _logger.LogWarning("[Voyage] 429 rate-limited, waiting {Delay:F0}s (retry {Attempt}/{Max})",
                    retryAfter, attempt + 1, MaxRetries);
                await Task.Delay(TimeSpan.FromSeconds(retryAfter), ct);
                continue;
            }

            _logger.LogInformation("[Voyage] Embedding generated in {Ms}ms (attempt {Attempt})",
                sw.ElapsedMilliseconds, attempt + 1);

            response.EnsureSuccessStatusCode();

            var result = await response.Content.ReadFromJsonAsync<VoyageResponse>(ct);
            return result?.Data?.FirstOrDefault()?.Embedding ?? throw new InvalidOperationException("Empty embedding response");
        }

        throw new HttpRequestException("Voyage API rate limit exceeded after all retries");
    }
}

file record VoyageResponse(List<VoyageData> Data);
file record VoyageData(float[] Embedding);
