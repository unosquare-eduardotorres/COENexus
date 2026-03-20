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

    public int PendingCount => _channel.Reader.Count;

    public ValueTask EnqueueAsync(EmbeddingJob job, CancellationToken ct = default)
        => _channel.Writer.WriteAsync(job, ct);

    public async IAsyncEnumerable<EmbeddingJob> DequeueAllAsync(
        [EnumeratorCancellation] CancellationToken ct)
    {
        await foreach (var job in _channel.Reader.ReadAllAsync(ct))
            yield return job;
    }
}
