using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using OperationNexus.Api.Data;
using OperationNexus.Api.Models.Upstream;
using OperationNexus.Api.Services;
using Xunit;

namespace OperationNexus.Tests;

public class SyncOrchestratorTests : IDisposable
{
    private const string FakeToken = "fake-token";

    private readonly IUpstreamApiService _upstreamApi = Substitute.For<IUpstreamApiService>();
    private readonly ICatalogService _catalogService = Substitute.For<ICatalogService>();
    private readonly NexusDbContext _dbContext;
    private readonly SyncOrchestrator _orchestrator;

    public SyncOrchestratorTests()
    {
        var options = new DbContextOptionsBuilder<NexusDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _dbContext = new TestDbContext(options);

        var logger = Substitute.For<ILogger<SyncOrchestrator>>();
        _orchestrator = new SyncOrchestrator(_upstreamApi, _catalogService, _dbContext, logger);
    }

    public void Dispose() => _dbContext.Dispose();

    private void SetupDefaultCatalogs(
        Dictionary<int, string>? seniorities = null,
        Dictionary<int, string>? mainSkills = null,
        Dictionary<int, string>? countries = null)
    {
        _catalogService.GetSenioritiesAsync(FakeToken).Returns(seniorities ?? new Dictionary<int, string>());
        _catalogService.GetMainSkillsAsync(FakeToken).Returns(mainSkills ?? new Dictionary<int, string>());
        _catalogService.GetCountriesAsync(FakeToken).Returns(countries ?? new Dictionary<int, string>());
    }

    private void SetupDefaultUpstreamResponses(
        EmployeeDetail? detail = null,
        List<EmployeeContract>? contracts = null,
        List<EmployeeRate>? rates = null,
        List<PersonaNote>? notes = null,
        int upstreamId = 123)
    {
        _upstreamApi.GetEmployeeDetailAsync(FakeToken, upstreamId)
            .Returns(detail ?? new EmployeeDetail { UserId = upstreamId, FullName = "Test User", Email = "test@example.com" });
        _upstreamApi.GetEmployeeContractsAsync(FakeToken, upstreamId)
            .Returns(contracts ?? new List<EmployeeContract>());
        _upstreamApi.GetEmployeeRatesAsync(FakeToken, upstreamId)
            .Returns(rates ?? new List<EmployeeRate>());
        _upstreamApi.GetEmployeeNotesAsync(FakeToken, upstreamId)
            .Returns(notes ?? new List<PersonaNote>());
    }

    [Fact]
    public async Task BuildEmployee_MapsSeniorityFromCatalog()
    {
        SetupDefaultCatalogs(seniorities: new Dictionary<int, string> { { 3, "Intermediate" } });
        SetupDefaultUpstreamResponses(
            detail: new EmployeeDetail
            {
                UserId = 123,
                FullName = "John Doe",
                Email = "john@test.com",
                Seniority = 3,
                MainSkillId = 1,
                CountryId = 1
            },
            contracts: new List<EmployeeContract>
            {
                new() { Salary = 5000m, CurrencyCode = "USD" }
            },
            notes: new List<PersonaNote>
            {
                new() { PersonaNoteId = 42, NoteTypeName = "Resume", Filename = "resume.pdf", DateCreated = DateTime.UtcNow }
            }
        );

        var result = await _orchestrator.SyncSingleAsync("employees", FakeToken, 123);

        Assert.Equal("Intermediate", result.Seniority);
        Assert.Equal(5000m, result.GrossMonthlySalary);
        Assert.Equal("resume.pdf", result.ResumeFilename);
        Assert.True(result.HasResume);
    }

    [Fact]
    public async Task BuildEmployee_MapsCountryFromCatalog()
    {
        SetupDefaultCatalogs(
            seniorities: new Dictionary<int, string> { { 1, "Junior" } },
            countries: new Dictionary<int, string> { { 5, "Mexico" } }
        );
        SetupDefaultUpstreamResponses(
            detail: new EmployeeDetail
            {
                UserId = 123,
                FullName = "Maria Garcia",
                Email = "maria@test.com",
                Seniority = 1,
                CountryId = 5,
                MainSkillId = 1
            }
        );

        var result = await _orchestrator.SyncSingleAsync("employees", FakeToken, 123);

        Assert.Equal("Mexico", result.Country);
    }

    [Fact]
    public async Task BuildEmployee_MapsMainSkillFromCatalog()
    {
        SetupDefaultCatalogs(
            seniorities: new Dictionary<int, string> { { 1, "Junior" } },
            mainSkills: new Dictionary<int, string> { { 700, "React" } }
        );
        SetupDefaultUpstreamResponses(
            detail: new EmployeeDetail
            {
                UserId = 123,
                FullName = "Dev User",
                Email = "dev@test.com",
                Seniority = 1,
                MainSkillId = 700,
                CountryId = 1
            }
        );

        var result = await _orchestrator.SyncSingleAsync("employees", FakeToken, 123);

        Assert.Equal("React", result.MainSkill);
    }

