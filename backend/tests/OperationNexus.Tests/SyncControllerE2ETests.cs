using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using NSubstitute;
using OperationNexus.Api.Data;
using OperationNexus.Api.Models;
using OperationNexus.Api.Models.Entities;
using OperationNexus.Api.Models.Upstream;
using OperationNexus.Api.Services;
using Xunit;

namespace OperationNexus.Tests;

public class SyncControllerE2ETests : IDisposable
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;
    private readonly IUpstreamApiService _upstreamApi = Substitute.For<IUpstreamApiService>();
    private readonly ICatalogService _catalogService = Substitute.For<ICatalogService>();
    private readonly string _dbName = $"E2E-{Guid.NewGuid()}";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public SyncControllerE2ETests()
    {
        _factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");
            builder.ConfigureServices(services =>
            {
                var descriptor = services.SingleOrDefault(
                    d => d.ServiceType == typeof(DbContextOptions<NexusDbContext>));
                if (descriptor != null) services.Remove(descriptor);

                services.AddSingleton<NexusDbContext>(_ =>
                {
                    var opts = new DbContextOptionsBuilder<NexusDbContext>()
                        .UseInMemoryDatabase(_dbName)
                        .Options;
                    var ctx = new TestDbContext(opts);
                    ctx.Database.EnsureCreated();
                    return ctx;
                });

                services.RemoveAll<IUpstreamApiService>();
                services.AddSingleton(_upstreamApi);

                services.RemoveAll<ICatalogService>();
                services.AddSingleton(_catalogService);

                services.RemoveAll<ISyncOrchestrator>();
                services.AddScoped<ISyncOrchestrator, SyncOrchestrator>();
            });
        });
        _client = _factory.CreateClient();
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    [Fact]
    public async Task GetRecords_ReturnsCorrectDtoShape()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();

        db.SyncedEmployees.Add(new SyncedEmployee
        {
            UpstreamId = 100,
            FullName = "Shape Test",
            Email = "shape@test.com",
            Seniority = "Senior",
            MainSkill = ".NET",
            Country = "Mexico",
            GrossMonthlySalary = 8000m,
            SalaryCurrency = "USD",
            HasResume = true,
            ResumeNoteId = 55,
            ResumeFilename = "shape_cv.pdf",
            IsBench = false,
            JobTitle = "Software Engineer",
            Status = "synced",
            SyncedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        var response = await _client.GetAsync("/api/sync/records/employees");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        var records = JsonSerializer.Deserialize<List<SyncRecordDto>>(json, JsonOptions);
        Assert.NotNull(records);
        Assert.NotEmpty(records);

        var record = records!.First(r => r.UpstreamId == 100);
        Assert.Equal("Senior", record.Seniority);
        Assert.Equal(8000m, record.GrossMonthlySalary);
        Assert.Equal("USD", record.Currency);
        Assert.Equal("shape_cv.pdf", record.ResumeFilename);
        Assert.Null(record.Reason);
    }

    [Fact]
    public async Task SyncOne_ReturnsMappedCatalogs()
    {
        _catalogService.GetSenioritiesAsync(Arg.Any<string>())
            .Returns(new Dictionary<int, string> { { 3, "Intermediate" } });
        _catalogService.GetMainSkillsAsync(Arg.Any<string>())
            .Returns(new Dictionary<int, string> { { 700, "React" } });
        _catalogService.GetCountriesAsync(Arg.Any<string>())
            .Returns(new Dictionary<int, string> { { 5, "Mexico" } });

        _upstreamApi.GetEmployeeDetailAsync(Arg.Any<string>(), 999)
            .Returns(new EmployeeDetail
            {
                UserId = 999,
                FullName = "E2E User",
                Email = "e2e@test.com",
                Seniority = 3,
                MainSkillId = 700,
                CountryId = 5,
                JobTitle = "Dev"
            });
        _upstreamApi.GetEmployeeContractsAsync(Arg.Any<string>(), 999)
            .Returns(new List<EmployeeContract>
            {
                new() { Salary = 5000m, CurrencyCode = "MXN" }
            });
        _upstreamApi.GetEmployeeRatesAsync(Arg.Any<string>(), 999)
            .Returns(new List<EmployeeRate>());
        _upstreamApi.GetEmployeeNotesAsync(Arg.Any<string>(), 999)
            .Returns(new List<PersonaNote>
            {
                new() { PersonaNoteId = 77, NoteTypeName = "Resume", Filename = "cv.pdf", DateCreated = DateTime.UtcNow }
            });

        var response = await _client.PostAsync("/api/sync/sync-one/employees/999?token=test-token", null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        var dto = JsonSerializer.Deserialize<SyncRecordDto>(json, JsonOptions);
        Assert.NotNull(dto);
        Assert.Equal("Intermediate", dto!.Seniority);
        Assert.Equal("Mexico", dto.Country);
        Assert.Equal("React", dto.MainSkill);
        Assert.Equal(5000m, dto.GrossMonthlySalary);
        Assert.Equal("cv.pdf", dto.ResumeFilename);
    }

    [Fact]
    public async Task GetCatalogSkills_ReturnsValueLabelFormat()
    {
        _catalogService.GetMainSkillsAsync(Arg.Any<string>())
            .Returns(new Dictionary<int, string>
            {
                { 700, "3D Artist" },
                { 701, "React" }
            });

        var response = await _client.GetAsync("/api/sync/catalogs/skills?token=test-token");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<Dictionary<string, string>>(json, JsonOptions);
        Assert.NotNull(result);
        Assert.Equal("3D Artist", result!["700"]);
        Assert.Equal("React", result["701"]);
    }
}
