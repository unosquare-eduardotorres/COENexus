using System.Runtime.CompilerServices;
using System.Threading.Channels;

namespace OperationNexus.Api.Services;

public class EmbeddingJobQueue : IEmbeddingJobQueue
{
    private readonly Channel<EmbeddingJob> _channel =
        Channel.CreateUnbounded<EmbeddingJob>(new UnboundedChannelOptions
        {
            SingleReader = true
        });

    private int _pendingCount;

    public int PendingCount => _pendingCount;

    public async ValueTask EnqueueAsync(EmbeddingJob job, CancellationToken ct = default)
    {
        await _channel.Writer.WriteAsync(job, ct);
        Interlocked.Increment(ref _pendingCount);
    }

    public async IAsyncEnumerable<EmbeddingJob> DequeueAllAsync(
        [EnumeratorCancellation] CancellationToken ct)
    {
        await foreach (var job in _channel.Reader.ReadAllAsync(ct))
        {
            Interlocked.Decrement(ref _pendingCount);
            yield return job;
        }
    }
}
