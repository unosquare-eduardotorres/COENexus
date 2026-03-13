using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Options;
using OperationNexus.Api.Configuration;
using OperationNexus.Api.Models.Upstream;

namespace OperationNexus.Api.Services;

public class UpstreamApiService : IUpstreamApiService
{
    private readonly HttpClient _httpClient;
    private readonly string _baseUrl;

    public UpstreamApiService(HttpClient httpClient, IOptions<UpstreamSettings> settings)
    {
        _httpClient = httpClient;
        _baseUrl = settings.Value.ApiUrl;
    }

    public async Task<(List<EmployeeDetail> Items, int TotalRecords)> GetEmployeesPagedAsync(string token, int skip, int take)
    {
        var request = CreateAuthorizedRequest(HttpMethod.Post, $"{_baseUrl}employee/paged", token);
        request.Content = JsonContent.Create(new PagedRequest
        {
            Skip = skip,
            Take = take,
            Columns = BuildEmployeeColumns()
        });
        var response = await _httpClient.SendAsync(request);
        response.EnsureSuccessStatusCode();
        var paged = await response.Content.ReadFromJsonAsync<PagedResponse>() ?? new();

        var items = paged.Payload.Select(row => new EmployeeDetail
        {
            UserId = GetInt(row, 0),
            FullName = GetString(row, 2),
            Email = GetString(row, 3),
            JobTitle = GetString(row, 4),
            MainSkillName = GetString(row, 5),
            OfficeName = GetString(row, 8),
        }).ToList();

        return (items, paged.FilteredRecordCount);
    }

    public async Task<EmployeeDetail> GetEmployeeDetailAsync(string token, int id)
    {
        var request = CreateAuthorizedRequest(HttpMethod.Get, $"{_baseUrl}employee/get/{id}", token);
        var response = await _httpClient.SendAsync(request);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<EmployeeDetail>() ?? new();
    }

    public async Task<List<EmployeeContract>> GetEmployeeContractsAsync(string token, int id)
    {
        var request = CreateAuthorizedRequest(HttpMethod.Get, $"{_baseUrl}contract/{id}", token);
        var response = await _httpClient.SendAsync(request);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<List<EmployeeContract>>() ?? new();
    }

    public async Task<List<EmployeeRate>> GetEmployeeRatesAsync(string token, int id)
    {
        var request = CreateAuthorizedRequest(HttpMethod.Post, $"{_baseUrl}employee/{id}/rate", token);
        request.Content = JsonContent.Create(new PagedRequest
        {
            Skip = 0,
            Take = 100,
            Columns = BuildRateColumns()
        });
        var response = await _httpClient.SendAsync(request);
        response.EnsureSuccessStatusCode();
        var paged = await response.Content.ReadFromJsonAsync<PagedResponse>() ?? new();

        return paged.Payload.Select(row => new EmployeeRate
        {
            AccountName = GetString(row, 0),
            ProjectName = GetString(row, 1),
            Rate = GetDecimal(row, 2),
            StartDate = GetString(row, 3),
        }).ToList();
    }

    public async Task<List<PersonaNote>> GetEmployeeNotesAsync(string token, int id)
    {
        var request = CreateAuthorizedRequest(HttpMethod.Post, $"{_baseUrl}personanote/pagedByUser/{id}", token);
        request.Content = JsonContent.Create(new PagedRequest
        {
            Skip = 0,
            Take = 100,
            Columns = BuildNoteColumns()
        });
        var response = await _httpClient.SendAsync(request);
        response.EnsureSuccessStatusCode();
        var paged = await response.Content.ReadFromJsonAsync<PagedResponse>() ?? new();

        return MapNoteRows(paged);
    }

