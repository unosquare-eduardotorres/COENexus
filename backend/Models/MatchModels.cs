using System.Text.Json.Serialization;

namespace OperationNexus.Api.Models;

public record MatchRequest
{
    public string JobDescription { get; init; } = string.Empty;
    public string DataSource { get; init; } = "bench";
    public int TopN { get; init; } = 10;
    public MatchConstraints? Constraints { get; init; }
}

public record MatchConstraints
{
    public string? Seniority { get; init; }
    public string? MainSkill { get; init; }
    public decimal? Salary { get; init; }
    public string? SalaryOperator { get; init; }
    public string? SalaryCurrency { get; init; }
    public string? Country { get; init; }
}

public record FilterOptionsResponse
{
    public List<string> Seniorities { get; init; } = [];
    public List<string> MainSkills { get; init; } = [];
    public List<string> Countries { get; init; } = [];
    public List<string> Currencies { get; init; } = [];
}

public record MatchSearchProgress(int Percent, string Stage);

public class VectorSearchResult
{
    public int SourceId { get; set; }
    public string SourceType { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public double CosineSimilarity { get; set; }
    public string? ResumeText { get; set; }
    public string? Seniority { get; set; }
    public string? MainSkill { get; set; }
    public string? Country { get; set; }
    public decimal? Rate { get; set; }
    public string? Currency { get; set; }
    public bool IsBench { get; set; }
    public string? JobTitle { get; set; }
    public int UpstreamId { get; set; }
}

public record HaikuTriageResult
{
    public bool Relevant { get; init; }
    public int Score { get; init; }
    public string Reason { get; init; } = string.Empty;
}

public record SonnetAnalysis
{
    public string WhyRightFit { get; init; } = string.Empty;
    public string ImmediateValue { get; init; } = string.Empty;
    public string RampUpEstimate { get; init; } = string.Empty;
    public string RiskFactors { get; init; } = string.Empty;
    public string BeyondJd { get; init; } = string.Empty;
    public string LeadershipDynamics { get; init; } = string.Empty;
    public string IndustryDepth { get; init; } = string.Empty;
    public string TrackRecord { get; init; } = string.Empty;
    public string CulturalFit { get; init; } = string.Empty;
    public string RetentionPotential { get; init; } = string.Empty;
}

public record MatchScoresDto
{
    public int Technical { get; init; }
    public int Domain { get; init; }
    public int Leadership { get; init; }
    public int SoftSkills { get; init; }
    public int Availability { get; init; }
}

public record SkillMatchDto
{
    public string Name { get; init; } = string.Empty;
    public string Status { get; init; } = string.Empty;
    public int Years { get; init; }
}

public record DomainExperienceDto
{
    public string Name { get; init; } = string.Empty;
    public int Confidence { get; init; }
    public string Evidence { get; init; } = string.Empty;
}

public record GapAnalysisDto
{
    public string Skill { get; init; } = string.Empty;
    public string Severity { get; init; } = string.Empty;
    public string Note { get; init; } = string.Empty;
}

public record MatchCandidateResult
{
    public int Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Type { get; init; } = string.Empty;
    public string Role { get; init; } = string.Empty;
    public int MatchScore { get; init; }
    public int Years { get; init; }
    public string Location { get; init; } = string.Empty;
    public string Salary { get; init; } = string.Empty;
    public string Availability { get; init; } = string.Empty;
    public MatchScoresDto Scores { get; init; } = new();
    public string Summary { get; init; } = string.Empty;
    public List<SkillMatchDto> Skills { get; init; } = [];
    public List<DomainExperienceDto> Domains { get; init; } = [];
    public List<GapAnalysisDto> Gaps { get; init; } = [];
    public List<string> Leadership { get; init; } = [];
    public List<string> SoftSkills { get; init; } = [];
    public string Seniority { get; init; } = string.Empty;
    public decimal ExpectedRate { get; init; }
    public string Currency { get; init; } = string.Empty;
    public string Country { get; init; } = string.Empty;
    public string MainSkill { get; init; } = string.Empty;
    public bool IsBench { get; init; }
    public SonnetAnalysis? Analysis { get; init; }
}

public record MatchSearchResult
{
    public List<MatchCandidateResult> Candidates { get; init; } = [];
    public PipelineStatsDto Stats { get; init; } = new();
}

public record CandidateTimingDto
{
    public string Name { get; init; } = string.Empty;
    public string Phase { get; init; } = string.Empty;
    public long DurationMs { get; init; }
    public bool Fallback { get; init; }
    public string? Error { get; init; }
}

public record PipelineStatsDto
{
    public string ProfilesScanned { get; init; } = string.Empty;
    public string PreFiltered { get; init; } = string.Empty;
    public string ConstraintsApplied { get; init; } = string.Empty;
    public string HaikuTriage { get; init; } = string.Empty;
    public string SonnetAnalyzed { get; init; } = string.Empty;
    public string SearchCost { get; init; } = string.Empty;
    public string Time { get; init; } = string.Empty;
    public Dictionary<string, long> Timings { get; init; } = new();
    public List<CandidateTimingDto> CandidateTimings { get; init; } = [];
}

public record PoolCountsResponse(int Bench, int Employees, int Candidates, int AllSources);

public record PipelineStageCandidateDto
{
    public int UpstreamId { get; init; }
    public string Name { get; init; } = string.Empty;
    public string SourceType { get; init; } = string.Empty;
    public double CosineSimilarity { get; init; }
    public string? Seniority { get; init; }
    public string? MainSkill { get; init; }
    public string? Country { get; init; }
    public bool IsBench { get; init; }
    public string? EliminationReason { get; init; }
    public int? HaikuScore { get; init; }
}

public record PipelineStagesDto
{
    public List<PipelineStageCandidateDto> VectorResults { get; init; } = [];
    public List<PipelineStageCandidateDto> AfterConstraints { get; init; } = [];
    public List<PipelineStageCandidateDto> AfterHaikuTriage { get; init; } = [];
}

public record MatchSessionDto
{
    public int Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string MatchFlowType { get; init; } = string.Empty;
    public string DataSource { get; init; } = string.Empty;
    public int TopN { get; init; }
    public string JdSource { get; init; } = string.Empty;
    public string Status { get; init; } = string.Empty;
    public DateTime CreatedAt { get; init; }
    public DateTime? CompletedAt { get; init; }
    public int? CandidateCount { get; init; }
    public string? Time { get; init; }
}

public record MatchSessionDetailDto : MatchSessionDto
{
    public string JobDescription { get; init; } = string.Empty;
    public MatchConstraints? Constraints { get; init; }
    public PipelineStatsDto? Stats { get; init; }
    public PipelineStagesDto? PipelineStages { get; init; }
    public List<MatchCandidateResult> Candidates { get; init; } = [];
}

public record CreateSessionRequest : MatchRequest
{
    public string Name { get; init; } = string.Empty;
    public string MatchFlowType { get; init; } = "find-for-position";
    public string JdSource { get; init; } = "custom";
}

[JsonDerivedType(typeof(MatchProgressEvent), "progress")]
[JsonDerivedType(typeof(MatchResultEvent), "result")]
[JsonDerivedType(typeof(MatchPipelineStagesEvent), "pipelineStages")]
[JsonDerivedType(typeof(MatchHaikuConfirmEvent), "haikuConfirm")]
public abstract record MatchEvent;

public record MatchProgressEvent(MatchSearchProgress Progress) : MatchEvent;

public record MatchResultEvent(MatchSearchResult Result) : MatchEvent;

public record MatchPipelineStagesEvent(PipelineStagesDto Stages) : MatchEvent;

public record MatchHaikuConfirmEvent(HaikuConfirmPayload Payload) : MatchEvent;

public record HaikuConfirmPayload
{
    public int RequestedTopN { get; init; }
    public int PassedCount { get; init; }
    public int HighestRejectedScore { get; init; }
    public int LowestPassedScore { get; init; }
    public List<HaikuRejectedCandidate> BestRejected { get; init; } = [];
}

public record HaikuRejectedCandidate
{
    public string Name { get; init; } = string.Empty;
    public int HaikuScore { get; init; }
    public double CosineSimilarity { get; init; }
    public string? Seniority { get; init; }
    public string? MainSkill { get; init; }
}

public record HaikuConfirmRequest
{
    public string Action { get; init; } = "proceed";
}