    [Fact]
    public async Task BuildEmployee_MapsSalaryFromContract()
    {
        SetupDefaultCatalogs(seniorities: new Dictionary<int, string> { { 1, "Junior" } });
        SetupDefaultUpstreamResponses(
            detail: new EmployeeDetail
            {
                UserId = 123,
                FullName = "Salary User",
                Email = "salary@test.com",
                Seniority = 1
            },
            contracts: new List<EmployeeContract>
            {
                new() { Salary = 5000m, CurrencyCode = "USD" }
            }
        );

        var result = await _orchestrator.SyncSingleAsync("employees", FakeToken, 123);

        Assert.Equal(5000m, result.GrossMonthlySalary);
        Assert.Equal("USD", result.Currency);
    }

    [Fact]
    public async Task BuildEmployee_MapsResumeFilename()
    {
        SetupDefaultCatalogs(seniorities: new Dictionary<int, string> { { 1, "Junior" } });
        SetupDefaultUpstreamResponses(
            detail: new EmployeeDetail
            {
                UserId = 123,
                FullName = "Resume User",
                Email = "resume@test.com",
                Seniority = 1
            },
            notes: new List<PersonaNote>
            {
                new() { PersonaNoteId = 42, NoteTypeName = "Resume", Filename = "john_cv.pdf", DateCreated = DateTime.UtcNow }
            }
        );

        var result = await _orchestrator.SyncSingleAsync("employees", FakeToken, 123);

        Assert.True(result.HasResume);
        Assert.Equal("john_cv.pdf", result.ResumeFilename);
        Assert.Equal(42, result.ResumeNoteId);
    }

    [Fact]
    public async Task BuildEmployee_WhenCatalogMisses_FallsBackToPagedText()
    {
        _catalogService.GetSenioritiesAsync(FakeToken).Returns(new Dictionary<int, string> { { 1, "Junior" } });
        _catalogService.GetMainSkillsAsync(FakeToken).Throws(new HttpRequestException("catalog down"));
        _catalogService.GetCountriesAsync(FakeToken).Throws(new HttpRequestException("catalog down"));

        var pagedResult = (
            Items: new List<EmployeeDetail>
            {
                new()
                {
                    UserId = 123,
                    FullName = "Fallback User",
                    Email = "fallback@test.com",
                    Seniority = 1,
                    MainSkillName = "FallbackSkill",
                    OfficeName = "FallbackCountry",
                    JobTitle = "Developer"
                }
            },
            TotalRecords: 1
        );
        _upstreamApi.GetEmployeesPagedAsync(FakeToken, Arg.Any<int>(), Arg.Any<int>())
            .Returns(pagedResult);

        _upstreamApi.GetEmployeeDetailAsync(FakeToken, 123)
            .Returns(new EmployeeDetail
            {
                UserId = 123,
                FullName = "Fallback User",
                Email = "fallback@test.com",
                Seniority = 1,
                MainSkillId = 999,
                CountryId = 888,
                MainSkillName = "FallbackSkill",
                OfficeName = "FallbackCountry"
            });
        _upstreamApi.GetEmployeeContractsAsync(FakeToken, 123).Returns(new List<EmployeeContract>());
        _upstreamApi.GetEmployeeRatesAsync(FakeToken, 123).Returns(new List<EmployeeRate>());
        _upstreamApi.GetEmployeeNotesAsync(FakeToken, 123).Returns(new List<PersonaNote>());

        var events = new List<Api.Models.SyncEvent>();
        await foreach (var evt in _orchestrator.SyncAsync("employees", FakeToken, 1))
            events.Add(evt);

        var recordEvent = events.OfType<Api.Models.SyncRecordEvent>().First();
        Assert.Equal("FallbackSkill", recordEvent.Record.MainSkill);
        Assert.Equal("FallbackCountry", recordEvent.Record.Country);
    }

    [Fact]
    public async Task CatchBlock_MapsSeniorityFromCatalog()
    {
        var seniorities = new Dictionary<int, string> { { 2, "Junior" } };
        _catalogService.GetSenioritiesAsync(FakeToken).Returns(seniorities);
        _catalogService.GetMainSkillsAsync(FakeToken).Returns(new Dictionary<int, string>());
        _catalogService.GetCountriesAsync(FakeToken).Returns(new Dictionary<int, string>());

        var pagedResult = (
            Items: new List<EmployeeDetail>
            {
                new()
                {
                    UserId = 456,
                    FullName = "Error User",
                    Email = "error@test.com",
                    Seniority = 2,
                    JobTitle = "Developer",
                    MainSkillName = "C#",
                    OfficeName = "Guadalajara"
                }
            },
            TotalRecords: 1
        );
        _upstreamApi.GetEmployeesPagedAsync(FakeToken, Arg.Any<int>(), Arg.Any<int>())
            .Returns(pagedResult);

        _upstreamApi.GetEmployeeDetailAsync(FakeToken, 456)
            .Throws(new HttpRequestException("401 Unauthorized"));

        var events = new List<Api.Models.SyncEvent>();
        await foreach (var evt in _orchestrator.SyncAsync("employees", FakeToken))
            events.Add(evt);

        var recordEvent = events.OfType<Api.Models.SyncRecordEvent>().First();
        Assert.Equal("Junior", recordEvent.Record.Seniority);
        Assert.Equal("not-processed", recordEvent.Record.Status);
    }
}