    public async Task<(List<CandidateDetail> Items, int TotalRecords)> GetCandidatesPagedAsync(string token, int skip, int take)
    {
        var request = CreateAuthorizedRequest(HttpMethod.Post, $"{_baseUrl}Candidate/paged", token);
        request.Content = JsonContent.Create(new PagedRequest
        {
            Skip = skip,
            Take = take,
            Columns = BuildCandidateColumns()
        });
        var response = await _httpClient.SendAsync(request);
        response.EnsureSuccessStatusCode();
        var paged = await response.Content.ReadFromJsonAsync<PagedResponse>() ?? new();

        var items = paged.Payload.Select(row => new CandidateDetail
        {
            CandidateId = GetInt(row, 0),
            FullName = GetString(row, 1),
            Email = GetString(row, 11),
            MainSkill = GetString(row, 5),
            Seniority = GetString(row, 7),
            Country = GetString(row, 13),
        }).ToList();

        return (items, paged.FilteredRecordCount);
    }

    public async Task<CandidateDetail> GetCandidateDetailAsync(string token, int id)
    {
        var request = CreateAuthorizedRequest(HttpMethod.Get, $"{_baseUrl}Candidate/{id}", token);
        var response = await _httpClient.SendAsync(request);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<CandidateDetail>() ?? new();
    }

    public async Task<List<PersonaNote>> GetCandidateNotesAsync(string token, int id)
    {
        var request = CreateAuthorizedRequest(HttpMethod.Post, $"{_baseUrl}personanote/pagedByCandidate/{id}", token);
        request.Content = JsonContent.Create(new PagedRequest
        {
            Skip = 0,
            Take = 100,
            Columns = BuildNoteColumns()
        });
        var response = await _httpClient.SendAsync(request);
        response.EnsureSuccessStatusCode();
        var paged = await response.Content.ReadFromJsonAsync<PagedResponse>() ?? new();

        return MapNoteRows(paged);
    }

    public async Task<byte[]> GetNoteFileAsync(string token, int noteId)
    {
        var request = CreateAuthorizedRequest(HttpMethod.Get, $"{_baseUrl}personanote/file/{noteId}", token);
        var response = await _httpClient.SendAsync(request);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadAsByteArrayAsync();
    }

    private HttpRequestMessage CreateAuthorizedRequest(HttpMethod method, string url, string token)
    {
        var request = new HttpRequestMessage(method, url);
        request.Headers.Add("x-sharepoint-token", token);
        return request;
    }

    private static List<ColumnDefinition> BuildEmployeeColumns()
    {
        return new List<ColumnDefinition>
        {
            new() { Name = "UserId", Label = "User ID", DataType = "numeric", IsKey = true, Filterable = false, Exportable = true, FilterOperator = "None", Visible = false },
            new() { Name = "Active", Label = "Active", FilterOperator = "Equals", FilterText = "Active", Filterable = false, Visible = false },
            new() { Name = "FullName", Label = "Name", Searchable = true, SortDirection = "Ascending", SortOrder = 1 },
            new() { Name = "Email", Label = "E-mail", Searchable = true },
            new() { Name = "JobTitle", Label = "Job Title", Searchable = true },
            new() { Name = "MainSkill", Label = "Main Skill", Searchable = true },
            new() { Name = "AdditionalSkills", Label = "Additional Skills", Searchable = true, Sortable = false },
            new() { Name = "FunctionalUnit", Label = "Functional Unit", Searchable = true },
            new() { Name = "Office", Label = "Office Location", Searchable = true },
            new() { Name = "ContractType", Label = "Contract Type", Searchable = true },
            new() { Name = "BusinessUnit", Label = "Business Unit", Searchable = true },
            new() { Name = "StartDate", Label = "Start Date", DataType = "datetimeutc", Searchable = false },
            new() { Name = "EnterpriseId", Label = "Enterprise ID", Searchable = true },
            new() { Name = "HrName", Label = "HR Partner", Searchable = true },
            new() { Name = "PeopleSuccessLead", Label = "People Success Lead", Searchable = true },
            new() { Name = "DateOfBirth", Label = "Date of Birth", DataType = "datetimeutc", Searchable = false, Sortable = false, Filterable = false },
            new() { Name = "AnniversaryDate", Label = "Anniversary Date", DataType = "datetimeutc", Searchable = false, Sortable = false, Filterable = false },
            new() { Name = "IsProjectBased", Label = "Is Project Based", Searchable = false },
        };
    }

