using OperationNexus.Api.Services;
using Xunit;

namespace OperationNexus.Tests;

public class EmbeddingJobQueueTests
{
    private readonly EmbeddingJobQueue _queue = new();

    private static EmbeddingJob CreateJob(int upstreamId = 1, string source = "employees") =>
        new(Source: source, DbId: upstreamId, UpstreamId: upstreamId, Name: $"Test-{upstreamId}",
            ResumeNoteId: 100, ResumeFilename: "resume.pdf", IsBench: false, Token: "fake-token");

    [Fact]
    public async Task EnqueueAsync_should_write_job_to_channel()
    {
        var job = CreateJob();

        await _queue.EnqueueAsync(job);

        Assert.Equal(1, _queue.PendingCount);
    }

    [Fact]
    public async Task DequeueAllAsync_should_return_jobs_in_order()
    {
        var job1 = CreateJob(1);
        var job2 = CreateJob(2);
        var job3 = CreateJob(3);

        await _queue.EnqueueAsync(job1);
        await _queue.EnqueueAsync(job2);
        await _queue.EnqueueAsync(job3);

        using var cts = new CancellationTokenSource();
        var dequeued = new List<EmbeddingJob>();

        try
        {
            await foreach (var job in _queue.DequeueAllAsync(cts.Token))
            {
                dequeued.Add(job);
                if (dequeued.Count == 3)
                    cts.Cancel();
            }
        }
        catch (OperationCanceledException) { }

        Assert.Equal(3, dequeued.Count);
        Assert.Equal(1, dequeued[0].UpstreamId);
        Assert.Equal(2, dequeued[1].UpstreamId);
        Assert.Equal(3, dequeued[2].UpstreamId);
    }

    [Fact]
    public async Task PendingCount_should_reflect_queue_depth()
    {
        Assert.Equal(0, _queue.PendingCount);

        await _queue.EnqueueAsync(CreateJob(1));
        Assert.Equal(1, _queue.PendingCount);

        await _queue.EnqueueAsync(CreateJob(2));
        Assert.Equal(2, _queue.PendingCount);

        await _queue.EnqueueAsync(CreateJob(3));
        Assert.Equal(3, _queue.PendingCount);

        using var cts = new CancellationTokenSource();
        var consumed = 0;
        try
        {
            await foreach (var _ in _queue.DequeueAllAsync(cts.Token))
            {
                consumed++;
                if (consumed == 3) cts.Cancel();
            }
        }
        catch (OperationCanceledException) { }

        Assert.Equal(3, consumed);
        Assert.Equal(0, _queue.PendingCount);
    }

    [Fact]
    public async Task DequeueAllAsync_should_block_until_job_available()
    {
        using var cts = new CancellationTokenSource();
        var dequeued = new List<EmbeddingJob>();

        var consumeTask = Task.Run(async () =>
        {
            await foreach (var job in _queue.DequeueAllAsync(cts.Token))
            {
                dequeued.Add(job);
                if (dequeued.Count == 1)
                    cts.Cancel();
            }
        });

        await Task.Delay(50);
        Assert.Empty(dequeued);

        await _queue.EnqueueAsync(CreateJob());

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => consumeTask);
        Assert.Single(dequeued);
    }
}
