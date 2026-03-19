using System.Collections.Concurrent;
using System.Diagnostics;
using System.Runtime.CompilerServices;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Npgsql;
using OperationNexus.Api.Configuration;
using OperationNexus.Api.Data;
using OperationNexus.Api.Models;

namespace OperationNexus.Api.Services;

public abstract record BenchBurnEvent;
public record BenchBurnProgressEvent(MatchSearchProgress Progress) : BenchBurnEvent;
public record BenchBurnResultEvent(BenchBurnResultDto Result) : BenchBurnEvent;

public class BenchBurnService
{
    private readonly NexusDbContext _dbContext;
    private readonly IVoyageEmbeddingService _voyageService;
    private readonly IClaudeProxyService _claudeProxy;
    private readonly ClaudeProxySettings _claudeSettings;
    private readonly ILogger<BenchBurnService> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private const string CROSS_MATCH_PROMPT = @"You are a senior technical recruiter AI performing a cross-match analysis between an employee and an open position.

Open Position:
Account: {{account}}
Job Title: {{jobTitle}}
Main Skill: {{positionMainSkill}}
Job Description:
{{jobDescription}}

Employee Name: {{employeeName}}
Current Title: {{employeeJobTitle}}
Seniority: {{seniority}}
Main Skill: {{employeeMainSkill}}
Country: {{country}}

Resume:
{{resume}}

Analyze this employee's fit for the position. Return a JSON object with this exact structure:
{
  ""matchScore"": <0-100>,
  ""scores"": { ""technical"": <0-100>, ""domain"": <0-100>, ""leadership"": <0-100>, ""softSkills"": <0-100>, ""availability"": <0-100> },
  ""summary"": ""<2-3 sentence executive summary of fit>"",
  ""skills"": [{ ""name"": ""<skill>"", ""status"": ""met|surpassed|partial|missing"", ""years"": <years>, ""priority"": ""required|nice-to-have|optional"" }],
  ""domains"": [{ ""name"": ""<domain>"", ""confidence"": <0-100>, ""evidence"": ""<brief evidence>"" }],
  ""gaps"": [{ ""skill"": ""<gap area>"", ""severity"": ""high|medium|low"", ""note"": ""<explanation>"" }],
  ""analysis"": {
    ""whyRightFit"": ""<detailed narrative on why this employee fits>"",
    ""immediateValue"": ""<what value they bring day one>"",
    ""rampUpEstimate"": ""<realistic ramp-up time>"",
    ""riskFactors"": ""<risks and mitigations>"",
    ""beyondJd"": ""<hidden strengths beyond the JD>"",
    ""leadershipDynamics"": ""<leadership style>"",
    ""industryDepth"": ""<industry knowledge depth>"",
    ""trackRecord"": ""<proof points>"",
    ""culturalFit"": ""<cultural compatibility>"",
    ""retentionPotential"": ""<long-term retention potential>""
  }
}

Return ONLY valid JSON, no markdown fences.";

    public BenchBurnService(
        NexusDbContext dbContext,
        IVoyageEmbeddingService voyageService,
        IClaudeProxyService claudeProxy,
        IOptions<ClaudeProxySettings> claudeSettings,
        ILogger<BenchBurnService> logger)
    {
        _dbContext = dbContext;
        _voyageService = voyageService;
        _claudeProxy = claudeProxy;
        _claudeSettings = claudeSettings.Value;
        _logger = logger;
    }

