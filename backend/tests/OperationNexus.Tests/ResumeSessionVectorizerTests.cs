using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using NSubstitute;
using OperationNexus.Api.Data;
using OperationNexus.Api.Models.Entities;
using OperationNexus.Api.Services;
using Xunit;

namespace OperationNexus.Tests;

public class ResumeSessionVectorizerTests : IDisposable
{
    private readonly string _dbName = Guid.NewGuid().ToString();
    private readonly IVoyageEmbeddingService _voyageService = Substitute.For<IVoyageEmbeddingService>();
    private readonly ILogger<ResumeSessionVectorizer> _logger = Substitute.For<ILogger<ResumeSessionVectorizer>>();
    private readonly ServiceProvider _serviceProvider;
    private readonly IResumeSessionVectorizer _vectorizer;

    public ResumeSessionVectorizerTests()
    {
        var services = new ServiceCollection();
        services.AddScoped<NexusDbContext>(sp =>
        {
            var options = new DbContextOptionsBuilder<NexusDbContext>()
                .UseInMemoryDatabase(_dbName)
                .Options;
            return new TestDbContext(options);
        });
        services.AddScoped(_ => _voyageService);
        _serviceProvider = services.BuildServiceProvider();

        var scopeFactory = _serviceProvider.GetRequiredService<IServiceScopeFactory>();
        _vectorizer = new ResumeSessionVectorizer(scopeFactory, _logger);
    }

    public void Dispose() => _serviceProvider.Dispose();

    private NexusDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<NexusDbContext>()
            .UseInMemoryDatabase(_dbName)
            .Options;
        return new TestDbContext(options);
    }

    private async Task<int> SeedSessionAsync(string? resumeText = "Experienced .NET developer with 5 years of backend experience")
    {
        using var db = CreateDbContext();
        var session = new ResumeSession
        {
            Name = "Test Session",
            SourceType = "candidate",
            OriginalResumeText = resumeText,
            UploadStatus = "completed",
            VectorizationStatus = "pending",
            CandidateUpstreamId = 42,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        db.ResumeSessions.Add(session);
        await db.SaveChangesAsync();
        return session.Id;
    }

    [Fact]
    public async Task VectorizeSessionAsync_should_create_embedding_and_link_to_session()
    {
        var sessionId = await SeedSessionAsync();
        _voyageService.GenerateEmbeddingAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(new float[1024]);

        await _vectorizer.VectorizeSessionAsync(sessionId);

        using var db = CreateDbContext();
        var updatedSession = await db.ResumeSessions.FindAsync(sessionId);
        Assert.NotNull(updatedSession);
        Assert.Equal("completed", updatedSession!.VectorizationStatus);
        Assert.NotNull(updatedSession.ResumeEmbeddingId);

        var embedding = await db.ResumeEmbeddings
            .FirstOrDefaultAsync(e => e.SourceType == "resume-session" && e.SourceId == sessionId);
        Assert.NotNull(embedding);
        Assert.Equal(42, embedding!.UpstreamId);
    }

    [Fact]
    public async Task VectorizeSessionAsync_should_set_failed_when_no_resume_text()
    {
        var sessionId = await SeedSessionAsync(resumeText: null);

        await _vectorizer.VectorizeSessionAsync(sessionId);

        using var db = CreateDbContext();
        var updatedSession = await db.ResumeSessions.FindAsync(sessionId);
        Assert.Equal("failed", updatedSession!.VectorizationStatus);
        Assert.Null(updatedSession.ResumeEmbeddingId);
    }

    [Fact]
    public async Task VectorizeSessionAsync_should_skip_when_session_not_found()
    {
        await _vectorizer.VectorizeSessionAsync(999);

        await _voyageService.DidNotReceive().GenerateEmbeddingAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task VectorizeSessionAsync_should_update_existing_embedding_on_revectorize()
    {
        var sessionId = await SeedSessionAsync();
        var firstVector = new float[1024];
        firstVector[0] = 1.0f;
        var secondVector = new float[1024];
        secondVector[0] = 2.0f;

        _voyageService.GenerateEmbeddingAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(firstVector, secondVector);

        await _vectorizer.VectorizeSessionAsync(sessionId);
        await _vectorizer.VectorizeSessionAsync(sessionId);

        using var db = CreateDbContext();
        var embeddingCount = await db.ResumeEmbeddings
            .CountAsync(e => e.SourceType == "resume-session" && e.SourceId == sessionId);
        Assert.Equal(1, embeddingCount);
    }

    [Fact]
    public async Task VectorizeSessionAsync_should_set_failed_when_voyage_throws()
    {
        var sessionId = await SeedSessionAsync();
        _voyageService.GenerateEmbeddingAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns<float[]>(_ => throw new HttpRequestException("Voyage API unavailable"));

        await _vectorizer.VectorizeSessionAsync(sessionId);

        using var db = CreateDbContext();
        var updatedSession = await db.ResumeSessions.FindAsync(sessionId);
        Assert.Equal("failed", updatedSession!.VectorizationStatus);
        Assert.Null(updatedSession.ResumeEmbeddingId);
    }
}
