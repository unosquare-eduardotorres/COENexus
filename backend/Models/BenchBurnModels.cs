namespace OperationNexus.Api.Models;

public record BenchBurnRequest
{
    public List<int> EmployeeUpstreamIds { get; init; } = [];
    public List<int> PositionUpstreamIds { get; init; } = [];
    public int TopNPerEmployee { get; init; } = 5;
    public int TopNPerPosition { get; init; } = 3;
    public PromptConfig? OpusPromptConfig { get; init; }
    public List<CustomPositionInput>? CustomPositions { get; init; }
}

public record CustomPositionInput
{
    public string Name { get; init; } = string.Empty;
    public string JobDescription { get; init; } = string.Empty;
}

public record CrossMatchResultDto
{
    public int EmployeeUpstreamId { get; init; }
    public string EmployeeName { get; init; } = string.Empty;
    public int PositionUpstreamId { get; init; }
    public string PositionLabel { get; init; } = string.Empty;
    public int MatchScore { get; init; }
    public double CosineSimilarity { get; init; }
    public MatchScoresDto Scores { get; init; } = new();
    public List<SkillMatchDto> Skills { get; init; } = [];
    public List<GapAnalysisDto> Gaps { get; init; } = [];
    public List<DomainExperienceDto> Domains { get; init; } = [];
    public SonnetAnalysis? Analysis { get; init; }
    public string Summary { get; init; } = string.Empty;
}

public record BenchBurnResultDto
{
    public Dictionary<string, List<CrossMatchResultDto>> EmployeeResults { get; init; } = new();
    public Dictionary<string, List<CrossMatchResultDto>> PositionResults { get; init; } = new();
    public BenchBurnStatsDto Stats { get; init; } = new();
}

public record BenchBurnStatsDto
{
    public int TotalPairs { get; init; }
    public int Analyzed { get; init; }
    public string Time { get; init; } = string.Empty;
    public string SearchCost { get; init; } = string.Empty;
}
