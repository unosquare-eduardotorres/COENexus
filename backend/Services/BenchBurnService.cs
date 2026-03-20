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
using OperationNexus.Api.Models.Entities;

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
    private readonly string _connectionString;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private static readonly string CROSS_MATCH_PROMPT =
        PromptTemplates.OpusAnalysis.Replace("{{contextBlock}}", PromptTemplates.BenchBurnContextBlock);

    public BenchBurnService(
        NexusDbContext dbContext,
        IVoyageEmbeddingService voyageService,
        IClaudeProxyService claudeProxy,
        IOptions<ClaudeProxySettings> claudeSettings,
        IConfiguration configuration,
        ILogger<BenchBurnService> logger)
    {
        _dbContext = dbContext;
        _voyageService = voyageService;
        _claudeProxy = claudeProxy;
        _claudeSettings = claudeSettings.Value;
        _logger = logger;
        _connectionString = configuration.GetConnectionString("NexusDb")!;
    }

    public async IAsyncEnumerable<BenchBurnEvent> ExecuteAsync(
        BenchBurnRequest request,
        [EnumeratorCancellation] CancellationToken ct)
    {
        var stopwatch = Stopwatch.StartNew();
        var timings = new Dictionary<string, long>();
        var candidateTimings = new ConcurrentBag<CandidateTimingDto>();

        yield return new BenchBurnProgressEvent(new MatchSearchProgress(2, "Loading bench employees and positions..."));

        var phase = Stopwatch.StartNew();

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

        phase.Stop();
        timings["dataLoadMs"] = phase.ElapsedMilliseconds;

        yield return new BenchBurnProgressEvent(new MatchSearchProgress(8, "Computing vector similarities..."));

        phase = Stopwatch.StartNew();

        var similarityMap = await ComputeSimilaritiesAsync(
            request.EmployeeUpstreamIds, request.PositionUpstreamIds, ct);

        if (customPositionMap.Count > 0)
        {
            yield return new BenchBurnProgressEvent(new MatchSearchProgress(12, "Generating embeddings for custom positions..."));
            await ComputeCustomPositionSimilaritiesAsync(
                request.EmployeeUpstreamIds, customPositionMap, similarityMap, ct);
        }

        phase.Stop();
        timings["vectorSimilarityMs"] = phase.ElapsedMilliseconds;

        var pairs = new List<(int empId, int posId)>();
        foreach (var empId in request.EmployeeUpstreamIds)
        foreach (var posId in allPositionUpstreamIds)
            pairs.Add((empId, posId));

        var totalPairs = pairs.Count;
        yield return new BenchBurnProgressEvent(new MatchSearchProgress(15, $"Analyzing {totalPairs} employee×position pairs..."));

        var allResults = new ConcurrentBag<CrossMatchResultDto>();
        var completed = 0;
        var fallbackCount = 0;
        var semaphore = new SemaphoreSlim(_claudeSettings.MaxConcurrency);

        var opusTemplate = request.OpusPromptConfig?.PromptTemplate ?? CROSS_MATCH_PROMPT;
        var opusMaxTokens = request.OpusPromptConfig?.MaxTokens ?? 5120;
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

        phase = Stopwatch.StartNew();

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
                    var posStakeholder = pos?.Stakeholder ?? "";
                    posLabel = $"{posAccount} - {posMainSkill} ({posStakeholder}) [#{posId}]";
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

                var callTimer = Stopwatch.StartNew();

                const int maxRetries = 1;
                CrossMatchParsed? parsed = null;
                Exception? lastEx = null;

                for (var attempt = 0; attempt <= maxRetries; attempt++)
                {
                    try
                    {
                        var response = await _claudeProxy.ChatAsync(model, prompt, opusMaxTokens, opusTemp, ct);
                        var jsonStart = response.IndexOf('{');
                        var jsonEnd = response.LastIndexOf('}');
                        if (jsonStart >= 0 && jsonEnd > jsonStart)
                        {
                            var jsonStr = response[jsonStart..(jsonEnd + 1)];
                            parsed = JsonSerializer.Deserialize<CrossMatchParsed>(jsonStr, JsonOptions);
                            if (parsed != null) break;
                        }
                    }
                    catch (Exception ex)
                    {
                        lastEx = ex;
                        _logger.LogWarning("[BenchBurn] Opus attempt {Attempt} failed for {Emp}×{Pos}: {Err}",
                            attempt + 1, empId, posId, ex.Message);
                        if (attempt < maxRetries)
                            await Task.Delay(1000 * (attempt + 1), ct);
                    }
                }

                callTimer.Stop();

                if (parsed != null)
                {
                    candidateTimings.Add(new CandidateTimingDto
                    {
                        Name = $"{emp?.FullName ?? "Unknown"} × {posLabel}",
                        Phase = "opus",
                        DurationMs = callTimer.ElapsedMilliseconds,
                        Fallback = false,
                    });

                    allResults.Add(new CrossMatchResultDto
                    {
                        EmployeeUpstreamId = empId,
                        EmployeeName = emp?.FullName ?? "Unknown",
                        PositionUpstreamId = posId,
                        PositionLabel = posLabel,
                        MatchScore = parsed.MatchScore,
                        CosineSimilarity = cosine,
                        Scores = parsed.Scores ?? new MatchScoresDto(),
                        Skills = SkillMatchDto.Normalize(parsed.Skills ?? []),
                        Gaps = parsed.Gaps ?? [],
                        Domains = parsed.Domains ?? [],
                        Analysis = parsed.Analysis,
                        Summary = parsed.Summary ?? ""
                    });
                }
                else
                {
                    candidateTimings.Add(new CandidateTimingDto
                    {
                        Name = $"{emp?.FullName ?? "Unknown"} × {posLabel}",
                        Phase = "opus",
                        DurationMs = callTimer.ElapsedMilliseconds,
                        Fallback = true,
                        Error = lastEx?.Message,
                    });
                    Interlocked.Increment(ref fallbackCount);

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

        phase.Stop();
        timings["opusAnalysisMs"] = phase.ElapsedMilliseconds;
        timings["opusCallCount"] = totalPairs;
        timings["opusFallbackCount"] = fallbackCount;
        timings["opusAvgMs"] = totalPairs > 0 ? phase.ElapsedMilliseconds / totalPairs : 0;
        timings["opusMaxConcurrency"] = _claudeSettings.MaxConcurrency;

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
                SearchCost = "$0.00",
                Timings = timings,
                CandidateTimings = candidateTimings.ToList(),
            }
        };

        var session = new MatchSession
        {
            Name = string.IsNullOrWhiteSpace(request.Name)
                ? $"Bench Burn — {DateTime.UtcNow:yyyy-MM-dd HH:mm}"
                : request.Name,
            MatchFlowType = request.MatchFlowType ?? "bench-burn",
            DataSource = "bench",
            TopN = request.TopNPerEmployee,
            SearchMode = "opus",
            JobDescription = "",
            JdSource = request.MatchFlowType ?? "bench-burn",
            Status = "completed",
            CreatedAt = DateTime.UtcNow,
            CompletedAt = DateTime.UtcNow,
            PipelineStatsJson = JsonSerializer.Serialize(result.Stats, JsonOptions),
            ResultsJson = JsonSerializer.Serialize(result, JsonOptions),
        };
        _dbContext.MatchSessions.Add(session);
        await _dbContext.SaveChangesAsync(ct);

        result = result with { SessionId = session.Id };

        yield return new BenchBurnProgressEvent(new MatchSearchProgress(100, "Bench burn analysis complete!"));
        yield return new BenchBurnResultEvent(result);
    }

    public async IAsyncEnumerable<BenchBurnEvent> RetryPairsAsync(
        BenchBurnRetryRequest request,
        [EnumeratorCancellation] CancellationToken ct)
    {
        var stopwatch = Stopwatch.StartNew();

        yield return new BenchBurnProgressEvent(new MatchSearchProgress(5, "Loading original session..."));

        var session = await _dbContext.MatchSessions
            .FirstOrDefaultAsync(s => s.Id == request.SessionId, ct)
            ?? throw new InvalidOperationException($"Session {request.SessionId} not found");

        var originalResult = JsonSerializer.Deserialize<BenchBurnResultDto>(session.ResultsJson ?? "{}", JsonOptions)
            ?? throw new InvalidOperationException("Failed to deserialize session results");

        var empIds = request.Pairs.Select(p => p.EmployeeUpstreamId).Distinct().ToList();
        var posIds = request.Pairs.Select(p => p.PositionUpstreamId).Distinct().ToList();

        var employees = await _dbContext.SyncedEmployees
            .AsNoTracking()
            .Where(e => empIds.Contains(e.UpstreamId))
            .ToListAsync(ct);

        var positions = await _dbContext.SyncedOpenPositions
            .AsNoTracking()
            .Where(p => posIds.Contains(p.UpstreamId))
            .ToListAsync(ct);

        var empLookup = employees.ToDictionary(e => e.UpstreamId);
        var posLookup = positions.ToDictionary(p => p.UpstreamId);

        var embeddingTexts = await _dbContext.ResumeEmbeddings
            .AsNoTracking()
            .Where(re => re.SourceType == "employees"
                && empIds.Contains(re.UpstreamId)
                && re.ResumeText != null)
            .ToDictionaryAsync(re => re.UpstreamId, re => re.ResumeText!, ct);

        var similarityMap = await ComputeSimilaritiesAsync(empIds, posIds, ct);

        yield return new BenchBurnProgressEvent(new MatchSearchProgress(15, $"Re-analyzing {request.Pairs.Count} pairs..."));

        var opusTemplate = request.OpusPromptConfig?.PromptTemplate ?? CROSS_MATCH_PROMPT;
        var opusMaxTokens = request.OpusPromptConfig?.MaxTokens ?? 5120;
        var opusTemp = request.OpusPromptConfig?.Temperature ?? 0.2;
        var model = _claudeSettings.OpusModel;

        var newResults = new ConcurrentBag<CrossMatchResultDto>();
        var candidateTimings = new ConcurrentBag<CandidateTimingDto>();
        var completed = 0;
        var fallbackCount = 0;
        var totalPairs = request.Pairs.Count;
        var semaphore = new SemaphoreSlim(_claudeSettings.MaxConcurrency);

        var tasks = request.Pairs.Select(async pair =>
        {
            await semaphore.WaitAsync(ct);
            try
            {
                ct.ThrowIfCancellationRequested();

                var empId = pair.EmployeeUpstreamId;
                var posId = pair.PositionUpstreamId;
                var emp = empLookup.GetValueOrDefault(empId);
                var pos = posLookup.GetValueOrDefault(posId);
                var cosine = similarityMap.GetValueOrDefault((empId, posId), 0.0);
                var resumeText = embeddingTexts.GetValueOrDefault(empId, "No resume text available");
                var snippet = resumeText.Length > 6000 ? resumeText[..6000] : resumeText;

                var posAccount = pos?.Account ?? "Unknown";
                var posJobTitle = pos?.JobTitle ?? "Unknown";
                var posMainSkill = pos?.MainSkill ?? "Unknown";
                var posJd = pos?.JobDescription ?? "No job description available";
                var posStakeholder = pos?.Stakeholder ?? "";
                var posLabel = $"{posAccount} - {posMainSkill} ({posStakeholder}) [#{posId}]";

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

                var callTimer = Stopwatch.StartNew();

                const int maxRetries = 1;
                CrossMatchParsed? parsed = null;
                Exception? lastEx = null;

                for (var attempt = 0; attempt <= maxRetries; attempt++)
                {
                    try
                    {
                        var response = await _claudeProxy.ChatAsync(model, prompt, opusMaxTokens, opusTemp, ct);
                        var jsonStart = response.IndexOf('{');
                        var jsonEnd = response.LastIndexOf('}');
                        if (jsonStart >= 0 && jsonEnd > jsonStart)
                        {
                            var jsonStr = response[jsonStart..(jsonEnd + 1)];
                            parsed = JsonSerializer.Deserialize<CrossMatchParsed>(jsonStr, JsonOptions);
                            if (parsed != null) break;
                        }
                    }
                    catch (Exception ex)
                    {
                        lastEx = ex;
                        _logger.LogWarning("[BenchBurn/Retry] Opus attempt {Attempt} failed for {Emp}×{Pos}: {Err}",
                            attempt + 1, empId, posId, ex.Message);
                        if (attempt < maxRetries)
                            await Task.Delay(1000 * (attempt + 1), ct);
                    }
                }

                callTimer.Stop();

                if (parsed != null)
                {
                    candidateTimings.Add(new CandidateTimingDto
                    {
                        Name = $"{emp?.FullName ?? "Unknown"} × {posLabel}",
                        Phase = "opus",
                        DurationMs = callTimer.ElapsedMilliseconds,
                        Fallback = false,
                    });

                    newResults.Add(new CrossMatchResultDto
                    {
                        EmployeeUpstreamId = empId,
                        EmployeeName = emp?.FullName ?? "Unknown",
                        PositionUpstreamId = posId,
                        PositionLabel = posLabel,
                        MatchScore = parsed.MatchScore,
                        CosineSimilarity = cosine,
                        Scores = parsed.Scores ?? new MatchScoresDto(),
                        Skills = SkillMatchDto.Normalize(parsed.Skills ?? []),
                        Gaps = parsed.Gaps ?? [],
                        Domains = parsed.Domains ?? [],
                        Analysis = parsed.Analysis,
                        Summary = parsed.Summary ?? ""
                    });
                }
                else
                {
                    candidateTimings.Add(new CandidateTimingDto
                    {
                        Name = $"{emp?.FullName ?? "Unknown"} × {posLabel}",
                        Phase = "opus",
                        DurationMs = callTimer.ElapsedMilliseconds,
                        Fallback = true,
                        Error = lastEx?.Message,
                    });
                    Interlocked.Increment(ref fallbackCount);
                }
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
            var pct = 15 + (int)(75.0 * completed / Math.Max(totalPairs, 1));
            yield return new BenchBurnProgressEvent(new MatchSearchProgress(
                Math.Min(pct, 92),
                $"Re-analyzing pairs... ({completed}/{totalPairs})"));
        }

        await Task.WhenAll(tasks);

        yield return new BenchBurnProgressEvent(new MatchSearchProgress(95, "Merging results..."));

        var retryLookup = newResults.ToDictionary(r => (r.EmployeeUpstreamId, r.PositionUpstreamId));

        var mergedEmployeeResults = new Dictionary<string, List<CrossMatchResultDto>>();
        foreach (var (key, list) in originalResult.EmployeeResults)
        {
            mergedEmployeeResults[key] = list.Select(r =>
            {
                var pairKey = (r.EmployeeUpstreamId, r.PositionUpstreamId);
                return retryLookup.TryGetValue(pairKey, out var replacement) ? replacement : r;
            }).ToList();
        }

        var mergedPositionResults = new Dictionary<string, List<CrossMatchResultDto>>();
        foreach (var (key, list) in originalResult.PositionResults)
        {
            mergedPositionResults[key] = list.Select(r =>
            {
                var pairKey = (r.EmployeeUpstreamId, r.PositionUpstreamId);
                return retryLookup.TryGetValue(pairKey, out var replacement) ? replacement : r;
            }).ToList();
        }

        var originalTimings = originalResult.Stats.CandidateTimings;
        var retryTimingNames = new HashSet<string>(candidateTimings.Select(t => t.Name));
        var mergedTimings = originalTimings
            .Where(t => !retryTimingNames.Contains(t.Name))
            .Concat(candidateTimings)
            .ToList();

        stopwatch.Stop();

        var mergedStats = originalResult.Stats with
        {
            CandidateTimings = mergedTimings,
        };

        var mergedResult = new BenchBurnResultDto
        {
            SessionId = request.SessionId,
            EmployeeResults = mergedEmployeeResults,
            PositionResults = mergedPositionResults,
            Stats = mergedStats,
        };

        session.ResultsJson = JsonSerializer.Serialize(mergedResult, JsonOptions);
        session.PipelineStatsJson = JsonSerializer.Serialize(mergedStats, JsonOptions);
        await _dbContext.SaveChangesAsync(ct);

        yield return new BenchBurnProgressEvent(new MatchSearchProgress(100, "Retry complete!"));
        yield return new BenchBurnResultEvent(mergedResult);
    }

    private async Task<Dictionary<(int empId, int posId), double>> ComputeSimilaritiesAsync(
        List<int> employeeIds, List<int> positionIds, CancellationToken ct)
    {
        var map = new Dictionary<(int, int), double>();
        if (employeeIds.Count == 0 || positionIds.Count == 0) return map;

        await using var conn = new NpgsqlConnection(_connectionString);
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
