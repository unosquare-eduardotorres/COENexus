using System.Net.Http.Json;
using Microsoft.Extensions.Options;
using OperationNexus.Api.Configuration;

namespace OperationNexus.Api.Services;

public class CatalogService : ICatalogService
{
    private readonly HttpClient _httpClient;
    private readonly string _baseUrl;

    private Dictionary<int, string>? _seniorities;
    private Dictionary<int, string>? _mainSkills;
    private Dictionary<int, string>? _countries;

    public CatalogService(HttpClient httpClient, IOptions<CatalogSettings> settings)
    {
        _httpClient = httpClient;
        _baseUrl = settings.Value.ApiUrl;
    }

    public async Task<Dictionary<int, string>> GetSenioritiesAsync(string token)
    {
        if (_seniorities is null)
        {
            var request = CreateAuthorizedRequest(HttpMethod.Get, $"{_baseUrl}seniorities", token);
            var response = await _httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();
            var items = await response.Content.ReadFromJsonAsync<List<KeyTextItem>>() ?? new();
            _seniorities = items.ToDictionary(i => i.Key, i => i.Text);
        }
        return _seniorities;
    }

    public async Task<Dictionary<int, string>> GetMainSkillsAsync(string token)
    {
        if (_mainSkills is null)
        {
            var request = CreateAuthorizedRequest(HttpMethod.Get, $"{_baseUrl}main-skills", token);
            var response = await _httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();
            var items = await response.Content.ReadFromJsonAsync<List<ValueLabelItem>>() ?? new();
            _mainSkills = items.ToDictionary(i => i.Value, i => i.Label);
        }
        return _mainSkills;
    }

    public async Task<Dictionary<int, string>> GetCountriesAsync(string token)
    {
        if (_countries is null)
        {
            var request = CreateAuthorizedRequest(HttpMethod.Get, $"{_baseUrl}locations/countries/true", token);
            var response = await _httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();
            var items = await response.Content.ReadFromJsonAsync<List<ValueLabelItem>>() ?? new();
            _countries = items.ToDictionary(i => i.Value, i => i.Label);
        }
        return _countries;
    }

    private HttpRequestMessage CreateAuthorizedRequest(HttpMethod method, string url, string token)
    {
        var request = new HttpRequestMessage(method, url);
        request.Headers.Add("x-sharepoint-token", token);
        return request;
    }
}

record KeyTextItem(int Key, string Text);
record ValueLabelItem(int Value, string Label);
