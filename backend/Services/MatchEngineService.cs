using System.Collections.Concurrent;
using System.Diagnostics;
using System.Runtime.CompilerServices;
using System.Text.Json;
using System.Threading.Channels;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Npgsql;
using Pgvector;
using OperationNexus.Api.Configuration;
using OperationNexus.Api.Data;
using OperationNexus.Api.Models;
using OperationNexus.Api.Models.Entities;

namespace OperationNexus.Api.Services;

public class MatchEngineService : IMatchEngineService
{
    private readonly NexusDbContext _dbContext;
    private readonly IVoyageEmbeddingService _voyageService;
    private readonly IClaudeProxyService _claudeProxy;
    private readonly ClaudeProxySettings _claudeSettings;
    private readonly MatchSearchCoordinator _coordinator;
    private readonly ILogger<MatchEngineService> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private static readonly string DEFAULT_OPUS_TEMPLATE =
        PromptTemplates.OpusAnalysis.Replace("{{contextBlock}}", PromptTemplates.MatchEngineContextBlock);

    public MatchEngineService(
        NexusDbContext dbContext,
        IVoyageEmbeddingService voyageService,
        IClaudeProxyService claudeProxy,
        IOptions<ClaudeProxySettings> claudeSettings,
        MatchSearchCoordinator coordinator,
        ILogger<MatchEngineService> logger)
    {
        _dbContext = dbContext;
        _voyageService = voyageService;
        _claudeProxy = claudeProxy;
        _claudeSettings = claudeSettings.Value;
        _coordinator = coordinator;
        _logger = logger;
    }

    public async IAsyncEnumerable<MatchEvent> SearchAsync(
        MatchRequest request,
        [EnumeratorCancellation] CancellationToken ct = default)
    {
        var channel = Channel.CreateUnbounded<MatchEvent>();

        var producerTask = Task.Run(async () =>
        {
            try
            {
                await ExecutePipelineAsync(request, channel.Writer, ct);
            }
            finally
            {
                channel.Writer.Complete();
            }
        }, ct);

        await foreach (var evt in channel.Reader.ReadAllAsync(ct))
        {
            yield return evt;
        }

        await producerTask;
    }

