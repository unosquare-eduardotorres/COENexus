namespace OperationNexus.Api.Configuration;

public class VoyageSettings
{
    public string ApiUrl { get; set; } = "https://api.voyageai.com/v1";
    public string DefaultModel { get; set; } = "voyage-4-large";
    public string ApiKey { get; set; } = string.Empty;
}
