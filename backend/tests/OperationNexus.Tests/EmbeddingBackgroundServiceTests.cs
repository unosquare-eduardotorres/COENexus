using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using OperationNexus.Api.Data;
using OperationNexus.Api.Models.Entities;
using OperationNexus.Api.Services;
using Xunit;

namespace OperationNexus.Tests;

public class EmbeddingBackgroundServiceTests : IDisposable
{
    private readonly string _dbName = Guid.NewGuid().ToString();
    private readonly IUpstreamApiService _upstreamApi = Substitute.For<IUpstreamApiService>();
    private readonly IVoyageEmbeddingService _voyageService = Substitute.For<IVoyageEmbeddingService>();
    private readonly IResumeTextExtractor _textExtractor = Substitute.For<IResumeTextExtractor>();
    private readonly ILogger<EmbeddingBackgroundService> _logger = Substitute.For<ILogger<EmbeddingBackgroundService>>();
    private readonly EmbeddingJobQueue _queue = new();
    private readonly ServiceProvider _serviceProvider;

    public EmbeddingBackgroundServiceTests()
    {
        var services = new ServiceCollection();
        services.AddScoped<NexusDbContext>(sp =>
        {
            var options = new DbContextOptionsBuilder<NexusDbContext>()
                .UseInMemoryDatabase(_dbName)
                .Options;
            return new TestDbContext(options);
        });
        services.AddScoped(_ => _upstreamApi);
        services.AddScoped(_ => _voyageService);
        _serviceProvider = services.BuildServiceProvider();
    }

    public void Dispose() => _serviceProvider.Dispose();