    private async Task ExecutePipelineAsync(
        MatchRequest request,
        ChannelWriter<MatchEvent> writer,
        CancellationToken ct)
    {
        var stopwatch = Stopwatch.StartNew();
        var timings = new Dictionary<string, long>();
        var candidateTimings = new ConcurrentBag<CandidateTimingDto>();
        var totalScanned = 0;
        var preFilteredCount = 0;
        var constraintsAppliedCount = 0;
        var haikuTriageCount = 0;

        await writer.WriteAsync(new MatchProgressEvent(new MatchSearchProgress(2, "Initializing quantum data stream...")), ct);

        var phase = Stopwatch.StartNew();
        var jdEmbedding = await _voyageService.GenerateEmbeddingAsync(request.JobDescription, "voyage-4-large", ct);
        var vectorString = $"[{string.Join(",", jdEmbedding)}]";
        phase.Stop();
        timings["embeddingMs"] = phase.ElapsedMilliseconds;
        _logger.LogInformation("[MatchEngine] Phase 1 — JD Embedding: {Ms}ms", phase.ElapsedMilliseconds);

        await writer.WriteAsync(new MatchProgressEvent(new MatchSearchProgress(12, "Extracting metadata from quantum foam...")), ct);

        phase = Stopwatch.StartNew();
        var sourceFilterSql = request.DataSource switch
        {
            "bench" => "AND re.\"SourceType\" = 'employees' AND re.\"IsBench\" = true",
            "all-employees" => "AND re.\"SourceType\" = 'employees'",
            "candidates" => "AND re.\"SourceType\" = 'candidates'",
            _ => ""
        };

        var (constraintSql, constraintParams) = BuildAdvancedConstraintSql(request.Constraints);
        _logger.LogInformation("[MatchEngine] Constraint SQL: {Sql}, Params: {Params}",
            constraintSql,
            string.Join(", ", constraintParams.Select(p => $"{p.ParameterName}={p.Value}")));
        var candidateUpstreamIds = (request.CandidateUpstreamIds ?? [])
            .Distinct()
            .ToList();
        var hasCandidateContinuation = candidateUpstreamIds.Count > 0;
        var vectorResults = new List<VectorSearchRaw>();

        if (hasCandidateContinuation)
        {
            var continuationOrder = candidateUpstreamIds
                .Select((id, index) => new { id, index })
                .ToDictionary(x => x.id, x => x.index);

            IQueryable<ResumeEmbedding> continuationQuery = _dbContext.ResumeEmbeddings
                .AsNoTracking()
                .Where(re => re.Embedding != null && candidateUpstreamIds.Contains(re.UpstreamId));

            continuationQuery = request.DataSource switch
            {
                "bench" => continuationQuery.Where(re => re.SourceType == "employees" && re.IsBench),
                "all-employees" => continuationQuery.Where(re => re.SourceType == "employees"),
                "candidates" => continuationQuery.Where(re => re.SourceType == "candidates"),
                _ => continuationQuery
            };

            var continuationEmbeddings = await continuationQuery.ToListAsync(ct);
            vectorResults = continuationEmbeddings
                .OrderBy(re => continuationOrder.GetValueOrDefault(re.UpstreamId, int.MaxValue))
                .Select(re => new VectorSearchRaw
                {
                    SourceId = re.SourceId,
                    SourceType = re.SourceType,
                    ResumeText = re.ResumeText,
                    IsBench = re.IsBench,
                    UpstreamId = re.UpstreamId,
                    CosineSimilarity = 1.0
                })
                .ToList();

            phase.Stop();
            timings["vectorSearchMs"] = phase.ElapsedMilliseconds;
            _logger.LogInformation(
                "[MatchEngine] Phase 2 — Vector Search skipped (continuation mode): {Ms}ms ({Count} results from upstream IDs)",
                phase.ElapsedMilliseconds,
                vectorResults.Count);
        }
        else
        {
            var vectorLimit = request.SearchMode switch
            {
                "vector" => request.TopN,
                "haiku" => request.TopN * 3,
                _ => 50
            };

            var sql = $@"
            SELECT re.""SourceId"", re.""SourceType"", re.""ResumeText"", re.""IsBench"", re.""UpstreamId"",
                   1 - (re.""Embedding"" <=> '{vectorString}'::vector) AS ""CosineSimilarity""
            FROM ""ResumeEmbeddings"" re
            WHERE re.""Embedding"" IS NOT NULL
            {sourceFilterSql}
            {constraintSql}
            ORDER BY re.""Embedding"" <=> '{vectorString}'::vector
            LIMIT {vectorLimit}";

            var conn = _dbContext.Database.GetDbConnection();
            if (conn.State != System.Data.ConnectionState.Open)
                await conn.OpenAsync(ct);

            await using (var cmd = new NpgsqlCommand(sql, (NpgsqlConnection)conn))
            {
                foreach (var p in constraintParams)
                    cmd.Parameters.Add(p);
                await using var reader = await cmd.ExecuteReaderAsync(ct);
                while (await reader.ReadAsync(ct))
                {
                    vectorResults.Add(new VectorSearchRaw
                    {
                        SourceId = reader.GetInt32(reader.GetOrdinal("SourceId")),
                        SourceType = reader.GetString(reader.GetOrdinal("SourceType")),
                        ResumeText = reader.IsDBNull(reader.GetOrdinal("ResumeText")) ? null : reader.GetString(reader.GetOrdinal("ResumeText")),
                        IsBench = reader.GetBoolean(reader.GetOrdinal("IsBench")),
                        UpstreamId = reader.GetInt32(reader.GetOrdinal("UpstreamId")),
                        CosineSimilarity = reader.GetDouble(reader.GetOrdinal("CosineSimilarity"))
                    });
                }
            }

            phase.Stop();
            timings["vectorSearchMs"] = phase.ElapsedMilliseconds;
            _logger.LogInformation("[MatchEngine] Phase 2 — Vector Search: {Ms}ms ({Count} results)", phase.ElapsedMilliseconds, vectorResults.Count);
        }

        phase = Stopwatch.StartNew();
        totalScanned = await _dbContext.ResumeEmbeddings
            .CountAsync(re => re.Embedding != null, ct);
        phase.Stop();
        timings["totalCountMs"] = phase.ElapsedMilliseconds;
        _logger.LogInformation("[MatchEngine] Phase 3 — Total Count: {Ms}ms ({Total} profiles)", phase.ElapsedMilliseconds, totalScanned);

        preFilteredCount = vectorResults.Count;

        await writer.WriteAsync(new MatchProgressEvent(new MatchSearchProgress(25, "Interfacing with requisition singularity...")), ct);

        phase = Stopwatch.StartNew();
        var enriched = new List<VectorSearchResult>();
        foreach (var vr in vectorResults)
        {
            var result = new VectorSearchResult
            {
                SourceId = vr.SourceId,
                SourceType = vr.SourceType,
                ResumeText = vr.ResumeText,
                IsBench = vr.IsBench,
                CosineSimilarity = vr.CosineSimilarity,
                UpstreamId = vr.UpstreamId
            };

            if (vr.SourceType == "employees")
            {
                var emp = await _dbContext.SyncedEmployees
                    .FirstOrDefaultAsync(e => e.UpstreamId == vr.UpstreamId, ct);
                if (emp != null)
                {
                    result.Name = emp.FullName;
                    result.Seniority = emp.Seniority;
                    result.MainSkill = emp.MainSkill;
                    result.Country = emp.Country;
                    result.Rate = emp.Rate;
                    result.Currency = emp.SalaryCurrency;
                    result.JobTitle = emp.JobTitle;
                    result.CandidateStatus = "Employee";
                    result.GrossMonthlySalary = emp.GrossMonthlySalary;
                }
            }
            else if (vr.SourceType == "candidates")
            {
                var cand = await _dbContext.SyncedCandidates
                    .FirstOrDefaultAsync(c => c.UpstreamId == vr.UpstreamId, ct);
                if (cand != null)
                {
                    result.Name = cand.FullName;
                    result.Seniority = cand.Seniority;
                    result.MainSkill = cand.MainSkill;
                    result.Country = cand.Country;
                    result.Rate = cand.CurrentSalary;
                    result.Currency = cand.SalaryCurrency;
                    result.CandidateStatus = cand.CandidateStatus;
                    result.SalaryExpectations = cand.SalaryExpectations;
                    result.SalaryExpectationsCurrency = cand.SalaryExpectationsCurrency;
                    result.LastStatusUpdate = cand.LastStatusUpdate;
                }
            }

            enriched.Add(result);
        }

        phase.Stop();
        timings["enrichmentMs"] = phase.ElapsedMilliseconds;
        _logger.LogInformation("[MatchEngine] Phase 4 — Metadata Enrichment: {Ms}ms", phase.ElapsedMilliseconds);

        var vectorStageCandidates = enriched.Select(c => new PipelineStageCandidateDto
        {
            UpstreamId = c.UpstreamId,
            Name = c.Name,
            SourceType = c.SourceType,
            CosineSimilarity = c.CosineSimilarity,
            Seniority = c.Seniority,
            MainSkill = c.MainSkill,
            Country = c.Country,
            IsBench = c.IsBench,
        }).ToList();

        await writer.WriteAsync(new MatchProgressEvent(new MatchSearchProgress(35, "Deconstructing role into eigenstates...")), ct);

        phase = Stopwatch.StartNew();
        var afterConstraints = enriched;
        constraintsAppliedCount = afterConstraints.Count;
        phase.Stop();
        timings["constraintsMs"] = phase.ElapsedMilliseconds;
        if (hasCandidateContinuation)
        {
            _logger.LogInformation(
                "[MatchEngine] Phase 5 — Constraints skipped (continuation mode): {Count} pre-filtered results",
                constraintsAppliedCount);
        }
        else
        {
            _logger.LogInformation(
                "[MatchEngine] Phase 5 — Constraints applied at SQL level: {Count} results already filtered",
                constraintsAppliedCount);
        }

        var constraintsStageCandidates = enriched.Select(c => new PipelineStageCandidateDto
        {
            UpstreamId = c.UpstreamId,
            Name = c.Name,
            SourceType = c.SourceType,
            CosineSimilarity = c.CosineSimilarity,
            Seniority = c.Seniority,
            MainSkill = c.MainSkill,
            Country = c.Country,
            IsBench = c.IsBench,
            EliminationReason = null,
        }).ToList();

        if (request.SearchMode == "vector")
        {
            var emptyArr = JsonSerializer.Deserialize<JsonElement>("[]");
            var vectorOnlyResults = enriched
                .OrderByDescending(c => c.CosineSimilarity)
                .Take(request.TopN)
                .Select((c, i) => new MatchCandidateResult
                {
                    Id = c.UpstreamId,
                    Name = c.Name ?? "Unknown",
                    Type = c.SourceType == "employees" ? "employee" : "candidate",
                    Role = c.JobTitle ?? "Unknown",
                    MatchScore = (int)(c.CosineSimilarity * 100),
                    Summary = $"Vector similarity: {c.CosineSimilarity:P1}",
                    Seniority = c.Seniority ?? "",
                    ExpectedRate = c.Rate ?? 0,
                    Currency = c.Currency ?? "",
                    Country = c.Country ?? "",
                    MainSkill = c.MainSkill ?? "",
                    IsBench = c.IsBench,
                    CandidateStatus = c.CandidateStatus ?? (c.SourceType == "employees" ? "Employee" : null),
                    SalaryExpectations = c.SalaryExpectations ?? 0,
                    SalaryExpectationsCurrency = c.SalaryExpectationsCurrency ?? "",
                    LastStatusUpdate = c.LastStatusUpdate?.ToString("yyyy-MM-dd"),
                    Leadership = emptyArr,
                    SoftSkills = emptyArr,
                    Scores = new MatchScoresDto
                    {
                        Technical = (int)(c.CosineSimilarity * 90),
                        Domain = (int)(c.CosineSimilarity * 70),
                        Leadership = 50,
                        SoftSkills = 50,
                        Availability = c.IsBench ? 100 : 70
                    }
                })
                .ToList();

            stopwatch.Stop();
            var vectorPipelineStats = new PipelineStatsDto
            {
                ProfilesScanned = totalScanned.ToString("N0"),
                PreFiltered = preFilteredCount.ToString(),
                ConstraintsApplied = constraintsAppliedCount.ToString(),
                HaikuTriage = "Skipped",
                SonnetAnalyzed = "Skipped",
                SearchCost = "$0.00",
                Time = $"{stopwatch.Elapsed.TotalSeconds:F1}s",
                Timings = timings,
                CandidateTimings = []
            };

            var vectorPipelineStages = new PipelineStagesDto
            {
                VectorResults = vectorStageCandidates,
                AfterConstraints = constraintsStageCandidates,
                AfterHaikuTriage = [],
            };

            await writer.WriteAsync(new MatchProgressEvent(new MatchSearchProgress(100, "Vector search complete!")), ct);
            await writer.WriteAsync(new MatchPipelineStagesEvent(vectorPipelineStages), ct);
            await writer.WriteAsync(new MatchResultEvent(new MatchSearchResult
            {
                Candidates = vectorOnlyResults,
                Stats = vectorPipelineStats
            }), ct);
            return;
        }

        await writer.WriteAsync(new MatchProgressEvent(new MatchSearchProgress(45, "Mapping requirement vectors onto neural fabric...")), ct);

        phase = Stopwatch.StartNew();
        var haikuFallbackCount = 0;
        var haikuScores = new ConcurrentDictionary<int, int>();
        var triaged = new ConcurrentBag<(VectorSearchResult Candidate, int Score)>();
        var haikuCompleted = 0;
        var semaphore = new SemaphoreSlim(_claudeSettings.HaikuMaxConcurrency);
        var haikuTemplate = request.HaikuPromptConfig?.PromptTemplate;
        var haikuMaxTokens = request.HaikuPromptConfig?.MaxTokens ?? 100;
        var haikuTemp = request.HaikuPromptConfig?.Temperature ?? 0.1;

        var haikuSystemPrompt = $@"Assess whether candidates are relevant for this role. Use ONLY the job description requirements — do not invent criteria.

Job Description:
{request.JobDescription}

SCORING RULES:
- 70-100: Core skills and experience level clearly match the JD requirements
- 40-69: Some relevant skills but notable gaps in requirements or seniority
- 0-39: Fundamentally different skill set, wrong domain, or wrong experience level
- Set ""relevant"": true ONLY if score >= 40

REJECT fast when:
- Primary tech stack is completely different (e.g., JD needs Java backend, resume is pure frontend React)
- Seniority mismatch > 2 levels (e.g., JD needs Senior/Lead, candidate is Junior)
- Domain is unrelated with no transferable skills

Respond in JSON only: {{""relevant"": true/false, ""score"": 0-100, ""reason"": ""one sentence""}}";

        var haikuTasks = afterConstraints.Select(async (candidate, i) =>
        {
            await semaphore.WaitAsync(ct);
            try
            {
                ct.ThrowIfCancellationRequested();
                var resumeSnippet = (candidate.ResumeText ?? "").Length > 2000
                    ? candidate.ResumeText![..2000]
                    : candidate.ResumeText ?? "No resume text available";

                string haikuUserPrompt;
                if (haikuTemplate != null)
                {
                    haikuUserPrompt = haikuTemplate
                        .Replace("{{jobDescription}}", request.JobDescription)
                        .Replace("{{resume}}", resumeSnippet)
                        .Replace("{{candidateName}}", candidate.Name ?? "Unknown")
                        .Replace("{{jobTitle}}", candidate.JobTitle ?? "Unknown")
                        .Replace("{{seniority}}", candidate.Seniority ?? "Unknown")
                        .Replace("{{mainSkill}}", candidate.MainSkill ?? "Unknown")
                        .Replace("{{country}}", candidate.Country ?? "Unknown");
                }
                else
                {
                    haikuUserPrompt = $@"Candidate: {candidate.Name ?? "Unknown"}
Title: {candidate.JobTitle ?? "Unknown"}
Seniority: {candidate.Seniority ?? "Unknown"}
Main Skill: {candidate.MainSkill ?? "Unknown"}
Country: {candidate.Country ?? "Unknown"}

Resume:
{resumeSnippet}";
                }

                var callTimer = Stopwatch.StartNew();
                try
                {
                    var haikuResponse = await _claudeProxy.ChatAsync(
                        _claudeSettings.HaikuModel, haikuUserPrompt, haikuMaxTokens, haikuTemp,
                        systemPrompt: haikuTemplate == null ? haikuSystemPrompt : null, ct: ct);
                    callTimer.Stop();

                    candidateTimings.Add(new CandidateTimingDto
                    {
                        Name = candidate.Name ?? "Unknown",
                        Phase = "haiku",
                        DurationMs = callTimer.ElapsedMilliseconds,
                        Fallback = false
                    });
                    _logger.LogInformation("[MatchEngine] Haiku [{I}/{Total}] {Name}: {Ms}ms",
                        i + 1, afterConstraints.Count, candidate.Name, callTimer.ElapsedMilliseconds);

                    var jsonStart = haikuResponse.IndexOf('{');
                    var jsonEnd = haikuResponse.LastIndexOf('}');
                    if (jsonStart >= 0 && jsonEnd > jsonStart)
                    {
                        var jsonStr = haikuResponse[jsonStart..(jsonEnd + 1)];
                        var triage = JsonSerializer.Deserialize<HaikuTriageResult>(jsonStr, JsonOptions);
                        if (triage != null)
                        {
                            haikuScores[candidate.UpstreamId] = triage.Score;
                            if (triage is { Relevant: true, Score: >= 40 })
                                triaged.Add((candidate, triage.Score));
                        }
                    }
                }
                catch (Exception ex)
                {
                    callTimer.Stop();
                    Interlocked.Increment(ref haikuFallbackCount);
                    candidateTimings.Add(new CandidateTimingDto
                    {
                        Name = candidate.Name ?? "Unknown",
                        Phase = "haiku",
                        DurationMs = callTimer.ElapsedMilliseconds,
                        Fallback = true,
                        Error = ex.Message
                    });
                    _logger.LogWarning("[MatchEngine] Haiku FALLBACK [{I}/{Total}] {Name}: {Ms}ms — {Err}",
                        i + 1, afterConstraints.Count, candidate.Name, callTimer.ElapsedMilliseconds, ex.Message);
                    var fallbackScore = (int)(candidate.CosineSimilarity * 80);
                    haikuScores[candidate.UpstreamId] = fallbackScore;
                    triaged.Add((candidate, fallbackScore));
                }
            }
            finally
            {
                semaphore.Release();
                var completed = Interlocked.Increment(ref haikuCompleted);
                var haikuPercent = 45 + (int)(25.0 * completed / afterConstraints.Count);
                await writer.WriteAsync(new MatchProgressEvent(new MatchSearchProgress(
                    Math.Min(haikuPercent, 70),
                    "Calculating cosine similarity across dimensions...")), ct);
            }
        }).ToList();

        await Task.WhenAll(haikuTasks);
        phase.Stop();
        timings["haikuTriageMs"] = phase.ElapsedMilliseconds;
        timings["haikuCallCount"] = afterConstraints.Count;
        timings["haikuFallbackCount"] = haikuFallbackCount;
        timings["haikuAvgMs"] = afterConstraints.Count > 0 ? phase.ElapsedMilliseconds / afterConstraints.Count : 0;
        timings["haikuMaxConcurrency"] = _claudeSettings.HaikuMaxConcurrency;
        _logger.LogInformation("[MatchEngine] Phase 6 — Haiku Triage: {Ms}ms ({Count} calls, {Fallbacks} fallbacks, concurrency={Concurrency})",
            phase.ElapsedMilliseconds, afterConstraints.Count, haikuFallbackCount, _claudeSettings.HaikuMaxConcurrency);

        haikuTriageCount = triaged.Count;

        if (triaged.Count < request.TopN)
        {
            var triagedUpstreamIdsForConfirm = new HashSet<int>(triaged.Select(t => t.Candidate.UpstreamId));
            var rejected = afterConstraints
                .Where(c => !triagedUpstreamIdsForConfirm.Contains(c.UpstreamId))
                .Select(c => new HaikuRejectedCandidate
                {
                    Name = c.Name ?? "Unknown",
                    HaikuScore = haikuScores.GetValueOrDefault(c.UpstreamId),
                    CosineSimilarity = c.CosineSimilarity,
                    Seniority = c.Seniority,
                    MainSkill = c.MainSkill,
                })
                .OrderByDescending(r => r.HaikuScore)
                .Take(request.TopN - triaged.Count)
                .ToList();

            if (rejected.Count > 0)
            {
                var searchId = Guid.NewGuid().ToString();
                var confirmTcs = _coordinator.CreateConfirmation(searchId);

                await writer.WriteAsync(new MatchHaikuConfirmEvent(new HaikuConfirmPayload
                {
                    RequestedTopN = request.TopN,
                    PassedCount = triaged.Count,
                    HighestRejectedScore = rejected.FirstOrDefault()?.HaikuScore ?? 0,
                    LowestPassedScore = triaged.Any() ? triaged.Min(t => t.Score) : 0,
                    BestRejected = rejected,
                }), ct);

                string decision;
                try
                {
                    using var timeoutCts = new CancellationTokenSource(TimeSpan.FromMinutes(2));
                    using var linked = CancellationTokenSource.CreateLinkedTokenSource(ct, timeoutCts.Token);
                    decision = await confirmTcs.Task.WaitAsync(linked.Token);
                }
                catch (OperationCanceledException)
                {
                    decision = "proceed";
                }

                if (decision == "include-all")
                {
                    foreach (var rej in rejected)
                    {
                        var candidate = afterConstraints.First(c => c.Name == rej.Name);
                        triaged.Add((candidate, rej.HaikuScore));
                    }
                    haikuTriageCount = triaged.Count;
                }
            }
        }

        var topCandidates = triaged
            .OrderByDescending(t => t.Score)
            .Take(request.TopN)
            .ToList();

        if (request.SearchMode == "haiku")
        {
            var emptyJsonArr = JsonSerializer.Deserialize<JsonElement>("[]");
            var haikuOnlyResults = topCandidates
                .Select((item, i) => new MatchCandidateResult
                {
                    Id = item.Candidate.UpstreamId,
                    Name = item.Candidate.Name ?? "Unknown",
                    Type = item.Candidate.SourceType == "employees" ? "employee" : "candidate",
                    Role = item.Candidate.JobTitle ?? "Unknown",
                    MatchScore = item.Score,
                    Summary = $"Haiku relevance score: {item.Score}%",
                    Seniority = item.Candidate.Seniority ?? "",
                    ExpectedRate = item.Candidate.Rate ?? 0,
                    Currency = item.Candidate.Currency ?? "",
                    Country = item.Candidate.Country ?? "",
                    MainSkill = item.Candidate.MainSkill ?? "",
                    IsBench = item.Candidate.IsBench,
                    CandidateStatus = item.Candidate.CandidateStatus ?? (item.Candidate.SourceType == "employees" ? "Employee" : null),
                    SalaryExpectations = item.Candidate.SalaryExpectations ?? 0,
                    SalaryExpectationsCurrency = item.Candidate.SalaryExpectationsCurrency ?? "",
                    LastStatusUpdate = item.Candidate.LastStatusUpdate?.ToString("yyyy-MM-dd"),
                    Leadership = emptyJsonArr,
                    SoftSkills = emptyJsonArr,
                    Scores = new MatchScoresDto
                    {
                        Technical = (int)(item.Candidate.CosineSimilarity * 90),
                        Domain = (int)(item.Candidate.CosineSimilarity * 70),
                        Leadership = 50,
                        SoftSkills = 50,
                        Availability = item.Candidate.IsBench ? 100 : 70
                    }
                })
                .ToList();

            stopwatch.Stop();

            var triagedUpstreamIdsHaiku = new HashSet<int>(triaged.Select(t => t.Candidate.UpstreamId));
            var haikuStageCandidatesForMode = afterConstraints.Select(c =>
            {
                var score = haikuScores.GetValueOrDefault(c.UpstreamId);
                var kept = triagedUpstreamIdsHaiku.Contains(c.UpstreamId);
                return new PipelineStageCandidateDto
                {
                    UpstreamId = c.UpstreamId,
                    Name = c.Name,
                    SourceType = c.SourceType,
                    CosineSimilarity = c.CosineSimilarity,
                    Seniority = c.Seniority,
                    MainSkill = c.MainSkill,
                    Country = c.Country,
                    IsBench = c.IsBench,
                    HaikuScore = score,
                    EliminationReason = kept ? null : $"Haiku score: {score} — below threshold",
                };
            }).ToList();

            var haikuPipelineStats = new PipelineStatsDto
            {
                ProfilesScanned = totalScanned.ToString("N0"),
                PreFiltered = preFilteredCount.ToString(),
                ConstraintsApplied = constraintsAppliedCount.ToString(),
                HaikuTriage = haikuTriageCount.ToString(),
                SonnetAnalyzed = "Skipped",
                SearchCost = "$0.00",
                Time = $"{stopwatch.Elapsed.TotalSeconds:F1}s",
                Timings = timings,
                CandidateTimings = candidateTimings.ToList()
            };

            var haikuPipelineStages = new PipelineStagesDto
            {
                VectorResults = vectorStageCandidates,
                AfterConstraints = constraintsStageCandidates,
                AfterHaikuTriage = haikuStageCandidatesForMode,
            };

            await writer.WriteAsync(new MatchProgressEvent(new MatchSearchProgress(100, "Haiku triage complete!")), ct);
            await writer.WriteAsync(new MatchPipelineStagesEvent(haikuPipelineStages), ct);
            await writer.WriteAsync(new MatchResultEvent(new MatchSearchResult
            {
                Candidates = haikuOnlyResults,
                Stats = haikuPipelineStats
            }), ct);
            return;
        }

        await writer.WriteAsync(new MatchProgressEvent(new MatchSearchProgress(70, "Infusing latent space with enriched context...")), ct);

        phase = Stopwatch.StartNew();
        var sonnetFallbackCount = 0;
        var results = new ConcurrentBag<MatchCandidateResult>();
        var sonnetCompleted = 0;
        var sonnetSemaphore = new SemaphoreSlim(_claudeSettings.MaxConcurrency);
        var opusTemplate = request.OpusPromptConfig?.PromptTemplate ?? DEFAULT_OPUS_TEMPLATE;
        if (request.OpusPromptConfig?.ContextBlock != null)
            opusTemplate = opusTemplate.Replace("{{contextBlock}}", request.OpusPromptConfig.ContextBlock);
        var opusMaxTokens = request.OpusPromptConfig?.MaxTokens ?? 5120;
        var opusTemp = request.OpusPromptConfig?.Temperature ?? 0.2;
        var model = request.SearchMode == "opus"
            ? _claudeSettings.OpusModel
            : _claudeSettings.SonnetModel;

        var sonnetTasks = topCandidates.Select(async (item, i) =>
        {
            await sonnetSemaphore.WaitAsync(ct);
            try
            {
                ct.ThrowIfCancellationRequested();
                var (candidate, _) = item;
                var resumeSnippet = (candidate.ResumeText ?? "").Length > 6000
                    ? candidate.ResumeText![..6000]
                    : candidate.ResumeText ?? "No resume text available";

                var sonnetPrompt = opusTemplate
                    .Replace("{{jobDescription}}", request.JobDescription)
                    .Replace("{{candidateName}}", candidate.Name ?? "Unknown")
                    .Replace("{{jobTitle}}", candidate.JobTitle ?? "Unknown")
                    .Replace("{{seniority}}", candidate.Seniority ?? "Unknown")
                    .Replace("{{mainSkill}}", candidate.MainSkill ?? "Unknown")
                    .Replace("{{country}}", candidate.Country ?? "Unknown")
                    .Replace("{{rate}}", candidate.Rate?.ToString() ?? "Unknown")
                    .Replace("{{currency}}", candidate.Currency ?? "")
                    .Replace("{{isBench}}", candidate.IsBench.ToString())
                    .Replace("{{sourceType}}", candidate.SourceType)
                    .Replace("{{resume}}", resumeSnippet)
                    .Replace("{{salaryDisplay}}", candidate.Rate != null ? $"${candidate.Rate}/hr" : "Unknown")
                    .Replace("{{availabilityDisplay}}", candidate.IsBench ? "Immediately" : "2-4 weeks");

                var callTimer = Stopwatch.StartNew();
                try
                {
                    var sonnetResponse = await _claudeProxy.ChatAsync(
                        model, sonnetPrompt, opusMaxTokens, opusTemp, ct: ct);
                    callTimer.Stop();

                    candidateTimings.Add(new CandidateTimingDto
                    {
                        Name = candidate.Name ?? "Unknown",
                        Phase = "sonnet",
                        DurationMs = callTimer.ElapsedMilliseconds,
                        Fallback = false
                    });
                    _logger.LogInformation("[MatchEngine] Sonnet [{I}/{Total}] {Name}: {Ms}ms",
                        i + 1, topCandidates.Count, candidate.Name, callTimer.ElapsedMilliseconds);

                    var jsonStart = sonnetResponse.IndexOf('{');
                    var jsonEnd = sonnetResponse.LastIndexOf('}');
                    if (jsonStart >= 0 && jsonEnd > jsonStart)
                    {
                        var jsonStr = sonnetResponse[jsonStart..(jsonEnd + 1)];
                        var parsed = JsonSerializer.Deserialize<MatchCandidateResult>(jsonStr, JsonOptions);
                        if (parsed != null)
                        {
                            results.Add(parsed with
                            {
                                Id = candidate.UpstreamId,
                                Name = candidate.Name ?? parsed.Name,
                                Type = candidate.SourceType == "employees" ? "employee" : "candidate",
                                Seniority = candidate.Seniority ?? parsed.Seniority,
                                ExpectedRate = candidate.Rate ?? parsed.ExpectedRate,
                                Currency = candidate.Currency ?? parsed.Currency,
                                Country = candidate.Country ?? parsed.Country,
                                MainSkill = candidate.MainSkill ?? parsed.MainSkill,
                                IsBench = candidate.IsBench,
                                CandidateStatus = candidate.CandidateStatus ?? (candidate.SourceType == "employees" ? "Employee" : null),
                                SalaryExpectations = candidate.SalaryExpectations ?? 0,
                                SalaryExpectationsCurrency = candidate.SalaryExpectationsCurrency ?? "",
                                LastStatusUpdate = candidate.LastStatusUpdate?.ToString("yyyy-MM-dd"),
                                Skills = SkillMatchDto.Normalize(parsed.Skills),
                            });
                        }
                    }
                }
                catch (Exception ex)
                {
                    callTimer.Stop();
                    Interlocked.Increment(ref sonnetFallbackCount);
                    candidateTimings.Add(new CandidateTimingDto
                    {
                        Name = candidate.Name ?? "Unknown",
                        Phase = "sonnet",
                        DurationMs = callTimer.ElapsedMilliseconds,
                        Fallback = true,
                        Error = ex.Message
                    });
                    _logger.LogWarning("[MatchEngine] Sonnet FALLBACK [{I}/{Total}] {Name}: {Ms}ms — {Err}",
                        i + 1, topCandidates.Count, candidate.Name, callTimer.ElapsedMilliseconds, ex.Message);
                    var emptyArray = JsonSerializer.Deserialize<JsonElement>("[]");
                    results.Add(new MatchCandidateResult
                    {
                        Id = candidate.UpstreamId,
                        Name = candidate.Name ?? "Unknown",
                        Type = candidate.SourceType == "employees" ? "employee" : "candidate",
                        Role = candidate.JobTitle ?? "Unknown",
                        MatchScore = (int)(candidate.CosineSimilarity * 100),
                        Summary = "AI analysis unavailable — score based on vector similarity only.",
                        Seniority = candidate.Seniority ?? "",
                        ExpectedRate = candidate.Rate ?? 0,
                        Currency = candidate.Currency ?? "",
                        Country = candidate.Country ?? "",
                        MainSkill = candidate.MainSkill ?? "",
                        IsBench = candidate.IsBench,
                        CandidateStatus = candidate.CandidateStatus ?? (candidate.SourceType == "employees" ? "Employee" : null),
                        SalaryExpectations = candidate.SalaryExpectations ?? 0,
                        SalaryExpectationsCurrency = candidate.SalaryExpectationsCurrency ?? "",
                        LastStatusUpdate = candidate.LastStatusUpdate?.ToString("yyyy-MM-dd"),
                        Leadership = emptyArray,
                        SoftSkills = emptyArray,
                        Scores = new MatchScoresDto
                        {
                            Technical = (int)(candidate.CosineSimilarity * 90),
                            Domain = (int)(candidate.CosineSimilarity * 70),
                            Leadership = 50,
                            SoftSkills = 50,
                            Availability = candidate.IsBench ? 100 : 70
                        }
                    });
                }
            }
            finally
            {
                sonnetSemaphore.Release();
                var completed = Interlocked.Increment(ref sonnetCompleted);
                var sonnetPercent = 70 + (int)(25.0 * completed / topCandidates.Count);
                await writer.WriteAsync(new MatchProgressEvent(new MatchSearchProgress(
                    Math.Min(sonnetPercent, 95),
                    "Infusing latent space with enriched context...")), ct);
            }
        }).ToList();

        await Task.WhenAll(sonnetTasks);
        phase.Stop();
        timings["sonnetAnalysisMs"] = phase.ElapsedMilliseconds;
        timings["sonnetCallCount"] = topCandidates.Count;
        timings["sonnetFallbackCount"] = sonnetFallbackCount;
        timings["sonnetAvgMs"] = topCandidates.Count > 0 ? phase.ElapsedMilliseconds / topCandidates.Count : 0;
        _logger.LogInformation("[MatchEngine] Phase 7 — Sonnet Analysis: {Ms}ms ({Count} calls, {Fallbacks} fallbacks, concurrency={Concurrency})",
            phase.ElapsedMilliseconds, topCandidates.Count, sonnetFallbackCount, _claudeSettings.MaxConcurrency);

        stopwatch.Stop();

        _logger.LogInformation(
            "[MatchEngine] Pipeline complete in {TotalMs}ms | Embed:{E}ms Vec:{V}ms Count:{C}ms Enrich:{En}ms Filter:{F}ms Haiku({HC}x,{HF}fb):{HMs}ms Sonnet({SC}x,{SF}fb):{SMs}ms",
            stopwatch.ElapsedMilliseconds, timings["embeddingMs"], timings["vectorSearchMs"], timings["totalCountMs"],
            timings["enrichmentMs"], timings["constraintsMs"],
            timings["haikuCallCount"], timings["haikuFallbackCount"], timings["haikuTriageMs"],
            timings["sonnetCallCount"], timings["sonnetFallbackCount"], timings["sonnetAnalysisMs"]);

        var finalResults = results.OrderByDescending(r => r.MatchScore).ToList();
        var pipelineStats = new PipelineStatsDto
        {
            ProfilesScanned = totalScanned.ToString("N0"),
            PreFiltered = preFilteredCount.ToString(),
            ConstraintsApplied = constraintsAppliedCount.ToString(),
            HaikuTriage = haikuTriageCount.ToString(),
            SonnetAnalyzed = finalResults.Count.ToString(),
            SearchCost = "$0.00",
            Time = $"{stopwatch.Elapsed.TotalSeconds:F0}s",
            Timings = timings,
            CandidateTimings = candidateTimings.ToList()
        };

        var triagedUpstreamIds = new HashSet<int>(triaged.Select(t => t.Candidate.UpstreamId));
        var haikuStageCandidates = afterConstraints.Select(c =>
        {
            var score = haikuScores.GetValueOrDefault(c.UpstreamId);
            var kept = triagedUpstreamIds.Contains(c.UpstreamId);
            return new PipelineStageCandidateDto
            {
                UpstreamId = c.UpstreamId,
                Name = c.Name,
                SourceType = c.SourceType,
                CosineSimilarity = c.CosineSimilarity,
                Seniority = c.Seniority,
                MainSkill = c.MainSkill,
                Country = c.Country,
                IsBench = c.IsBench,
                HaikuScore = score,
                EliminationReason = kept ? null : $"Haiku score: {score} — below threshold",
            };
        }).ToList();

        var pipelineStages = new PipelineStagesDto
        {
            VectorResults = vectorStageCandidates,
            AfterConstraints = constraintsStageCandidates,
            AfterHaikuTriage = haikuStageCandidates,
        };

        await writer.WriteAsync(new MatchProgressEvent(new MatchSearchProgress(100, "Collapsing probability waves into results...")), ct);

        await writer.WriteAsync(new MatchPipelineStagesEvent(pipelineStages), ct);

        await writer.WriteAsync(new MatchResultEvent(new MatchSearchResult
        {
            Candidates = finalResults,
            Stats = pipelineStats
        }), ct);
    }

