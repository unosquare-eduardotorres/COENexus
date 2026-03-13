namespace OperationNexus.Api.Services;

public interface ICatalogService
{
    Task<Dictionary<int, string>> GetSenioritiesAsync(string token);
    Task<Dictionary<int, string>> GetMainSkillsAsync(string token);
    Task<Dictionary<int, string>> GetCountriesAsync(string token);
}
