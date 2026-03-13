using System.Text.Json;

namespace OperationNexus.Api.Models.Upstream;

public class PagedResponse
{
    public int Counter { get; set; }
    public IEnumerable<JsonElement[]> Payload { get; set; } = Enumerable.Empty<JsonElement[]>();
    public int FilteredRecordCount { get; set; }
    public int TotalPages { get; set; }
    public int CurrentPage { get; set; }
}