    public async Task<PoolCountsResponse> GetPoolCountsAsync(CancellationToken ct = default)
    {
        var benchCount = await _dbContext.ResumeEmbeddings
            .CountAsync(re => re.Embedding != null && re.SourceType == "employees" && re.IsBench, ct);

        var employeesCount = await _dbContext.ResumeEmbeddings
            .CountAsync(re => re.Embedding != null && re.SourceType == "employees", ct);

        var candidatesCount = await _dbContext.ResumeEmbeddings
            .CountAsync(re => re.Embedding != null && re.SourceType == "candidates", ct);

        return new PoolCountsResponse(benchCount, employeesCount, candidatesCount, employeesCount + candidatesCount);
    }

    public async Task<FilterOptionsResponse> GetFilterOptionsAsync(CancellationToken ct = default)
    {
        var empSeniorities = _dbContext.SyncedEmployees.Where(e => e.Seniority != "").Select(e => e.Seniority);
        var candSeniorities = _dbContext.SyncedCandidates.Where(c => c.Seniority != null && c.Seniority != "").Select(c => c.Seniority!);
        var seniorities = await empSeniorities.Union(candSeniorities).Distinct().OrderBy(s => s).ToListAsync(ct);

        var empSkills = _dbContext.SyncedEmployees.Where(e => e.MainSkill != "").Select(e => e.MainSkill);
        var candSkills = _dbContext.SyncedCandidates.Where(c => c.MainSkill != null && c.MainSkill != "").Select(c => c.MainSkill!);
        var mainSkills = await empSkills.Union(candSkills).Distinct().OrderBy(s => s).ToListAsync(ct);

        var empCountries = _dbContext.SyncedEmployees.Where(e => e.Country != "").Select(e => e.Country);
        var candCountries = _dbContext.SyncedCandidates.Where(c => c.Country != null && c.Country != "").Select(c => c.Country!);
        var countries = await empCountries.Union(candCountries).Distinct().OrderBy(s => s).ToListAsync(ct);

        var empCurrencies = _dbContext.SyncedEmployees.Where(e => e.SalaryCurrency != null && e.SalaryCurrency != "").Select(e => e.SalaryCurrency!);
        var candCurrencies = _dbContext.SyncedCandidates.Where(c => c.SalaryCurrency != null && c.SalaryCurrency != "").Select(c => c.SalaryCurrency!);
        var currencies = await empCurrencies.Union(candCurrencies).Distinct().OrderBy(s => s).ToListAsync(ct);

        var statuses = await _dbContext.SyncedCandidates
            .Where(c => c.CandidateStatus != null && c.CandidateStatus != "")
            .Select(c => c.CandidateStatus!)
            .Distinct().OrderBy(s => s).ToListAsync(ct);

        return new FilterOptionsResponse
        {
            Seniorities = seniorities,
            MainSkills = mainSkills,
            Countries = countries,
            Currencies = currencies,
            CandidateStatuses = statuses,
        };
    }