    private static List<ColumnDefinition> BuildCandidateColumns()
    {
        return new List<ColumnDefinition>
        {
            new() { Name = "CandidateId", Label = "Actions", DataType = "numeric", IsKey = true, Filterable = false, Exportable = false, FilterOperator = "Equals" },
            new() { Name = "Candidate", Label = "Candidate", Searchable = true, SortDirection = "Ascending", SortOrder = 1 },
            new() { Name = "Recruiter", Label = "Recruiter", Searchable = true },
            new() { Name = "CandidateStatusName", Label = "Status", Filterable = false },
            new() { Name = "JobBoard", Label = "Job Board" },
            new() { Name = "Skills", Label = "Main Skill" },
            new() { Name = "AdditionalSkills", Label = "Additional Skill" },
            new() { Name = "Seniority", Label = "Seniority" },
            new() { Name = "SeniorityBand", Label = "Seniority Band" },
            new() { Name = "CoeCertifiedStatus", Label = "COE Certified Status" },
            new() { Name = "MobilePhone", Label = "Mobile Phone" },
            new() { Name = "Email", Label = "Email", Searchable = true },
            new() { Name = "SecondaryEmail", Label = "Secondary Email" },
            new() { Name = "Location", Label = "Location" },
            new() { Name = "StatusUpdate", Label = "Status Update", DataType = "datetimeutc" },
        };
    }

    private static List<ColumnDefinition> BuildRateColumns()
    {
        return new List<ColumnDefinition>
        {
            new() { Name = "AccountName", Label = "Account", Searchable = true },
            new() { Name = "ProjectName", Label = "Project", Searchable = true },
            new() { Name = "Rate", Label = "Rate", DataType = "numeric", Searchable = false },
            new() { Name = "StartDate", Label = "Start Date", DataType = "datetimeutc", Searchable = false },
        };
    }

    private static List<ColumnDefinition> BuildNoteColumns()
    {
        return new List<ColumnDefinition>
        {
            new() { Name = "PersonaNoteId", Label = "Note ID", DataType = "numeric", IsKey = true, Filterable = false, FilterOperator = "None", Visible = false },
            new() { Name = "NoteTypeName", Label = "Type", Searchable = true },
            new() { Name = "NoteContent", Label = "Content", Searchable = true },
            new() { Name = "FullName", Label = "Name", Searchable = true },
            new() { Name = "DateCreated", Label = "Created", DataType = "datetimeutc", Searchable = false },
            new() { Name = "Filename", Label = "File", Searchable = true },
        };
    }

    private static List<PersonaNote> MapNoteRows(PagedResponse paged)
    {
        return paged.Payload.Select(row => new PersonaNote
        {
            PersonaNoteId = GetInt(row, 0),
            NoteTypeName = GetString(row, 1),
            NoteContent = GetString(row, 2),
            FullName = GetString(row, 3),
            DateCreated = GetDateTime(row, 4),
            Filename = GetNullableString(row, 5),
        }).ToList();
    }

    private static string GetString(JsonElement[] row, int i) =>
        i < row.Length && row[i].ValueKind == JsonValueKind.String
            ? row[i].GetString() ?? string.Empty
            : i < row.Length ? row[i].ToString() : string.Empty;

    private static string? GetNullableString(JsonElement[] row, int i) =>
        i < row.Length && row[i].ValueKind == JsonValueKind.String
            ? row[i].GetString()
            : i < row.Length && row[i].ValueKind != JsonValueKind.Null ? row[i].ToString() : null;

    private static int GetInt(JsonElement[] row, int i) =>
        i < row.Length && row[i].ValueKind == JsonValueKind.Number
            ? row[i].GetInt32() : 0;

    private static decimal GetDecimal(JsonElement[] row, int i) =>
        i < row.Length && row[i].ValueKind == JsonValueKind.Number
            ? row[i].GetDecimal() : 0m;

    private static DateTime GetDateTime(JsonElement[] row, int i)
    {
        if (i < row.Length && row[i].ValueKind == JsonValueKind.String)
        {
            var str = row[i].GetString();
            if (DateTime.TryParse(str, out var dt))
                return dt;
        }
        return DateTime.MinValue;
    }
}
