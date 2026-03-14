namespace OperationNexus.Api.Configuration;

public class ClaudeProxySettings
{
    public string BaseUrl { get; set; } = "http://localhost:3456";
    public string HaikuModel { get; set; } = "claude-haiku-4-20250414";
    public string SonnetModel { get; set; } = "claude-sonnet-4-20250514";
    public int TimeoutSeconds { get; set; } = 120;
    public int MaxConcurrency { get; set; } = 5;
}