    private static (string sql, List<NpgsqlParameter> parameters) BuildAdvancedConstraintSql(AdvancedConstraints? constraints)
    {
        if (constraints == null)
            return ("", []);

        var parameters = new List<NpgsqlParameter>();
        var paramIndex = 0;
        var sqlParts = new List<string>();

        string NextParam(object value)
        {
            var name = $"@constraint_p{paramIndex++}";
            parameters.Add(new NpgsqlParameter(name, value));
            return name;
        }

        if (constraints.CandidateFilters.Count > 0)
        {
            var candidateSql = BuildFilterGroupSql(constraints.CandidateFilters, "candidates", "SyncedCandidates", "sc", NextParam);
            if (!string.IsNullOrEmpty(candidateSql))
                sqlParts.Add($@"
                AND (re.""SourceType"" != 'candidates' OR EXISTS (
                    SELECT 1 FROM ""SyncedCandidates"" sc WHERE sc.""UpstreamId"" = re.""UpstreamId"" AND ({candidateSql})
                ))");
        }

        if (constraints.EmployeeFilters.Count > 0)
        {
            var employeeSql = BuildFilterGroupSql(constraints.EmployeeFilters, "employees", "SyncedEmployees", "se", NextParam);
            if (!string.IsNullOrEmpty(employeeSql))
                sqlParts.Add($@"
                AND (re.""SourceType"" != 'employees' OR EXISTS (
                    SELECT 1 FROM ""SyncedEmployees"" se WHERE se.""UpstreamId"" = re.""UpstreamId"" AND ({employeeSql})
                ))");
        }

        return (string.Join("", sqlParts), parameters);
    }

    private static readonly Dictionary<string, Dictionary<string, string>> FieldColumnMap = new()
    {
        ["candidates"] = new()
        {
            ["mainSkill"] = @"""MainSkill""",
            ["country"] = @"""Country""",
            ["seniority"] = @"""Seniority""",
            ["currentSalary"] = @"""CurrentSalary""",
            ["salaryExpectation"] = @"""SalaryExpectations""",
            ["status"] = @"""CandidateStatus""",
            ["lastStatusUpdate"] = @"""LastStatusUpdate""",
            ["coeCertified"] = @"""CoeCertified""",
        },
        ["employees"] = new()
        {
            ["mainSkill"] = @"""MainSkill""",
            ["country"] = @"""Country""",
            ["seniority"] = @"""Seniority""",
            ["currentSalary"] = "EMPLOYEE_SALARY_EXPR",
        },
    };

    private static string BuildFilterGroupSql(
        List<FilterRule> rules,
        string sourceType,
        string tableName,
        string alias,
        Func<object, string> nextParam)
    {
        if (rules.Count == 0) return "";

        var columnMap = FieldColumnMap.GetValueOrDefault(sourceType) ?? new();
        var andGroups = new List<List<string>>();
        var currentOrGroup = new List<string>();

        for (int i = 0; i < rules.Count; i++)
        {
            var rule = rules[i];
            var condition = BuildRuleCondition(rule, sourceType, alias, columnMap, nextParam);
            if (string.IsNullOrEmpty(condition)) continue;

            currentOrGroup.Add(condition);

            var isLast = i == rules.Count - 1;
            if (isLast || rule.Connector == "and")
            {
                andGroups.Add(currentOrGroup);
                currentOrGroup = new List<string>();
            }
        }

        if (currentOrGroup.Count > 0)
            andGroups.Add(currentOrGroup);

        var andParts = andGroups
            .Where(g => g.Count > 0)
            .Select(g => g.Count == 1 ? g[0] : $"({string.Join(" OR ", g)})")
            .ToList();

        return string.Join(" AND ", andParts);
    }

    private static string BuildRuleCondition(
        FilterRule rule,
        string sourceType,
        string alias,
        Dictionary<string, string> columnMap,
        Func<object, string> nextParam)
    {
        if (!columnMap.TryGetValue(rule.Field, out var column)) return "";

        if (rule.Field == "lastStatusUpdate")
        {
            if (DateTime.TryParse(rule.Value.ToString(), out var dateValue))
            {
                var p = nextParam(dateValue);
                var op = rule.Operator == "gte" ? ">=" : "<=";
                return $"{alias}.{column} {op} {p}";
            }
            return "";
        }

        if (rule.Field == "coeCertified")
        {
            var boolVal = rule.Value.ToString()?.ToLowerInvariant() == "true";
            var p = nextParam(boolVal);
            return $"{alias}.{column} = {p}";
        }

        if (rule.Field == "currentSalary" && sourceType == "employees")
        {
            var salaryExpr = $@"CASE WHEN {alias}.""SalaryCurrency"" = 'USD' AND {alias}.""Rate"" IS NOT NULL AND {alias}.""Rate"" <= 100 THEN {alias}.""Rate"" * 160 ELSE COALESCE({alias}.""GrossMonthlySalary"", 0) END";
            if (decimal.TryParse(rule.Value.ToString(), out var salVal))
            {
                var p = nextParam(salVal);
                var op = rule.Operator == "gte" ? ">=" : "<=";
                return $"{salaryExpr} {op} {p}";
            }
            return "";
        }

        var isSalaryField = rule.Field is "currentSalary" or "salaryExpectation";

        if (isSalaryField)
        {
            if (decimal.TryParse(rule.Value.ToString(), out var salaryValue) && salaryValue > 0)
            {
                var p = nextParam(salaryValue);
                var op = rule.Operator == "gte" ? ">=" : "<=";
                return $"{column} {op} {p}";
            }
            return "";
        }

        var value = rule.Value.ToString() ?? "";
        if (string.IsNullOrEmpty(value)) return "";

        return rule.Operator switch
        {
            "equals" => $"{column} = {nextParam(value)}",
            "notEquals" => $"({column} IS NULL OR {column} != {nextParam(value)})",
            "in" => $"{column} = {nextParam(value)}",
            "notIn" => $"({column} IS NULL OR {column} != {nextParam(value)})",
            _ => ""
        };
    }

    public async Task<int> CreateSessionAsync(CreateSessionRequest request, CancellationToken ct = default)
    {
        var session = new MatchSession
        {
            Name = string.IsNullOrWhiteSpace(request.Name)
                ? $"Search — {DateTime.UtcNow:yyyy-MM-dd HH:mm}"
                : request.Name,
            MatchFlowType = request.MatchFlowType,
            DataSource = request.DataSource,
            TopN = request.TopN,
            SearchMode = request.SearchMode,
            JobDescription = request.JobDescription,
            JdSource = request.JdSource,
            ConstraintsJson = request.Constraints != null
                ? JsonSerializer.Serialize(request.Constraints, JsonOptions)
                : null,
            Status = "running",
            CreatedAt = DateTime.UtcNow,
        };

        _dbContext.MatchSessions.Add(session);
        await _dbContext.SaveChangesAsync(ct);
        return session.Id;
    }

    public async Task SaveSessionResultAsync(int sessionId, MatchSearchResult result, PipelineStagesDto stages, CancellationToken ct = default)
    {
        var session = await _dbContext.MatchSessions.FindAsync([sessionId], ct);
        if (session == null) return;

        session.Status = "completed";
        session.CompletedAt = DateTime.UtcNow;
        session.PipelineStatsJson = JsonSerializer.Serialize(result.Stats, JsonOptions);
        session.PipelineStagesJson = JsonSerializer.Serialize(stages, JsonOptions);
        session.ResultsJson = JsonSerializer.Serialize(result.Candidates, JsonOptions);
        await _dbContext.SaveChangesAsync(ct);
    }

    public async Task FailSessionAsync(int sessionId, CancellationToken ct = default)
    {
        var session = await _dbContext.MatchSessions.FindAsync([sessionId], ct);
        if (session == null) return;

        session.Status = "failed";
        session.CompletedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync(ct);
    }

    public async Task<List<MatchSessionDto>> ListSessionsAsync(CancellationToken ct = default)
    {
        var sessions = await _dbContext.MatchSessions
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new
            {
                s.Id,
                s.Name,
                s.MatchFlowType,
                s.DataSource,
                s.TopN,
                s.SearchMode,
                s.JdSource,
                s.Status,
                s.CreatedAt,
                s.CompletedAt,
                s.ResultsJson,
                s.PipelineStatsJson,
            })
            .ToListAsync(ct);

        return sessions.Select(s =>
        {
            int? candidateCount = null;
            string? time = null;

            if (s.ResultsJson != null)
            {
                try
                {
                    using var doc = JsonDocument.Parse(s.ResultsJson);
                    candidateCount = doc.RootElement.GetArrayLength();
                }
                catch { }
            }

            if (s.PipelineStatsJson != null)
            {
                try
                {
                    time = JsonSerializer.Deserialize<PipelineStatsDto>(s.PipelineStatsJson, JsonOptions)?.Time;
                }
                catch { }
            }

            return new MatchSessionDto
            {
                Id = s.Id,
                Name = s.Name,
                MatchFlowType = s.MatchFlowType,
                DataSource = s.DataSource,
                TopN = s.TopN,
                SearchMode = s.SearchMode,
                JdSource = s.JdSource,
                Status = s.Status,
                CreatedAt = s.CreatedAt,
                CompletedAt = s.CompletedAt,
                CandidateCount = candidateCount,
                Time = time,
            };
        }).ToList();
    }

    public async Task<MatchSessionDetailDto?> GetSessionAsync(int id, CancellationToken ct = default)
    {
        var session = await _dbContext.MatchSessions.FindAsync([id], ct);
        if (session == null) return null;

        AdvancedConstraints? constraints = null;
        if (session.ConstraintsJson != null)
        {
            try
            {
                constraints = JsonSerializer.Deserialize<AdvancedConstraints>(session.ConstraintsJson, JsonOptions);
                if (constraints?.CandidateFilters == null && constraints?.EmployeeFilters == null)
                    constraints = new AdvancedConstraints();
            }
            catch
            {
                constraints = new AdvancedConstraints();
            }
        }
        var stats = session.PipelineStatsJson != null
            ? JsonSerializer.Deserialize<PipelineStatsDto>(session.PipelineStatsJson, JsonOptions)
            : null;
        var stages = session.PipelineStagesJson != null
            ? JsonSerializer.Deserialize<PipelineStagesDto>(session.PipelineStagesJson, JsonOptions)
            : null;
        var candidates = session.ResultsJson != null
            ? JsonSerializer.Deserialize<List<MatchCandidateResult>>(session.ResultsJson, JsonOptions) ?? []
            : new List<MatchCandidateResult>();

        return new MatchSessionDetailDto
        {
            Id = session.Id,
            Name = session.Name,
            MatchFlowType = session.MatchFlowType,
            DataSource = session.DataSource,
            TopN = session.TopN,
            SearchMode = session.SearchMode,
            JdSource = session.JdSource,
            Status = session.Status,
            CreatedAt = session.CreatedAt,
            CompletedAt = session.CompletedAt,
            CandidateCount = candidates.Count,
            Time = stats?.Time,
            JobDescription = session.JobDescription,
            Constraints = constraints,
            Stats = stats,
            PipelineStages = stages,
            Candidates = candidates,
        };
    }
}

internal class VectorSearchRaw
{
    public int SourceId { get; set; }
    public string SourceType { get; set; } = string.Empty;
    public string? ResumeText { get; set; }
    public bool IsBench { get; set; }
    public int UpstreamId { get; set; }
    public double CosineSimilarity { get; set; }
}
