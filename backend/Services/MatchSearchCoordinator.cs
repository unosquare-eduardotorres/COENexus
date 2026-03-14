using System.Collections.Concurrent;

namespace OperationNexus.Api.Services;

public class MatchSearchCoordinator
{
    private readonly ConcurrentDictionary<string, TaskCompletionSource<string>> _pending = new();

    public TaskCompletionSource<string> CreateConfirmation(string searchId)
    {
        var tcs = new TaskCompletionSource<string>(TaskCreationOptions.RunContinuationsAsynchronously);
        _pending[searchId] = tcs;
        return tcs;
    }

    public bool TryResolve(string searchId, string action)
    {
        if (_pending.TryRemove(searchId, out var tcs))
        {
            tcs.TrySetResult(action);
            return true;
        }
        return false;
    }

    public void TryResolveAll(string action)
    {
        foreach (var key in _pending.Keys.ToList())
        {
            if (_pending.TryRemove(key, out var tcs))
                tcs.TrySetResult(action);
        }
    }

    public void Cancel(string searchId)
    {
        if (_pending.TryRemove(searchId, out var tcs))
            tcs.TrySetCanceled();
    }
}