    private NexusDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<NexusDbContext>()
            .UseInMemoryDatabase(_dbName)
            .Options;
        return new TestDbContext(options);
    }

    private EmbeddingBackgroundService CreateService() =>
        new(_queue, _serviceProvider.GetRequiredService<IServiceScopeFactory>(), _textExtractor, _logger);

    private static EmbeddingJob CreateEmployeeJob(int dbId = 1, int upstreamId = 42, int? resumeNoteId = 100) =>
        new(Source: "employees", DbId: dbId, UpstreamId: upstreamId, Name: "John Doe",
            ResumeNoteId: resumeNoteId, ResumeFilename: "resume.pdf", IsBench: true, Token: "fake-token");

    private async Task<int> SeedEmployeeAsync(string status = "synced")
    {
        using var db = CreateDbContext();
        var emp = new SyncedEmployee
        {
            UpstreamId = 42,
            FullName = "John Doe",
            Email = "john@test.com",
            JobTitle = "Senior Developer",
            Seniority = "Senior",
            MainSkill = ".NET",
            Country = "US",
            HasResume = true,
            ResumeNoteId = 100,
            ResumeFilename = "resume.pdf",
            IsBench = true,
            Status = status,
            SyncedAt = DateTime.UtcNow
        };
        db.SyncedEmployees.Add(emp);
        await db.SaveChangesAsync();
        return emp.Id;
    }

    private async Task<int> SeedCandidateAsync()
    {
        using var db = CreateDbContext();
        var cand = new SyncedCandidate
        {
            UpstreamId = 55,
            FullName = "Jane Smith",
            Email = "jane@test.com",
            HasResume = true,
            ResumeNoteId = 200,
            ResumeFilename = "cv.docx",
            Status = "synced",
            SyncedAt = DateTime.UtcNow
        };
        db.SyncedCandidates.Add(cand);
        await db.SaveChangesAsync();
        return cand.Id;
    }

    private async Task ProcessSingleJobAsync(EmbeddingJob job)
    {
        await _queue.EnqueueAsync(job);
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
        var service = CreateService();

        var executeTask = service.StartAsync(cts.Token);

        while (_queue.PendingCount > 0 && !cts.Token.IsCancellationRequested)
            await Task.Delay(10, cts.Token);

        await Task.Delay(100, cts.Token);
        cts.Cancel();

        try { await service.StopAsync(CancellationToken.None); }
        catch (OperationCanceledException) { }
    }

    [Fact]
    public async Task ProcessJobAsync_should_extract_and_vectorize_successfully()
    {
        var empId = await SeedEmployeeAsync();
        var resumeBytes = new byte[] { 1, 2, 3 };
        var embedding = new float[1024];

        _upstreamApi.GetNoteFileAsync("fake-token", 100).Returns(resumeBytes);
        _textExtractor.ExtractText(resumeBytes, "resume.pdf").Returns("Experienced .NET developer");
        _voyageService.GenerateEmbeddingAsync(Arg.Any<string>(), "voyage-4-large", Arg.Any<CancellationToken>())
            .Returns(embedding);

        await ProcessSingleJobAsync(CreateEmployeeJob(dbId: empId));

        using var db = CreateDbContext();
        var emp = await db.SyncedEmployees.FirstAsync(e => e.Id == empId);
        Assert.Equal("vectorized", emp.Status);
        Assert.False(emp.Failed);

        var embeddingRecord = await db.ResumeEmbeddings
            .FirstOrDefaultAsync(e => e.SourceType == "employees" && e.SourceId == empId);
        Assert.NotNull(embeddingRecord);
        Assert.Equal("Experienced .NET developer", embeddingRecord!.ResumeText);
        Assert.Equal(42, embeddingRecord.UpstreamId);
        Assert.True(embeddingRecord.IsBench);
    }

    [Fact]
    public async Task ProcessJobAsync_should_mark_entity_failed_when_no_resume_note_id()
    {
        var empId = await SeedEmployeeAsync();

        await ProcessSingleJobAsync(CreateEmployeeJob(dbId: empId, resumeNoteId: null));

        using var db = CreateDbContext();
        var emp = await db.SyncedEmployees.FirstAsync(e => e.Id == empId);
        Assert.True(emp.Failed);
        Assert.Equal("No resume note ID", emp.StatusReason);
    }

    [Fact]
    public async Task ProcessJobAsync_should_mark_entity_failed_when_extraction_returns_empty()
    {
        var empId = await SeedEmployeeAsync();
        var resumeBytes = new byte[] { 1, 2, 3 };

        _upstreamApi.GetNoteFileAsync("fake-token", 100).Returns(resumeBytes);
        _textExtractor.ExtractText(resumeBytes, "resume.pdf").Returns(string.Empty);

        await ProcessSingleJobAsync(CreateEmployeeJob(dbId: empId));

        using var db = CreateDbContext();
        var emp = await db.SyncedEmployees.FirstAsync(e => e.Id == empId);
        Assert.True(emp.Failed);
        Assert.Equal("Empty text after extraction", emp.StatusReason);
    }

    [Fact]
    public async Task ProcessJobAsync_should_mark_entity_failed_when_voyage_api_fails()
    {
        var empId = await SeedEmployeeAsync();
        var resumeBytes = new byte[] { 1, 2, 3 };

        _upstreamApi.GetNoteFileAsync("fake-token", 100).Returns(resumeBytes);
        _textExtractor.ExtractText(resumeBytes, "resume.pdf").Returns("Some resume text");
        _voyageService.GenerateEmbeddingAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .ThrowsAsync(new HttpRequestException("Voyage API unavailable"));

        await ProcessSingleJobAsync(CreateEmployeeJob(dbId: empId));

        using var db = CreateDbContext();
        var emp = await db.SyncedEmployees.FirstAsync(e => e.Id == empId);
        Assert.True(emp.Failed);
        Assert.Contains("Voyage API unavailable", emp.StatusReason);
    }

    [Fact]
    public async Task ProcessJobAsync_should_update_existing_embedding_when_present()
    {
        var empId = await SeedEmployeeAsync();
        var resumeBytes = new byte[] { 1, 2, 3 };

        using (var db = CreateDbContext())
        {
            db.ResumeEmbeddings.Add(new ResumeEmbedding
            {
                SourceType = "employees",
                SourceId = empId,
                UpstreamId = 42,
                ResumeText = "Old resume text",
                IsBench = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        _upstreamApi.GetNoteFileAsync("fake-token", 100).Returns(resumeBytes);
        _textExtractor.ExtractText(resumeBytes, "resume.pdf").Returns("Updated resume text");
        _voyageService.GenerateEmbeddingAsync(Arg.Any<string>(), "voyage-4-large", Arg.Any<CancellationToken>())
            .Returns(new float[1024]);

        await ProcessSingleJobAsync(CreateEmployeeJob(dbId: empId));

        using var verifyDb = CreateDbContext();
        var embeddings = await verifyDb.ResumeEmbeddings
            .Where(e => e.SourceType == "employees" && e.SourceId == empId)
            .ToListAsync();
        Assert.Single(embeddings);
        Assert.Equal("Updated resume text", embeddings[0].ResumeText);
        Assert.True(embeddings[0].IsBench);
    }
}
