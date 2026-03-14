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
        var sourceFilter = request.DataSource switch
        {
            "bench" => "AND re.\"SourceType\" = 'employees' AND re.\"IsBench\" = true",
            "all-employees" => "AND re.\"SourceType\" = 'employees'",
            "candidates" => "AND re.\"SourceType\" = 'candidates'",
            _ => ""
        };

        var sql = $@"
            SELECT re.""SourceId"", re.""SourceType"", re.""ResumeText"", re.""IsBench"", re.""UpstreamId"",
                   1 - (re.""Embedding"" <=> '{vectorString}'::vector) AS ""CosineSimilarity""
            FROM ""ResumeEmbeddings"" re
            WHERE re.""Embedding"" IS NOT NULL
            {sourceFilter}
            ORDER BY re.""Embedding"" <=> '{vectorString}'::vector
            LIMIT 50";

        var vectorResults = new List<VectorSearchRaw>();
        var conn = _dbContext.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open)
            await conn.OpenAsync(ct);

        await using (var cmd = new NpgsqlCommand(sql, (NpgsqlConnection)conn))
        {
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
        var constrained = enriched.AsEnumerable();

        if (!string.IsNullOrEmpty(request.Constraints?.Seniority))
            constrained = constrained.Where(c =>
                string.Equals(c.Seniority, request.Constraints.Seniority, StringComparison.OrdinalIgnoreCase));

        if (!string.IsNullOrEmpty(request.Constraints?.MainSkill))
            constrained = constrained.Where(c =>
                string.Equals(c.MainSkill, request.Constraints.MainSkill, StringComparison.OrdinalIgnoreCase));

        if (request.Constraints?.Salary > 0)
        {
            var op = request.Constraints.SalaryOperator ?? "lte";
            constrained = constrained.Where(c =>
                c.Rate == null || (op == "gte" ? c.Rate >= request.Constraints.Salary : c.Rate <= request.Constraints.Salary));
        }

        if (!string.IsNullOrEmpty(request.Constraints?.SalaryCurrency))
            constrained = constrained.Where(c =>
                string.IsNullOrEmpty(c.Currency) ||
                string.Equals(c.Currency, request.Constraints.SalaryCurrency, StringComparison.OrdinalIgnoreCase));

        if (!string.IsNullOrEmpty(request.Constraints?.Country))
            constrained = constrained.Where(c =>
                string.IsNullOrEmpty(c.Country) ||
                string.Equals(c.Country, request.Constraints.Country, StringComparison.OrdinalIgnoreCase));

        var afterConstraints = constrained.ToList();
        constraintsAppliedCount = afterConstraints.Count;
        phase.Stop();
        timings["constraintsMs"] = phase.ElapsedMilliseconds;
        _logger.LogInformation("[MatchEngine] Phase 5 — Constraint Filtering: {Ms}ms ({Count} remaining)", phase.ElapsedMilliseconds, constraintsAppliedCount);

        var afterConstraintsUpstreamIds = new HashSet<int>(afterConstraints.Select(c => c.UpstreamId));
        var constraintsStageCandidates = enriched.Select(c =>
        {
            string? eliminationReason = null;
            if (!afterConstraintsUpstreamIds.Contains(c.UpstreamId))
            {
                if (!string.IsNullOrEmpty(request.Constraints?.Seniority) &&
                    !string.Equals(c.Seniority, request.Constraints.Seniority, StringComparison.OrdinalIgnoreCase))
                    eliminationReason = "Seniority mismatch";
                else if (!string.IsNullOrEmpty(request.Constraints?.MainSkill) &&
                    !string.Equals(c.MainSkill, request.Constraints.MainSkill, StringComparison.OrdinalIgnoreCase))
                    eliminationReason = "Main skill mismatch";
                else if (!string.IsNullOrEmpty(request.Constraints?.Country) &&
                    !string.IsNullOrEmpty(c.Country) &&
                    !string.Equals(c.Country, request.Constraints.Country, StringComparison.OrdinalIgnoreCase))
                    eliminationReason = "Country mismatch";
                else if (request.Constraints?.Salary > 0 && c.Rate != null)
                    eliminationReason = "Salary constraint";
                else
                    eliminationReason = "Constraint filter";
            }
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
                EliminationReason = eliminationReason,
            };
        }).ToList();

        await writer.WriteAsync(new MatchProgressEvent(new MatchSearchProgress(45, "Mapping requirement vectors onto neural fabric...")), ct);

        phase = Stopwatch.StartNew();
        var haikuFallbackCount = 0;
        var haikuScores = new ConcurrentDictionary<int, int>();
        var triaged = new ConcurrentBag<(VectorSearchResult Candidate, int Score)>();
        var haikuCompleted = 0;
        var semaphore = new SemaphoreSlim(_claudeSettings.MaxConcurrency);

        var haikuTasks = afterConstraints.Select(async (candidate, i) =>
        {
            await semaphore.WaitAsync(ct);
            try
            {
                ct.ThrowIfCancellationRequested();
                var resumeSnippet = (candidate.ResumeText ?? "").Length > 3000
                    ? candidate.ResumeText![..3000]
                    : candidate.ResumeText ?? "No resume text available";

                var haikuPrompt = $@"You are a technical recruiter AI. Given this job description and resume, assess relevance.

Job Description:
{request.JobDescription}

Resume:
{resumeSnippet}

Respond in JSON only: {{""relevant"": true/false, ""score"": 0-100, ""reason"": ""brief explanation""}}";

                var callTimer = Stopwatch.StartNew();
                try
                {
                    var haikuResponse = await _claudeProxy.ChatAsync(
                        _claudeSettings.HaikuModel, haikuPrompt, 256, 0.1, ct);
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
        timings["haikuMaxConcurrency"] = _claudeSettings.MaxConcurrency;
        _logger.LogInformation("[MatchEngine] Phase 6 — Haiku Triage: {Ms}ms ({Count} calls, {Fallbacks} fallbacks, concurrency={Concurrency})",
            phase.ElapsedMilliseconds, afterConstraints.Count, haikuFallbackCount, _claudeSettings.MaxConcurrency);

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

        await writer.WriteAsync(new MatchProgressEvent(new MatchSearchProgress(70, "Infusing latent space with enriched context...")), ct);

        phase = Stopwatch.StartNew();
        var sonnetFallbackCount = 0;
        var results = new ConcurrentBag<MatchCandidateResult>();
        var sonnetCompleted = 0;
        var sonnetSemaphore = new SemaphoreSlim(_claudeSettings.MaxConcurrency);

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

                var sonnetPrompt = $@"You are a senior technical recruiter AI performing deep candidate analysis.

Job Description:
{request.JobDescription}

Candidate Name: {candidate.Name}
Current Title: {candidate.JobTitle ?? "Unknown"}
Seniority: {candidate.Seniority ?? "Unknown"}
Main Skill: {candidate.MainSkill ?? "Unknown"}
Country: {candidate.Country ?? "Unknown"}
Rate: {candidate.Rate?.ToString() ?? "Unknown"} {candidate.Currency ?? ""}
On Bench: {candidate.IsBench}
Source: {candidate.SourceType}

Resume:
{resumeSnippet}

Analyze this candidate's fit for the role. Return a JSON object with this exact structure:
{{
  ""matchScore"": <0-100>,
  ""role"": ""<candidate's best-fit role title>"",
  ""years"": <total years of experience>,
  ""location"": ""{candidate.Country ?? "Unknown"}"",
  ""salary"": ""{(candidate.Rate != null ? $"${candidate.Rate}/hr" : "Unknown")}"",
  ""availability"": ""{(candidate.IsBench ? "Immediately" : "2-4 weeks")}"",
  ""scores"": {{ ""technical"": <0-100>, ""domain"": <0-100>, ""leadership"": <0-100>, ""softSkills"": <0-100>, ""availability"": <0-100> }},
  ""summary"": ""<2-3 sentence executive summary of fit>"",
  ""skills"": [{{ ""name"": ""<skill>"", ""status"": ""match|partial|missing"", ""years"": <years> }}],
  ""domains"": [{{ ""name"": ""<domain>"", ""confidence"": <0-100>, ""evidence"": ""<brief evidence>"" }}],
  ""gaps"": [{{ ""skill"": ""<gap area>"", ""severity"": ""high|medium|low"", ""note"": ""<explanation>"" }}],
  ""leadership"": [""<leadership quality or achievement>""],
  ""softSkills"": [""<soft skill>""],
  ""analysis"": {{
    ""whyRightFit"": ""<detailed narrative on why this candidate fits>"",
    ""immediateValue"": ""<what value they bring day one>"",
    ""rampUpEstimate"": ""<realistic ramp-up time and what they need to learn>"",
    ""riskFactors"": ""<risks and how to mitigate them>"",
    ""beyondJd"": ""<hidden strengths beyond the JD requirements>"",
    ""leadershipDynamics"": ""<leadership style and team dynamics>"",
    ""industryDepth"": ""<industry and domain knowledge depth>"",
    ""trackRecord"": ""<proof points and track record>"",
    ""culturalFit"": ""<cultural and work style compatibility>"",
    ""retentionPotential"": ""<long-term retention potential and growth path>""
  }}
}}

Return ONLY valid JSON, no markdown or explanation.";

                var callTimer = Stopwatch.StartNew();
                try
                {
                    var sonnetResponse = await _claudeProxy.ChatAsync(
                        _claudeSettings.SonnetModel, sonnetPrompt, 4096, 0.2, ct);
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
        var seniorities = await _dbContext.SyncedEmployees
            .Where(e => e.Seniority != "")
            .Select(e => e.Seniority)
            .Distinct()
            .OrderBy(s => s)
            .ToListAsync(ct);

        var mainSkills = await _dbContext.SyncedEmployees
            .Where(e => e.MainSkill != "")
            .Select(e => e.MainSkill)
            .Distinct()
            .OrderBy(s => s)
            .ToListAsync(ct);

        var countries = await _dbContext.SyncedEmployees
            .Where(e => e.Country != "")
            .Select(e => e.Country)
            .Distinct()
            .OrderBy(s => s)
            .ToListAsync(ct);

        var currencies = await _dbContext.SyncedEmployees
            .Where(e => e.SalaryCurrency != null && e.SalaryCurrency != "")
            .Select(e => e.SalaryCurrency!)
            .Distinct()
            .OrderBy(s => s)
            .ToListAsync(ct);

        return new FilterOptionsResponse
        {
            Seniorities = seniorities,
            MainSkills = mainSkills,
            Countries = countries,
            Currencies = currencies,
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
        var jsonOpts = JsonOptions;
        return await _dbContext.MatchSessions
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new MatchSessionDto
            {
                Id = s.Id,
                Name = s.Name,
                MatchFlowType = s.MatchFlowType,
                DataSource = s.DataSource,
                TopN = s.TopN,
                JdSource = s.JdSource,
                Status = s.Status,
                CreatedAt = s.CreatedAt,
                CompletedAt = s.CompletedAt,
                CandidateCount = s.ResultsJson != null
                    ? JsonSerializer.Deserialize<List<MatchCandidateResult>>(s.ResultsJson, jsonOpts)!.Count
                    : null,
                Time = s.PipelineStatsJson != null
                    ? JsonSerializer.Deserialize<PipelineStatsDto>(s.PipelineStatsJson, jsonOpts)!.Time
                    : null,
            })
            .ToListAsync(ct);
    }

    public async Task<MatchSessionDetailDto?> GetSessionAsync(int id, CancellationToken ct = default)
    {
        var session = await _dbContext.MatchSessions.FindAsync([id], ct);
        if (session == null) return null;

        var constraints = session.ConstraintsJson != null
            ? JsonSerializer.Deserialize<MatchConstraints>(session.ConstraintsJson, JsonOptions)
            : null;
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
