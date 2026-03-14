using System.Text.Json.Serialization;

namespace OperationNexus.Api.Models.Upstream;

public class PagedRequest
{
    [JsonPropertyName("columns")]
    public List<ColumnDefinition> Columns { get; set; } = new();

    [JsonPropertyName("searchText")]
    public string SearchText { get; set; } = string.Empty;

    [JsonPropertyName("skip")]
    public int Skip { get; set; }

    [JsonPropertyName("take")]
    public int Take { get; set; } = -1;

    [JsonPropertyName("counter")]
    public int Counter { get; set; }

    [JsonPropertyName("timezoneOffset")]
    public int TimezoneOffset { get; set; } = 360;
}

public class ColumnDefinition
{
    [JsonPropertyName("aggregate")]
    public string Aggregate { get; set; } = "None";

    [JsonPropertyName("dataType")]
    public string DataType { get; set; } = "string";

    [JsonPropertyName("dateDisplayFormat")]
    public string DateDisplayFormat { get; set; } = "YYYY-MM-DD";

    [JsonPropertyName("dateOriginFormat")]
    public string DateOriginFormat { get; set; } = "YYYY-MM-DD";

    [JsonPropertyName("dateTimeDisplayFormat")]
    public string DateTimeDisplayFormat { get; set; } = "YYYY-MM-DDTHH:mm:ss";

    [JsonPropertyName("dateTimeOriginFormat")]
    public string DateTimeOriginFormat { get; set; } = "YYYY-MM-DDTHH:mm:ss";

    [JsonPropertyName("isKey")]
    public bool IsKey { get; set; }

    [JsonPropertyName("isComputed")]
    public bool IsComputed { get; set; }

    [JsonPropertyName("label")]
    public string Label { get; set; } = "";

    [JsonPropertyName("name")]
    public string Name { get; set; } = "";

    [JsonPropertyName("searchable")]
    public bool Searchable { get; set; }

    [JsonPropertyName("sortDirection")]
    public string SortDirection { get; set; } = "None";

    [JsonPropertyName("sortOrder")]
    public int SortOrder { get; set; } = -1;

    [JsonPropertyName("sortable")]
    public bool Sortable { get; set; } = true;

    [JsonPropertyName("visible")]
    public bool Visible { get; set; } = true;

    [JsonPropertyName("filterOperator")]
    public string FilterOperator { get; set; } = "Contains";

    [JsonPropertyName("filterText")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? FilterText { get; set; }

    [JsonPropertyName("filterable")]
    public bool Filterable { get; set; } = true;

    [JsonPropertyName("exportable")]
    public bool Exportable { get; set; } = true;

    [JsonPropertyName("filterArgument")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string[]? FilterArgument { get; set; }
}
