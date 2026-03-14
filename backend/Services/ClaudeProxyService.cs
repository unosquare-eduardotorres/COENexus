using System.Diagnostics;
using System.Net;
using Microsoft.Extensions.Options;
using OperationNexus.Api.Configuration;

namespace OperationNexus.Api.Services;

public class ClaudeProxyService : IClaudeProxyService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<ClaudeProxyService> _logger;
    private readonly string _baseUrl;
    private readonly string _haikuModel;
    private readonly string _sonnetModel;
    private const int MaxRetries = 5;
    private static readonly int[] BackoffSeconds = [2, 5, 10, 20, 40];

    public ClaudeProxyService(HttpClient httpClient, IOptions<ClaudeProxySettings> settings, ILogger<ClaudeProxyService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _baseUrl = settings.Value.BaseUrl.TrimEnd('/');
        _haikuModel = settings.Value.HaikuModel;
        _sonnetModel = settings.Value.SonnetModel;
        _httpClient.Timeout = TimeSpan.FromSeconds(settings.Value.TimeoutSeconds);
    }

    public async Task<string> ChatAsync(string model, string prompt, int maxTokens = 4096, double temperature = 0.1, CancellationToken ct = default)
    {
        for (int attempt = 0; attempt <= MaxRetries; attempt++)
        {
            var request = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}/v1/chat/completions");
            request.Content = JsonContent.Create(new
            {
                model,
                max_tokens = maxTokens,
                temperature,
                messages = new[] { new { role = "user", content = prompt } }
            });

            var sw = Stopwatch.StartNew();
            var response = await _httpClient.SendAsync(request, ct);
            sw.Stop();

            if (response.StatusCode == HttpStatusCode.TooManyRequests && attempt < MaxRetries)
            {
                var retryAfter = response.Headers.RetryAfter?.Delta?.TotalSeconds
                    ?? BackoffSeconds[Math.Min(attempt, BackoffSeconds.Length - 1)];
                _logger.LogWarning("[ClaudeProxy] {Model} 429 rate-limited, waiting {Delay:F0}s (retry {Attempt}/{Max})",
                    model, retryAfter, attempt + 1, MaxRetries);
                await Task.Delay(TimeSpan.FromSeconds(retryAfter), ct);
                continue;
            }

            _logger.LogInformation("[ClaudeProxy] {Model} responded in {Ms}ms (attempt {Attempt})",
                model, sw.ElapsedMilliseconds, attempt + 1);

            response.EnsureSuccessStatusCode();

            var result = await response.Content.ReadFromJsonAsync<ChatCompletionResponse>(ct);
            return result?.Choices?.FirstOrDefault()?.Message?.Content
                ?? throw new InvalidOperationException("Empty chat completion response");
        }

        throw new HttpRequestException("Claude proxy rate limit exceeded after all retries");
    }
}

file record ChatMessage(string Content);
file record ChatChoice(ChatMessage Message);
file record ChatCompletionResponse(List<ChatChoice> Choices);