    public async IAsyncEnumerable<BenchBurnEvent> ExecuteAsync(
        BenchBurnRequest request,
        [EnumeratorCancellation] CancellationToken ct)
    {
        var stopwatch = Stopwatch.StartNew();

        yield return new BenchBurnProgressEvent(new MatchSearchProgress(2, "Loading bench employees and positions..."));

        var employees = await _dbContext.SyncedEmployees
            .AsNoTracking()
            .Where(e => request.EmployeeUpstreamIds.Contains(e.UpstreamId))
            .ToListAsync(ct);

        var positions = await _dbContext.SyncedOpenPositions
            .AsNoTracking()
            .Where(p => request.PositionUpstreamIds.Contains(p.UpstreamId))
            .ToListAsync(ct);

        var allPositionUpstreamIds = request.PositionUpstreamIds.ToList();
        var customPositionMap = new Dictionary<int, CustomPositionInput>();
        if (request.CustomPositions?.Count > 0)
        {
            var customStartId = -1;
            foreach (var cp in request.CustomPositions)
            {
                customPositionMap[customStartId] = cp;
                allPositionUpstreamIds.Add(customStartId);
                customStartId--;
            }
        }

        yield return new BenchBurnProgressEvent(new MatchSearchProgress(8, "Computing vector similarities..."));

        var similarityMap = await ComputeSimilaritiesAsync(
            request.EmployeeUpstreamIds, request.PositionUpstreamIds, ct);

        if (customPositionMap.Count > 0)
        {
            yield return new BenchBurnProgressEvent(new MatchSearchProgress(12, "Generating embeddings for custom positions..."));
            await ComputeCustomPositionSimilaritiesAsync(
                request.EmployeeUpstreamIds, customPositionMap, similarityMap, ct);
        }

        var pairs = new List<(int empId, int posId)>();
        foreach (var empId in request.EmployeeUpstreamIds)
        foreach (var posId in allPositionUpstreamIds)
            pairs.Add((empId, posId));

        var totalPairs = pairs.Count;
        yield return new BenchBurnProgressEvent(new MatchSearchProgress(15, $"Analyzing {totalPairs} employee×position pairs..."));

        var allResults = new ConcurrentBag<CrossMatchResultDto>();
        var completed = 0;
        var semaphore = new SemaphoreSlim(_claudeSettings.MaxConcurrency);

        var opusTemplate = request.OpusPromptConfig?.PromptTemplate ?? CROSS_MATCH_PROMPT;
        var opusMaxTokens = request.OpusPromptConfig?.MaxTokens ?? 4096;
        var opusTemp = request.OpusPromptConfig?.Temperature ?? 0.2;
        var model = _claudeSettings.OpusModel;

        var empLookup = employees.ToDictionary(e => e.UpstreamId);
        var posLookup = positions.ToDictionary(p => p.UpstreamId);

        var embeddingTexts = await _dbContext.ResumeEmbeddings
            .AsNoTracking()
            .Where(re => re.SourceType == "employees"
                && request.EmployeeUpstreamIds.Contains(re.UpstreamId)
                && re.ResumeText != null)
            .ToDictionaryAsync(re => re.UpstreamId, re => re.ResumeText!, ct);

        var tasks = pairs.Select(async pair =>
        {
            await semaphore.WaitAsync(ct);
            try
            {
                ct.ThrowIfCancellationRequested();

                var (empId, posId) = pair;
                var emp = empLookup.GetValueOrDefault(empId);
                var cosine = similarityMap.GetValueOrDefault((empId, posId), 0.0);
                var resumeText = embeddingTexts.GetValueOrDefault(empId, "No resume text available");
                var snippet = resumeText.Length > 6000 ? resumeText[..6000] : resumeText;

                string posAccount, posJobTitle, posMainSkill, posJd, posLabel;
                if (posId < 0 && customPositionMap.TryGetValue(posId, out var custom))
                {
                    posAccount = "Custom";
                    posJobTitle = custom.Name;
                    posMainSkill = custom.Name;
                    posJd = custom.JobDescription;
                    posLabel = $"Custom - {custom.Name}";
                }
                else
                {
                    var pos = posLookup.GetValueOrDefault(posId);
                    posAccount = pos?.Account ?? "Unknown";
                    posJobTitle = pos?.JobTitle ?? "Unknown";
                    posMainSkill = pos?.MainSkill ?? "Unknown";
                    posJd = pos?.JobDescription ?? "No job description available";
                    posLabel = $"{posAccount} - {posMainSkill}";
                }

                var prompt = opusTemplate
                    .Replace("{{account}}", posAccount)
                    .Replace("{{jobTitle}}", posJobTitle)
                    .Replace("{{positionMainSkill}}", posMainSkill)
                    .Replace("{{jobDescription}}", posJd)
                    .Replace("{{employeeName}}", emp?.FullName ?? "Unknown")
                    .Replace("{{employeeJobTitle}}", emp?.JobTitle ?? "Unknown")
                    .Replace("{{seniority}}", emp?.Seniority ?? "Unknown")
                    .Replace("{{employeeMainSkill}}", emp?.MainSkill ?? "Unknown")
                    .Replace("{{country}}", emp?.Country ?? "Unknown")
                    .Replace("{{resume}}", snippet);

                try
                {
                    var response = await _claudeProxy.ChatAsync(model, prompt, opusMaxTokens, opusTemp, ct);

                    var jsonStart = response.IndexOf('{');
                    var jsonEnd = response.LastIndexOf('}');
                    if (jsonStart >= 0 && jsonEnd > jsonStart)
                    {
                        var jsonStr = response[jsonStart..(jsonEnd + 1)];
                        var parsed = JsonSerializer.Deserialize<CrossMatchParsed>(jsonStr, JsonOptions);
                        if (parsed != null)
                        {
                            allResults.Add(new CrossMatchResultDto
                            {
                                EmployeeUpstreamId = empId,
                                EmployeeName = emp?.FullName ?? "Unknown",
                                PositionUpstreamId = posId,
                                PositionLabel = posLabel,
                                MatchScore = parsed.MatchScore,
                                CosineSimilarity = cosine,
                                Scores = parsed.Scores ?? new MatchScoresDto(),
                                Skills = parsed.Skills ?? [],
                                Gaps = parsed.Gaps ?? [],
                                Domains = parsed.Domains ?? [],
                                Analysis = parsed.Analysis,
                                Summary = parsed.Summary ?? ""
                            });
                            return;
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning("[BenchBurn] Sonnet failed for {Emp}×{Pos}: {Err}", empId, posId, ex.Message);
                }

                allResults.Add(new CrossMatchResultDto
                {
                    EmployeeUpstreamId = empId,
                    EmployeeName = emp?.FullName ?? "Unknown",
                    PositionUpstreamId = posId,
                    PositionLabel = posLabel,
                    MatchScore = (int)(cosine * 100),
                    CosineSimilarity = cosine,
                    Scores = new MatchScoresDto
                    {
                        Technical = (int)(cosine * 90),
                        Domain = (int)(cosine * 70),
                        Leadership = 50,
                        SoftSkills = 50,
                        Availability = 100
                    },
                    Summary = "AI analysis unavailable — score based on vector similarity only."
                });
            }
            finally
            {
                semaphore.Release();
                Interlocked.Increment(ref completed);
            }
        }).ToList();

        while (!Task.WhenAll(tasks).IsCompleted)
        {
            await Task.Delay(500, ct);
            var pct = 15 + (int)(80.0 * completed / Math.Max(totalPairs, 1));
            yield return new BenchBurnProgressEvent(new MatchSearchProgress(
                Math.Min(pct, 95),
                $"Analyzing pairs... ({completed}/{totalPairs})"));
        }

        await Task.WhenAll(tasks);

        yield return new BenchBurnProgressEvent(new MatchSearchProgress(96, "Building result matrix..."));

        var resultsList = allResults.ToList();

        var employeeResults = resultsList
            .GroupBy(r => r.EmployeeUpstreamId)
            .ToDictionary(
                g => g.Key.ToString(),
                g => g.OrderByDescending(r => r.MatchScore)
                       .Take(request.TopNPerEmployee)
                       .ToList());

        var positionResults = resultsList
            .GroupBy(r => r.PositionUpstreamId)
            .ToDictionary(
                g => g.Key.ToString(),
                g => g.OrderByDescending(r => r.MatchScore)
                       .Take(request.TopNPerPosition)
                       .ToList());

        stopwatch.Stop();

        var result = new BenchBurnResultDto
        {
            EmployeeResults = employeeResults,
            PositionResults = positionResults,
            Stats = new BenchBurnStatsDto
            {
                TotalPairs = totalPairs,
                Analyzed = resultsList.Count,
                Time = $"{stopwatch.Elapsed.TotalSeconds:F1}s",
                SearchCost = "$0.00"
            }
        };

        yield return new BenchBurnProgressEvent(new MatchSearchProgress(100, "Bench burn analysis complete!"));
        yield return new BenchBurnResultEvent(result);
    }

    private async Task<Dictionary<(int empId, int posId), double>> ComputeSimilaritiesAsync(
        List<int> employeeIds, List<int> positionIds, CancellationToken ct)
    {
        var map = new Dictionary<(int, int), double>();
        if (employeeIds.Count == 0 || positionIds.Count == 0) return map;

        var connStr = _dbContext.Database.GetConnectionString()!;
        await using var conn = new NpgsqlConnection(connStr);
        await conn.OpenAsync(ct);

        var sql = @"
            SELECT e.""UpstreamId"" AS emp_id, p.""UpstreamId"" AS pos_id,
                   1 - (e.""Embedding"" <=> p.""Embedding"") AS similarity
            FROM ""ResumeEmbeddings"" e
            CROSS JOIN ""ResumeEmbeddings"" p
            WHERE e.""SourceType"" = 'employees' AND e.""UpstreamId"" = ANY(@empIds)
              AND p.""SourceType"" = 'open-positions' AND p.""UpstreamId"" = ANY(@posIds)
              AND e.""Embedding"" IS NOT NULL AND p.""Embedding"" IS NOT NULL";

        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("empIds", employeeIds.ToArray());
        cmd.Parameters.AddWithValue("posIds", positionIds.ToArray());

        await using var reader = await cmd.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
        {
            var empId = reader.GetInt32(0);
            var posId = reader.GetInt32(1);
            var similarity = reader.GetDouble(2);
            map[(empId, posId)] = similarity;
        }

        return map;
    }

    private async Task ComputeCustomPositionSimilaritiesAsync(
        List<int> employeeIds,
        Dictionary<int, CustomPositionInput> customPositions,
        Dictionary<(int, int), double> similarityMap,
        CancellationToken ct)
    {
        var empEmbeddings = await _dbContext.ResumeEmbeddings
            .AsNoTracking()
            .Where(re => re.SourceType == "employees"
                && employeeIds.Contains(re.UpstreamId)
                && re.Embedding != null)
            .Select(re => new { re.UpstreamId, re.Embedding })
            .ToListAsync(ct);

        foreach (var (customId, cp) in customPositions)
        {
            var posEmb = await _voyageService.GenerateEmbeddingAsync(cp.JobDescription, "voyage-4-large", ct);

            foreach (var empEmb in empEmbeddings)
            {
                if (empEmb.Embedding == null) continue;
                var empVec = empEmb.Embedding.ToArray();
                var cosine = CosineSimilarity(empVec, posEmb);
                similarityMap[(empEmb.UpstreamId, customId)] = cosine;
            }
        }
    }

    private static double CosineSimilarity(float[] a, float[] b)
    {
        if (a.Length != b.Length) return 0;
        double dot = 0, magA = 0, magB = 0;
        for (int i = 0; i < a.Length; i++)
        {
            dot += a[i] * b[i];
            magA += a[i] * a[i];
            magB += b[i] * b[i];
        }
        var denom = Math.Sqrt(magA) * Math.Sqrt(magB);
        return denom == 0 ? 0 : dot / denom;
    }

    private record CrossMatchParsed
    {
        public int MatchScore { get; init; }
        public MatchScoresDto? Scores { get; init; }
        public string? Summary { get; init; }
        public List<SkillMatchDto>? Skills { get; init; }
        public List<DomainExperienceDto>? Domains { get; init; }
        public List<GapAnalysisDto>? Gaps { get; init; }
        public SonnetAnalysis? Analysis { get; init; }
    }
}
