using Microsoft.EntityFrameworkCore;
using OperationNexus.Api.Data;
using OperationNexus.Api.Models;
using OperationNexus.Api.Models.Entities;
using OperationNexus.Api.Models.Upstream;
using System.Runtime.CompilerServices;

namespace OperationNexus.Api.Services;

public class SyncOrchestrator : ISyncOrchestrator
{
    private readonly IUpstreamApiService _upstreamApi;
    private readonly ICatalogService _catalogService;
    private readonly NexusDbContext _dbContext;
    private readonly ILogger<SyncOrchestrator> _logger;
    private readonly IEmbeddingJobQueue _embeddingQueue;

    private static readonly HashSet<string> SupportedResumeExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".pdf", ".docx", ".doc", ".jpg", ".jpeg", ".png"
    };

    private static readonly HashSet<string> ExcludedJobTitles = new(StringComparer.OrdinalIgnoreCase)
    {
        "Centers Of Excellence",
        "Chief of Staff",
        "Cloud Center of Excellence Lead",
        "Client Success",
        "Country Manager",
        "Delivery Manager",
        "Director, Outcomes Engagements",
        "Direcor, Outcomes Engagements",
        "Director of People Management",
        "Director, TaaS and CaaS engagements",
        "Director, Technical Delivery",
        "Executive Committee",
        "External",
        "Finance and Legal",
        "Human Resources",
        "IT and Infrastructure",
        "Operations and Maintenance",
        "People Success",
    };

    public SyncOrchestrator(
        IUpstreamApiService upstreamApi,
        ICatalogService catalogService,
        NexusDbContext dbContext,
        ILogger<SyncOrchestrator> logger,
        IEmbeddingJobQueue embeddingQueue)
    {
        _upstreamApi = upstreamApi;
        _catalogService = catalogService;
        _dbContext = dbContext;
        _logger = logger;
        _embeddingQueue = embeddingQueue;
    }

    public async IAsyncEnumerable<SyncEvent> SyncAsync(string source, string token, int? limit = null, int? skip = null, int? year = null, [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        if (source == "employees")
        {
            await foreach (var syncEvent in SyncEmployeesAsync(token, limit, skip, cancellationToken))
                yield return syncEvent;
        }
        else if (source == "candidates")
        {
            await foreach (var syncEvent in SyncCandidatesAsync(token, limit, skip, year, cancellationToken))
                yield return syncEvent;
        }
        else if (source == "open-positions")
        {
            await foreach (var syncEvent in SyncOpenPositionsAsync(token, limit, skip, cancellationToken))
                yield return syncEvent;
        }
    }

    public async Task<SyncRecordDto> SyncSingleAsync(string source, string token, int upstreamId, CancellationToken ct = default)
    {
        if (source == "employees")
            return await SyncSingleEmployeeAsync(token, upstreamId, ct);
        if (source == "candidates")
            return await SyncSingleCandidateAsync(token, upstreamId, ct);
        if (source == "open-positions")
            return await SyncSingleOpenPositionAsync(token, upstreamId, ct);

        throw new ArgumentException($"Unknown source: {source}");
    }

    private async Task<SyncRecordDto> SyncSingleEmployeeAsync(string token, int upstreamId, CancellationToken ct)
    {
        var seniorities = await _catalogService.GetSenioritiesAsync(token);
        var mainSkills = await LoadCatalogOrEmpty("MainSkill", () => _catalogService.GetMainSkillsAsync(token));
        var countries = await LoadCatalogOrEmpty("Country", () => _catalogService.GetCountriesAsync(token));

        var detail = await _upstreamApi.GetEmployeeDetailAsync(token, upstreamId);
        var contracts = await LoadOrEmpty("Contracts", () => _upstreamApi.GetEmployeeContractsAsync(token, upstreamId));
        var rates = await LoadOrEmpty("Rates", () => _upstreamApi.GetEmployeeRatesAsync(token, upstreamId));
        var notes = await LoadOrEmpty("Notes", () => _upstreamApi.GetEmployeeNotesAsync(token, upstreamId));

        var pagedFallback = new EmployeeDetail { UserId = upstreamId };
        var entity = BuildEmployeeEntity(detail, contracts, rates, notes, seniorities, mainSkills, countries, pagedFallback);
        var (_, resumeChanged, syncDetail) = await UpsertEmployeeAsync(entity, ct);
        await EnqueueEmbeddingIfEligible("employees", entity.Id, entity.UpstreamId,
            entity.FullName, entity.ResumeNoteId, entity.ResumeFilename,
            entity.IsBench, token, entity.HasResume, entity.Status);

        return MapEmployeeToDto(entity, resumeChanged, syncDetail);
    }

    private async Task<SyncRecordDto> SyncSingleCandidateAsync(string token, int upstreamId, CancellationToken ct)
    {
        var seniorities = await _catalogService.GetSenioritiesAsync(token);
        var mainSkills = await LoadCatalogOrEmpty("MainSkill", () => _catalogService.GetMainSkillsAsync(token));
        var countries = await LoadCatalogOrEmpty("Country", () => _catalogService.GetCountriesAsync(token));

        var detail = await _upstreamApi.GetCandidateDetailAsync(token, upstreamId);
        var notes = await LoadOrEmpty("Notes", () => _upstreamApi.GetCandidateNotesAsync(token, upstreamId));

        var pagedFallback = new CandidateDetail { CandidateId = upstreamId };
        var entity = BuildCandidateEntity(detail, notes, seniorities, mainSkills, countries, pagedFallback);
        var (_, resumeChanged, syncDetail) = await UpsertCandidateAsync(entity, ct);
        await EnqueueEmbeddingIfEligible("candidates", entity.Id, entity.UpstreamId,
            entity.FullName, entity.ResumeNoteId, entity.ResumeFilename,
            false, token, entity.HasResume, entity.Status);

        return MapCandidateToDto(entity, resumeChanged, syncDetail);
    }

    private async Task<Dictionary<int, string>> LoadCatalogOrEmpty(
        string name, Func<Task<Dictionary<int, string>>> getter)
    {
        try
        {
            var result = await getter();
            _logger.LogInformation("Loaded {CatalogName} catalog: {Count} entries", name, result.Count);
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to load {CatalogName} catalog — will use paged text values as fallback", name);
            return new Dictionary<int, string>();
        }
    }

    private async Task<List<T>> LoadOrEmpty<T>(string name, Func<Task<List<T>>> getter)
    {
        try
        {
            return await getter();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to load {Name} — continuing with empty list", name);
            return new List<T>();
        }
    }

    private async IAsyncEnumerable<SyncEvent> SyncEmployeesAsync(string token, int? limit, int? skipRecords, [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        var seniorities = await _catalogService.GetSenioritiesAsync(token);
        var mainSkills = await LoadCatalogOrEmpty("MainSkill", () => _catalogService.GetMainSkillsAsync(token));
        var countries = await LoadCatalogOrEmpty("Country", () => _catalogService.GetCountriesAsync(token));

        var allEmployees = new List<EmployeeDetail>();
        int pageOffset = 0;
        int totalRecords = 0;
        int pageSize = limit.HasValue ? Math.Min(100, limit.Value) : 100;

        while (true)
        {
            var (items, total) = await _upstreamApi.GetEmployeesPagedAsync(token, pageOffset, pageSize);
            totalRecords = total;
            allEmployees.AddRange(items);
            pageOffset += items.Count;
            if (pageOffset >= totalRecords || items.Count == 0)
                break;
            if (limit.HasValue && allEmployees.Count >= limit.Value)
                break;
        }

        if (limit.HasValue && allEmployees.Count > limit.Value)
            allEmployees = allEmployees.Take(limit.Value).ToList();

        var excludedCount = allEmployees.Count(e => ExcludedJobTitles.Contains(e.JobTitle));
        allEmployees = allEmployees
            .Where(e => !ExcludedJobTitles.Contains(e.JobTitle))
            .ToList();

        if (excludedCount > 0)
            _logger.LogInformation("Excluded {ExcludedCount} employees by job title filter", excludedCount);

        if (skipRecords.HasValue && skipRecords.Value > 0)
        {
            var toSkip = Math.Min(skipRecords.Value, allEmployees.Count);
            _logger.LogInformation("Resuming sync — skipping first {SkipCount} of {Total} employees", toSkip, allEmployees.Count);
            allEmployees = allEmployees.Skip(toSkip).ToList();
        }

        var totalAfterFilter = allEmployees.Count + (skipRecords ?? 0);
        totalRecords = limit.HasValue ? Math.Min(totalRecords, totalAfterFilter) : totalAfterFilter;

        int syncedCount = 0;
        int incompleteCount = 0;
        int notProcessedCount = 0;
        int updatedCount = 0;
        int unchangedCount = 0;
        int fetchedRecords = skipRecords ?? 0;

        if (skipRecords.HasValue && skipRecords.Value > 0)
        {
            var dbCounts = await _dbContext.SyncedEmployees
                .GroupBy(e => e.Status)
                .Select(g => new { Status = g.Key, Count = g.Count() })
                .ToListAsync(cancellationToken);

            syncedCount = dbCounts.FirstOrDefault(c => c.Status == "synced")?.Count ?? 0;
            syncedCount += dbCounts.FirstOrDefault(c => c.Status == "extracted")?.Count ?? 0;
            syncedCount += dbCounts.FirstOrDefault(c => c.Status == "vectorized")?.Count ?? 0;
            incompleteCount = dbCounts.FirstOrDefault(c => c.Status == "incomplete")?.Count ?? 0;
            notProcessedCount = dbCounts.FirstOrDefault(c => c.Status == "not-processed")?.Count ?? 0;
        }

        const int employeeBatchSize = 5;

        for (int batchStart = 0; batchStart < allEmployees.Count; batchStart += employeeBatchSize)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var currentBatch = allEmployees
                .Skip(batchStart)
                .Take(employeeBatchSize)
                .ToList();

            var fetchTasks = currentBatch.Select(async basicEmp =>
            {
                try
                {
                    var detailTask = _upstreamApi.GetEmployeeDetailAsync(token, basicEmp.UserId);
                    var contractsTask = LoadOrEmpty("Contracts", () => _upstreamApi.GetEmployeeContractsAsync(token, basicEmp.UserId));
                    var ratesTask = LoadOrEmpty("Rates", () => _upstreamApi.GetEmployeeRatesAsync(token, basicEmp.UserId));
                    var notesTask = LoadOrEmpty("Notes", () => _upstreamApi.GetEmployeeNotesAsync(token, basicEmp.UserId));
                    await Task.WhenAll(detailTask, contractsTask, ratesTask, notesTask);

                    return (
                        Employee: basicEmp,
                        Detail: (EmployeeDetail?)detailTask.Result,
                        Contracts: (List<EmployeeContract>?)contractsTask.Result,
                        Rates: (List<EmployeeRate>?)ratesTask.Result,
                        Notes: (List<PersonaNote>?)notesTask.Result,
                        FetchError: (Exception?)null
                    );
                }
                catch (Exception ex)
                {
                    return (
                        Employee: basicEmp,
                        Detail: (EmployeeDetail?)null,
                        Contracts: (List<EmployeeContract>?)null,
                        Rates: (List<EmployeeRate>?)null,
                        Notes: (List<PersonaNote>?)null,
                        FetchError: (Exception?)ex
                    );
                }
            }).ToList();

            var fetchResults = await Task.WhenAll(fetchTasks);

            foreach (var result in fetchResults)
            {
                fetchedRecords++;

                SyncedEmployee? entity = null;
                bool resumeChanged = false;
                string syncDetail = "not-processed";
                Exception? fatalError = null;

                try
                {
                    try
                    {
                        if (result.FetchError != null)
                            throw result.FetchError;

                        entity = BuildEmployeeEntity(result.Detail!, result.Contracts!, result.Rates!, result.Notes!, seniorities, mainSkills, countries, result.Employee);
                        (_, resumeChanged, syncDetail) = await UpsertEmployeeAsync(entity, cancellationToken);
                        await EnqueueEmbeddingIfEligible("employees", entity.Id, entity.UpstreamId,
                            entity.FullName, entity.ResumeNoteId, entity.ResumeFilename,
                            entity.IsBench, token, entity.HasResume, entity.Status);
                    }
                    catch (Exception ex)
                    {
                        entity = new SyncedEmployee
                        {
                            UpstreamId = result.Employee.UserId,
                            FullName = result.Employee.FullName ?? string.Empty,
                            Email = result.Employee.Email ?? string.Empty,
                            JobTitle = result.Employee.JobTitle ?? string.Empty,
                            MainSkill = result.Employee.MainSkillName ?? string.Empty,
                            Country = result.Employee.OfficeName ?? string.Empty,
                            Seniority = seniorities.GetValueOrDefault(result.Employee.Seniority, string.Empty),
                            Status = "not-processed",
                            StatusReason = ex.Message,
                            SyncedAt = DateTime.UtcNow
                        };

                        var existingOnError = await _dbContext.SyncedEmployees
                            .FirstOrDefaultAsync(e => e.UpstreamId == entity.UpstreamId, cancellationToken);
                        if (existingOnError != null)
                        {
                            existingOnError.FullName = entity.FullName;
                            existingOnError.Email = entity.Email;
                            existingOnError.JobTitle = entity.JobTitle;
                            existingOnError.MainSkill = entity.MainSkill;
                            existingOnError.Country = entity.Country;
                            existingOnError.Seniority = entity.Seniority;
                            existingOnError.Status = entity.Status;
                            existingOnError.StatusReason = entity.StatusReason;
                            existingOnError.SyncedAt = entity.SyncedAt;
                        }
                        else
                        {
                            _dbContext.SyncedEmployees.Add(entity);
                        }
                        await _dbContext.SaveChangesAsync(cancellationToken);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to sync employee {UpstreamId} ({Name}) — skipping",
                        result.Employee.UserId, result.Employee.FullName);
                    fatalError = ex;
                }

                if (fatalError != null)
                {
                    notProcessedCount++;

                    yield return new SyncRecordEvent(new SyncRecordDto
                    {
                        Id = $"emp-{result.Employee.UserId}",
                        Source = "employees",
                        Status = "not-processed",
                        Name = result.Employee.FullName ?? "Unknown",
                        Email = result.Employee.Email ?? string.Empty,
                        JobTitle = result.Employee.JobTitle ?? string.Empty,
                        Reason = fatalError.Message,
                        UpstreamId = result.Employee.UserId,
                        HasResume = false,
                        Failed = false,
                        SyncDetail = "error",
                        SyncedAt = DateTime.UtcNow.ToString("o"),
                    });

                    yield return new SyncProgressEvent(new SyncProgressDto
                    {
                        TotalRecords = totalRecords,
                        FetchedRecords = fetchedRecords,
                        SyncedCount = syncedCount,
                        IncompleteCount = incompleteCount,
                        NotProcessedCount = notProcessedCount,
                        UpdatedCount = updatedCount,
                        UnchangedCount = unchangedCount,
                        SkippedCount = excludedCount,
                        CurrentRecord = result.Employee.FullName ?? "Unknown",
                        Status = "syncing"
                    });

                    continue;
                }

                if (entity!.Status == "incomplete")
                    incompleteCount++;
                else if (entity.Status == "not-processed")
                    notProcessedCount++;
                else
                {
                    switch (syncDetail)
                    {
                        case "new": syncedCount++; break;
                        case "updated": updatedCount++; break;
                        case "unchanged": unchangedCount++; break;
                    }
                }

                yield return new SyncRecordEvent(MapEmployeeToDto(entity, resumeChanged, syncDetail));

                yield return new SyncProgressEvent(new SyncProgressDto
                {
                    TotalRecords = totalRecords,
                    FetchedRecords = fetchedRecords,
                    SyncedCount = syncedCount,
                    IncompleteCount = incompleteCount,
                    NotProcessedCount = notProcessedCount,
                    UpdatedCount = updatedCount,
                    UnchangedCount = unchangedCount,
                    SkippedCount = excludedCount,
                    CurrentRecord = entity.FullName,
                    Status = "syncing"
                });
            }
        }

        yield return new SyncCompleteEvent(new SyncProgressDto
        {
            TotalRecords = totalRecords,
            FetchedRecords = fetchedRecords,
            SyncedCount = syncedCount,
            IncompleteCount = incompleteCount,
            NotProcessedCount = notProcessedCount,
            UpdatedCount = updatedCount,
            UnchangedCount = unchangedCount,
            SkippedCount = excludedCount,
            Status = "completed"
        });
    }

    private async IAsyncEnumerable<SyncEvent> SyncCandidatesAsync(string token, int? limit, int? skipRecords, int? year, [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        var seniorities = await _catalogService.GetSenioritiesAsync(token);
        var mainSkills = await LoadCatalogOrEmpty("MainSkill", () => _catalogService.GetMainSkillsAsync(token));
        var countries = await LoadCatalogOrEmpty("Country", () => _catalogService.GetCountriesAsync(token));

        const int batchSize = 20;
        int pageOffset = skipRecords ?? 0;
        int totalRecords = 0;
        int syncedCount = 0;
        int incompleteCount = 0;
        int notProcessedCount = 0;
        int updatedCount = 0;
        int unchangedCount = 0;
        int fetchedRecords = skipRecords ?? 0;
        int maxToProcess = limit ?? int.MaxValue;
        int processedInRun = 0;

        if (skipRecords.HasValue && skipRecords.Value > 0)
        {
            var dbCounts = await _dbContext.SyncedCandidates
                .GroupBy(e => e.Status)
                .Select(g => new { Status = g.Key, Count = g.Count() })
                .ToListAsync(cancellationToken);

            syncedCount = dbCounts.FirstOrDefault(c => c.Status == "synced")?.Count ?? 0;
            syncedCount += dbCounts.FirstOrDefault(c => c.Status == "extracted")?.Count ?? 0;
            syncedCount += dbCounts.FirstOrDefault(c => c.Status == "vectorized")?.Count ?? 0;
            incompleteCount = dbCounts.FirstOrDefault(c => c.Status == "incomplete")?.Count ?? 0;
            notProcessedCount = dbCounts.FirstOrDefault(c => c.Status == "not-processed")?.Count ?? 0;
        }

        bool hasMorePages = true;

        while (hasMorePages && processedInRun < maxToProcess)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var take = Math.Min(batchSize, maxToProcess - processedInRun);
            var (batch, total) = await _upstreamApi.GetCandidatesPagedAsync(token, pageOffset, take, year);
            totalRecords = total;

            if (batch.Count == 0)
                break;

            _logger.LogInformation("Fetched candidate batch: offset={Offset}, count={Count}, total={Total}", pageOffset, batch.Count, totalRecords);

            if (year.HasValue && year.Value <= 2013)
            {
                var cutoff = new DateTime(2014, 1, 1, 0, 0, 0, DateTimeKind.Utc);
                batch = batch
                    .Where(c => !c.StatusUpdate.HasValue || c.StatusUpdate.Value < cutoff)
                    .ToList();
            }

            var fetchTasks = batch.Select(async basicCand =>
            {
                try
                {
                    var detailTask = _upstreamApi.GetCandidateDetailAsync(token, basicCand.CandidateId);
                    var notesTask = LoadOrEmpty("Notes", () => _upstreamApi.GetCandidateNotesAsync(token, basicCand.CandidateId));
                    await Task.WhenAll(detailTask, notesTask);

                    return (
                        Candidate: basicCand,
                        Detail: (CandidateDetail?)detailTask.Result,
                        Notes: (List<PersonaNote>?)notesTask.Result,
                        FetchError: (Exception?)null
                    );
                }
                catch (Exception ex)
                {
                    return (
                        Candidate: basicCand,
                        Detail: (CandidateDetail?)null,
                        Notes: (List<PersonaNote>?)null,
                        FetchError: (Exception?)ex
                    );
                }
            }).ToList();

            var fetchResults = await Task.WhenAll(fetchTasks);

            foreach (var result in fetchResults)
            {
                fetchedRecords++;
                processedInRun++;

                SyncedCandidate? entity = null;
                bool resumeChanged = false;
                string syncDetail = "not-processed";
                Exception? fatalError = null;

                try
                {
                    try
                    {
                        if (result.FetchError != null)
                            throw result.FetchError;

                        entity = BuildCandidateEntity(result.Detail!, result.Notes!, seniorities, mainSkills, countries, result.Candidate);
                        (_, resumeChanged, syncDetail) = await UpsertCandidateAsync(entity, cancellationToken);
                        await EnqueueEmbeddingIfEligible("candidates", entity.Id, entity.UpstreamId,
                            entity.FullName, entity.ResumeNoteId, entity.ResumeFilename,
                            false, token, entity.HasResume, entity.Status);
                    }
                    catch (Exception ex)
                    {
                        entity = new SyncedCandidate
                        {
                            UpstreamId = result.Candidate.CandidateId,
                            FullName = result.Candidate.FullName ?? string.Empty,
                            Email = result.Candidate.Email ?? string.Empty,
                            MainSkill = result.Candidate.MainSkill ?? string.Empty,
                            Seniority = result.Candidate.SeniorityText ?? string.Empty,
                            Country = result.Candidate.Country ?? string.Empty,
                            CoeCertified = !string.IsNullOrEmpty(result.Candidate.CoeCertifiedStatus),
                            CandidateStatus = result.Candidate.CandidateStatusName,
                            LastStatusUpdate = ToUtc(result.Candidate.StatusUpdate),
                            Status = "not-processed",
                            StatusReason = ex.Message,
                            SyncedAt = DateTime.UtcNow
                        };

                        var existingOnError = await _dbContext.SyncedCandidates
                            .FirstOrDefaultAsync(e => e.UpstreamId == entity.UpstreamId, cancellationToken);
                        if (existingOnError != null)
                        {
                            existingOnError.FullName = entity.FullName;
                            existingOnError.Email = entity.Email;
                            existingOnError.MainSkill = entity.MainSkill;
                            existingOnError.Seniority = entity.Seniority;
                            existingOnError.Country = entity.Country;
                            existingOnError.CoeCertified = entity.CoeCertified;
                            existingOnError.CandidateStatus = entity.CandidateStatus;
                            existingOnError.LastStatusUpdate = entity.LastStatusUpdate;
                            existingOnError.Status = entity.Status;
                            existingOnError.StatusReason = entity.StatusReason;
                            existingOnError.SyncedAt = entity.SyncedAt;
                        }
                        else
                        {
                            _dbContext.SyncedCandidates.Add(entity);
                        }
                        await _dbContext.SaveChangesAsync(cancellationToken);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to sync candidate {UpstreamId} ({Name}) — skipping",
                        result.Candidate.CandidateId, result.Candidate.FullName);
                    fatalError = ex;
                }

                if (fatalError != null)
                {
                    notProcessedCount++;

                    yield return new SyncRecordEvent(new SyncRecordDto
                    {
                        Id = $"cand-{result.Candidate.CandidateId}",
                        Source = "candidates",
                        Status = "not-processed",
                        Name = result.Candidate.FullName ?? "Unknown",
                        Email = result.Candidate.Email ?? string.Empty,
                        Reason = fatalError.Message,
                        UpstreamId = result.Candidate.CandidateId,
                        HasResume = false,
                        Failed = false,
                        SyncDetail = "error",
                        SyncedAt = DateTime.UtcNow.ToString("o"),
                    });

                    yield return new SyncProgressEvent(new SyncProgressDto
                    {
                        TotalRecords = totalRecords,
                        FetchedRecords = fetchedRecords,
                        SyncedCount = syncedCount,
                        IncompleteCount = incompleteCount,
                        NotProcessedCount = notProcessedCount,
                        UpdatedCount = updatedCount,
                        UnchangedCount = unchangedCount,
                        CurrentRecord = result.Candidate.FullName ?? "Unknown",
                        Status = "syncing"
                    });

                    continue;
                }

                if (entity!.Status == "incomplete")
                    incompleteCount++;
                else if (entity.Status == "not-processed")
                    notProcessedCount++;
                else
                {
                    switch (syncDetail)
                    {
                        case "new": syncedCount++; break;
                        case "updated": updatedCount++; break;
                        case "unchanged": unchangedCount++; break;
                    }
                }

                yield return new SyncRecordEvent(MapCandidateToDto(entity, resumeChanged, syncDetail));

                yield return new SyncProgressEvent(new SyncProgressDto
                {
                    TotalRecords = totalRecords,
                    FetchedRecords = fetchedRecords,
                    SyncedCount = syncedCount,
                    IncompleteCount = incompleteCount,
                    NotProcessedCount = notProcessedCount,
                    UpdatedCount = updatedCount,
                    UnchangedCount = unchangedCount,
                    CurrentRecord = entity.FullName,
                    Status = "syncing"
                });

                if (processedInRun >= maxToProcess)
                    break;
            }

            pageOffset += batch.Count;
            hasMorePages = pageOffset < totalRecords;
        }

        yield return new SyncCompleteEvent(new SyncProgressDto
        {
            TotalRecords = totalRecords,
            FetchedRecords = fetchedRecords,
            SyncedCount = syncedCount,
            IncompleteCount = incompleteCount,
            NotProcessedCount = notProcessedCount,
            UpdatedCount = updatedCount,
            UnchangedCount = unchangedCount,
            Status = "completed"
        });
    }

    private static DateTime? ToUtc(DateTime? dt) =>
        dt.HasValue ? DateTime.SpecifyKind(dt.Value, DateTimeKind.Utc) : null;

    private SyncedEmployee BuildEmployeeEntity(
        EmployeeDetail detail,
        List<EmployeeContract> contracts,
        List<EmployeeRate> rates,
        List<PersonaNote> notes,
        Dictionary<int, string> seniorities,
        Dictionary<int, string> mainSkills,
        Dictionary<int, string> countries,
        EmployeeDetail basicEmployee)
    {
        var contract = contracts.FirstOrDefault();
        var rate = rates
            .OrderByDescending(r => DateTime.TryParse(r.StartDate, out var d) ? d : DateTime.MinValue)
            .FirstOrDefault();
        var resumeNote = notes
            .Where(n => n.NoteTypeName == "Resume"
                && !string.IsNullOrEmpty(n.Filename)
                && SupportedResumeExtensions.Contains(Path.GetExtension(n.Filename)))
            .OrderByDescending(n => n.DateCreated)
            .FirstOrDefault();

        var seniority = seniorities.GetValueOrDefault(detail.Seniority, "Unknown");

        var mainSkill = mainSkills.Count > 0
            ? mainSkills.GetValueOrDefault(detail.MainSkillId, basicEmployee.MainSkillName)
            : basicEmployee.MainSkillName;

        var country = countries.Count > 0
            ? countries.GetValueOrDefault(detail.CountryId, basicEmployee.OfficeName)
            : basicEmployee.OfficeName;

        var isBench = rate != null
            ? string.Equals(rate.ProjectName, "Unosquare - Bench", StringComparison.OrdinalIgnoreCase)
            : string.IsNullOrEmpty(detail.AccountName) ||
              string.Equals(detail.AccountName, "Bench", StringComparison.OrdinalIgnoreCase);

        if (isBench || rates.Count > 0)
            _logger.LogInformation(
                "[BENCH-TRACE] Employee {Id} ({Name}): rateCount={RateCount}, mostRecentProject={Project}, isBench={IsBench}",
                detail.UserId, detail.FullName, rates.Count,
                rate?.ProjectName ?? "(no rates)", isBench);

        var missingFields = new List<string>();
        if (string.IsNullOrEmpty(detail.FullName)) missingFields.Add("FullName");
        if (string.IsNullOrEmpty(detail.Email)) missingFields.Add("Email");
        if (seniority == "Unknown") missingFields.Add("Seniority");
        if (string.IsNullOrEmpty(mainSkill)) missingFields.Add("MainSkill");
        if (resumeNote == null) missingFields.Add("Resume");

        var recordStatus = missingFields.Count == 0 ? "synced" : "incomplete";
        var statusReason = missingFields.Count > 0 ? $"Missing: {string.Join(", ", missingFields)}" : null;

        DateTime? lastAccountStartDate = null;
        if (rate != null && DateTime.TryParse(rate.StartDate, out var parsedStartDate))
            lastAccountStartDate = DateTime.SpecifyKind(parsedStartDate, DateTimeKind.Utc);

        return new SyncedEmployee
        {
            UpstreamId = detail.UserId,
            FullName = detail.FullName,
            Email = detail.Email,
            Seniority = seniority,
            MainSkill = mainSkill,
            Country = country,
            GrossMonthlySalary = contract?.Salary,
            SalaryCurrency = contract?.CurrencyCode,
            LastAccount = isBench ? null : detail.AccountName,
            LastAccountStartDate = lastAccountStartDate,
            Rate = rate?.Rate,
            HasResume = resumeNote != null,
            ResumeNoteId = resumeNote?.PersonaNoteId,
            ResumeDateCreated = ToUtc(resumeNote?.DateCreated),
            ResumeFilename = resumeNote?.Filename,
            IsBench = isBench,
            JobTitle = detail.JobTitle ?? basicEmployee.JobTitle ?? string.Empty,
            Status = recordStatus,
            StatusReason = statusReason,
            SyncedAt = DateTime.UtcNow
        };
    }

    private SyncedCandidate BuildCandidateEntity(
        CandidateDetail detail,
        List<PersonaNote> notes,
        Dictionary<int, string> seniorities,
        Dictionary<int, string> mainSkills,
        Dictionary<int, string> countries,
        CandidateDetail pagedFallback)
    {
        var resumeNote = notes
            .Where(n => n.NoteTypeName == "Resume"
                && !string.IsNullOrEmpty(n.Filename)
                && SupportedResumeExtensions.Contains(Path.GetExtension(n.Filename)))
            .OrderByDescending(n => n.DateCreated)
            .FirstOrDefault();

        var fullName = !string.IsNullOrWhiteSpace(detail.FullName)
            ? detail.FullName
            : $"{detail.FirstName} {detail.LastName}".Trim();

        if (string.IsNullOrWhiteSpace(fullName))
            fullName = pagedFallback.FullName;

        var seniority = detail.Seniority.GetValueOrDefault() > 0
            ? seniorities.GetValueOrDefault(detail.Seniority!.Value, pagedFallback.SeniorityText ?? "Unknown")
            : pagedFallback.SeniorityText ?? "Unknown";

        var mainSkill = mainSkills.Count > 0 && detail.MainSkillId.GetValueOrDefault() > 0
            ? mainSkills.GetValueOrDefault(detail.MainSkillId!.Value, pagedFallback.MainSkill)
            : pagedFallback.MainSkill;

        var country = countries.Count > 0 && detail.CountryId.GetValueOrDefault() > 0
            ? countries.GetValueOrDefault(detail.CountryId!.Value, pagedFallback.Country)
            : pagedFallback.Country;

        var missingFields = new List<string>();
        if (string.IsNullOrEmpty(fullName)) missingFields.Add("FullName");
        if (string.IsNullOrEmpty(detail.Email)) missingFields.Add("Email");
        if (seniority == "Unknown") missingFields.Add("Seniority");
        if (string.IsNullOrEmpty(mainSkill)) missingFields.Add("MainSkill");
        if (resumeNote == null) missingFields.Add("Resume");

        var recordStatus = missingFields.Count == 0 ? "synced" : "incomplete";
        var statusReason = missingFields.Count > 0 ? $"Missing: {string.Join(", ", missingFields)}" : null;

        return new SyncedCandidate
        {
            UpstreamId = detail.CandidateId,
            FullName = fullName ?? string.Empty,
            Email = detail.Email,
            Seniority = seniority,
            MainSkill = mainSkill,
            Country = country,
            CurrentSalary = detail.CurrentSalary,
            SalaryCurrency = detail.CurrentSalaryCurrency ?? detail.SalaryCurrency,
            CoeCertified = detail.CoeCertifiedStatusId.GetValueOrDefault() > 0,
            CandidateStatus = detail.CandidateStatusName ?? pagedFallback.CandidateStatusName,
            LastStatusUpdate = ToUtc(detail.StatusUpdate),
            SalaryExpectations = detail.Offer,
            SalaryExpectationsCurrency = detail.DesiredSalaryCurrency,
            HasResume = resumeNote != null,
            ResumeNoteId = resumeNote?.PersonaNoteId,
            ResumeDateCreated = ToUtc(resumeNote?.DateCreated),
            ResumeFilename = resumeNote?.Filename,
            Status = recordStatus,
            StatusReason = statusReason,
            SyncedAt = DateTime.UtcNow
        };
    }

    private async Task<(bool InfoChanged, bool ResumeChanged, string SyncDetail)> UpsertEmployeeAsync(SyncedEmployee entity, CancellationToken ct)
    {
        var existing = await _dbContext.SyncedEmployees
            .FirstOrDefaultAsync(e => e.UpstreamId == entity.UpstreamId, ct);

        if (existing != null)
        {
            var infoChanged =
                existing.FullName != entity.FullName ||
                existing.Email != entity.Email ||
                existing.Seniority != entity.Seniority ||
                existing.MainSkill != entity.MainSkill ||
                existing.Country != entity.Country ||
                existing.GrossMonthlySalary != entity.GrossMonthlySalary ||
                existing.SalaryCurrency != entity.SalaryCurrency ||
                existing.LastAccount != entity.LastAccount ||
                existing.Rate != entity.Rate ||
                existing.IsBench != entity.IsBench ||
                existing.HasResume != entity.HasResume ||
                existing.JobTitle != entity.JobTitle;

            var resumeChanged = entity.HasResume &&
                entity.ResumeDateCreated.HasValue &&
                (existing.ResumeDateCreated == null || entity.ResumeDateCreated > existing.ResumeDateCreated);

            if (!infoChanged && !resumeChanged)
            {
                var needsStatusFix = existing.Status != "extracted" && existing.Status != "vectorized"
                    && (existing.Status != entity.Status || existing.Failed);

                if (needsStatusFix)
                {
                    existing.Status = entity.Status;
                    existing.StatusReason = entity.StatusReason;
                    existing.Failed = false;
                    await _dbContext.SaveChangesAsync(ct);
                }

                return (false, false, "unchanged");
            }

            existing.FullName = entity.FullName;
            existing.Email = entity.Email;
            existing.Seniority = entity.Seniority;
            existing.MainSkill = entity.MainSkill;
            existing.Country = entity.Country;
            existing.GrossMonthlySalary = entity.GrossMonthlySalary;
            existing.SalaryCurrency = entity.SalaryCurrency;
            existing.LastAccount = entity.LastAccount;
            existing.LastAccountStartDate = entity.LastAccountStartDate;
            existing.Rate = entity.Rate;
            existing.HasResume = entity.HasResume;
            existing.IsBench = entity.IsBench;
            existing.JobTitle = entity.JobTitle;
            existing.SyncedAt = entity.SyncedAt;

            if (resumeChanged)
            {
                existing.ResumeNoteId = entity.ResumeNoteId;
                existing.ResumeDateCreated = entity.ResumeDateCreated;
                existing.ResumeFilename = entity.ResumeFilename;

                var oldEmbedding = await _dbContext.ResumeEmbeddings
                    .FirstOrDefaultAsync(e => e.SourceType == "employees" && e.SourceId == existing.Id, ct);
                if (oldEmbedding != null)
                    _dbContext.ResumeEmbeddings.Remove(oldEmbedding);

                existing.Status = entity.Status;
                existing.Failed = false;
            }
            else if (infoChanged && existing.Status != "extracted" && existing.Status != "vectorized")
            {
                existing.Status = entity.Status;
                existing.Failed = false;
            }

            existing.StatusReason = entity.StatusReason;
            await _dbContext.SaveChangesAsync(ct);

            return (infoChanged, resumeChanged, "updated");
        }

        _dbContext.SyncedEmployees.Add(entity);
        await _dbContext.SaveChangesAsync(ct);
        return (true, false, "new");
    }

    private async Task<(bool InfoChanged, bool ResumeChanged, string SyncDetail)> UpsertCandidateAsync(SyncedCandidate entity, CancellationToken ct)
    {
        var existing = await _dbContext.SyncedCandidates
            .FirstOrDefaultAsync(e => e.UpstreamId == entity.UpstreamId, ct);

        if (existing != null)
        {
            var infoChanged =
                existing.FullName != entity.FullName ||
                existing.Email != entity.Email ||
                existing.Seniority != entity.Seniority ||
                existing.MainSkill != entity.MainSkill ||
                existing.Country != entity.Country ||
                existing.CurrentSalary != entity.CurrentSalary ||
                existing.SalaryCurrency != entity.SalaryCurrency ||
                existing.CoeCertified != entity.CoeCertified ||
                existing.CandidateStatus != entity.CandidateStatus ||
                existing.LastStatusUpdate != entity.LastStatusUpdate ||
                existing.SalaryExpectations != entity.SalaryExpectations ||
                existing.SalaryExpectationsCurrency != entity.SalaryExpectationsCurrency ||
                existing.HasResume != entity.HasResume;

            var resumeChanged = entity.HasResume &&
                entity.ResumeDateCreated.HasValue &&
                (existing.ResumeDateCreated == null || entity.ResumeDateCreated > existing.ResumeDateCreated);

            if (!infoChanged && !resumeChanged)
            {
                var needsStatusFix = existing.Status != "extracted" && existing.Status != "vectorized"
                    && (existing.Status != entity.Status || existing.Failed);

                if (needsStatusFix)
                {
                    existing.Status = entity.Status;
                    existing.StatusReason = entity.StatusReason;
                    existing.Failed = false;
                    await _dbContext.SaveChangesAsync(ct);
                }

                return (false, false, "unchanged");
            }

            existing.FullName = entity.FullName;
            existing.Email = entity.Email;
            existing.Seniority = entity.Seniority;
            existing.MainSkill = entity.MainSkill;
            existing.Country = entity.Country;
            existing.CurrentSalary = entity.CurrentSalary;
            existing.SalaryCurrency = entity.SalaryCurrency;
            existing.CoeCertified = entity.CoeCertified;
            existing.CandidateStatus = entity.CandidateStatus;
            existing.LastStatusUpdate = entity.LastStatusUpdate;
            existing.SalaryExpectations = entity.SalaryExpectations;
            existing.SalaryExpectationsCurrency = entity.SalaryExpectationsCurrency;
            existing.HasResume = entity.HasResume;
            existing.SyncedAt = entity.SyncedAt;

            if (resumeChanged)
            {
                existing.ResumeNoteId = entity.ResumeNoteId;
                existing.ResumeDateCreated = entity.ResumeDateCreated;
                existing.ResumeFilename = entity.ResumeFilename;

                var oldEmbedding = await _dbContext.ResumeEmbeddings
                    .FirstOrDefaultAsync(e => e.SourceType == "candidates" && e.SourceId == existing.Id, ct);
                if (oldEmbedding != null)
                    _dbContext.ResumeEmbeddings.Remove(oldEmbedding);

                existing.Status = entity.Status;
                existing.Failed = false;
            }
            else if (infoChanged && existing.Status != "extracted" && existing.Status != "vectorized")
            {
                existing.Status = entity.Status;
                existing.Failed = false;
            }

            existing.StatusReason = entity.StatusReason;
            await _dbContext.SaveChangesAsync(ct);

            return (infoChanged, resumeChanged, "updated");
        }

        _dbContext.SyncedCandidates.Add(entity);
        await _dbContext.SaveChangesAsync(ct);
        return (true, false, "new");
    }

    private async Task EnqueueEmbeddingIfEligible(
        string source, int dbId, int upstreamId, string name,
        int? resumeNoteId, string? resumeFilename, bool isBench,
        string token, bool hasResume, string status)
    {
        if (!hasResume || status != "synced") return;

        await _embeddingQueue.EnqueueAsync(new EmbeddingJob(
            Source: source,
            DbId: dbId,
            UpstreamId: upstreamId,
            Name: name,
            ResumeNoteId: resumeNoteId,
            ResumeFilename: resumeFilename,
            IsBench: isBench,
            Token: token
        ));
    }

    private static SyncRecordDto MapEmployeeToDto(SyncedEmployee entity, bool resumeChanged, string syncDetail) => new()
    {
        Id = $"emp-{entity.UpstreamId}",
        Source = "employees",
        Status = entity.Status,
        Name = entity.FullName,
        Email = entity.Email,
        Seniority = entity.Seniority,
        MainSkill = entity.MainSkill,
        Country = entity.Country,
        GrossMonthlySalary = entity.GrossMonthlySalary,
        Currency = entity.SalaryCurrency,
        ExpectedRate = entity.Rate,
        LastAccount = entity.LastAccount,
        LastAccountStartDate = entity.LastAccountStartDate?.ToString("o"),
        HasResume = entity.HasResume,
        ResumeNoteId = entity.ResumeNoteId,
        ResumeFilename = entity.ResumeFilename,
        IsBench = entity.IsBench,
        Reason = entity.StatusReason,
        ResumeChanged = resumeChanged,
        UpstreamId = entity.UpstreamId,
        Failed = entity.Failed,
        SyncDetail = syncDetail,
        SyncedAt = entity.SyncedAt.ToString("o"),
        ResumeDateCreated = entity.ResumeDateCreated?.ToString("o"),
        JobTitle = entity.JobTitle,
    };

    private static SyncRecordDto MapCandidateToDto(SyncedCandidate entity, bool resumeChanged, string syncDetail) => new()
    {
        Id = $"cand-{entity.UpstreamId}",
        Source = "candidates",
        Status = entity.Status,
        Name = entity.FullName,
        Email = entity.Email ?? string.Empty,
        Seniority = entity.Seniority,
        MainSkill = entity.MainSkill,
        Country = entity.Country,
        GrossMonthlySalary = entity.CurrentSalary,
        Currency = entity.SalaryCurrency,
        CoeCertified = entity.CoeCertified,
        CandidateStatus = entity.CandidateStatus,
        LastStatusUpdate = entity.LastStatusUpdate?.ToString("o"),
        SalaryExpectations = entity.SalaryExpectations,
        SalaryExpectationsCurrency = entity.SalaryExpectationsCurrency,
        HasResume = entity.HasResume,
        ResumeNoteId = entity.ResumeNoteId,
        ResumeFilename = entity.ResumeFilename,
        Reason = entity.StatusReason,
        ResumeChanged = resumeChanged,
        UpstreamId = entity.UpstreamId,
        Failed = entity.Failed,
        SyncDetail = syncDetail,
        SyncedAt = entity.SyncedAt.ToString("o"),
        ResumeDateCreated = entity.ResumeDateCreated?.ToString("o"),
    };

    private async Task<SyncRecordDto> SyncSingleOpenPositionAsync(string token, int upstreamId, CancellationToken ct)
    {
        var detail = await _upstreamApi.GetOpenPositionDetailAsync(token, upstreamId);
        var candidates = await LoadOrEmpty("PresentedCandidates", () => _upstreamApi.GetPresentedCandidatesAsync(token, upstreamId));

        var pagedFallback = new OpenPositionListItem { Id = upstreamId };
        var entity = BuildOpenPositionEntity(pagedFallback, detail ?? new OpenPositionDetail(), candidates);
        var (_, syncDetail) = await UpsertOpenPositionAsync(entity, candidates, ct);
        await EnqueueEmbeddingIfEligible("open-positions", entity.Id, entity.UpstreamId,
            $"{entity.Account} - {entity.MainSkill}", null, null,
            false, token, !string.IsNullOrEmpty(entity.JobDescription), entity.Status);

        return MapOpenPositionToDto(entity, syncDetail, candidates.Count);
    }

    private async IAsyncEnumerable<SyncEvent> SyncOpenPositionsAsync(string token, int? limit, int? skipRecords, [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        const int batchSize = 20;
        int pageOffset = skipRecords ?? 0;
        int totalRecords = 0;
        int syncedCount = 0;
        int incompleteCount = 0;
        int notProcessedCount = 0;
        int updatedCount = 0;
        int unchangedCount = 0;
        int fetchedRecords = skipRecords ?? 0;
        int maxToProcess = limit ?? int.MaxValue;
        int processedInRun = 0;

        if (skipRecords.HasValue && skipRecords.Value > 0)
        {
            var dbCounts = await _dbContext.SyncedOpenPositions
                .GroupBy(e => e.Status)
                .Select(g => new { Status = g.Key, Count = g.Count() })
                .ToListAsync(cancellationToken);

            syncedCount = dbCounts.FirstOrDefault(c => c.Status == "synced")?.Count ?? 0;
            syncedCount += dbCounts.FirstOrDefault(c => c.Status == "vectorized")?.Count ?? 0;
            incompleteCount = dbCounts.FirstOrDefault(c => c.Status == "incomplete")?.Count ?? 0;
            notProcessedCount = dbCounts.FirstOrDefault(c => c.Status == "not-processed")?.Count ?? 0;
        }

        bool hasMorePages = true;

        while (hasMorePages && processedInRun < maxToProcess)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var take = Math.Min(batchSize, maxToProcess - processedInRun);
            var (batch, total) = await _upstreamApi.GetOpenPositionsPagedAsync(token, pageOffset, take);
            totalRecords = total;

            if (batch.Count == 0)
                break;

            _logger.LogInformation("Fetched open positions batch: offset={Offset}, count={Count}, total={Total}", pageOffset, batch.Count, totalRecords);

            const int concurrency = 5;
            for (int batchStart = 0; batchStart < batch.Count; batchStart += concurrency)
            {
                cancellationToken.ThrowIfCancellationRequested();

                var currentBatch = batch.Skip(batchStart).Take(concurrency).ToList();

                var fetchTasks = currentBatch.Select(async basicOp =>
                {
                    try
                    {
                        var detailTask = _upstreamApi.GetOpenPositionDetailAsync(token, basicOp.Id);
                        var candidatesTask = LoadOrEmpty("PresentedCandidates", () => _upstreamApi.GetPresentedCandidatesAsync(token, basicOp.Id));
                        await Task.WhenAll(detailTask, candidatesTask);

                        return (
                            Position: basicOp,
                            Detail: (OpenPositionDetail?)detailTask.Result,
                            Candidates: (List<PresentedCandidateItem>?)candidatesTask.Result,
                            FetchError: (Exception?)null
                        );
                    }
                    catch (Exception ex)
                    {
                        return (
                            Position: basicOp,
                            Detail: (OpenPositionDetail?)null,
                            Candidates: (List<PresentedCandidateItem>?)null,
                            FetchError: (Exception?)ex
                        );
                    }
                }).ToList();

                var fetchResults = await Task.WhenAll(fetchTasks);

                foreach (var result in fetchResults)
                {
                    fetchedRecords++;
                    processedInRun++;

                    SyncedOpenPosition? entity = null;
                    string syncDetail = "not-processed";
                    Exception? fatalError = null;

                    try
                    {
                        try
                        {
                            if (result.FetchError != null)
                                throw result.FetchError;

                            entity = BuildOpenPositionEntity(result.Position, result.Detail ?? new OpenPositionDetail(), result.Candidates ?? new List<PresentedCandidateItem>());
                            (_, syncDetail) = await UpsertOpenPositionAsync(entity, result.Candidates ?? new List<PresentedCandidateItem>(), cancellationToken);
                            await EnqueueEmbeddingIfEligible("open-positions", entity.Id, entity.UpstreamId,
                                $"{entity.Account} - {entity.MainSkill}", null, null,
                                false, token, !string.IsNullOrEmpty(entity.JobDescription), entity.Status);
                        }
                        catch (Exception ex)
                        {
                            entity = new SyncedOpenPosition
                            {
                                UpstreamId = result.Position.Id,
                                Account = result.Position.Account ?? string.Empty,
                                Coe = result.Position.Coe ?? string.Empty,
                                Practice = result.Position.Practice ?? string.Empty,
                                Stakeholder = result.Position.Stakeholder ?? string.Empty,
                                MainSkill = result.Position.MainSkill ?? string.Empty,
                                Countries = result.Position.Countries ?? string.Empty,
                                Seniorities = result.Position.Seniorities ?? string.Empty,
                                AvailableRange = result.Position.AvailableRange ?? string.Empty,
                                Status = "not-processed",
                                StatusReason = ex.Message,
                                SyncedAt = DateTime.UtcNow
                            };

                            var existingOnError = await _dbContext.SyncedOpenPositions
                                .FirstOrDefaultAsync(e => e.UpstreamId == entity.UpstreamId, cancellationToken);
                            if (existingOnError != null)
                            {
                                existingOnError.Account = entity.Account;
                                existingOnError.Coe = entity.Coe;
                                existingOnError.Practice = entity.Practice;
                                existingOnError.MainSkill = entity.MainSkill;
                                existingOnError.Status = entity.Status;
                                existingOnError.StatusReason = entity.StatusReason;
                                existingOnError.SyncedAt = entity.SyncedAt;
                            }
                            else
                            {
                                _dbContext.SyncedOpenPositions.Add(entity);
                            }
                            await _dbContext.SaveChangesAsync(cancellationToken);
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to sync open position {UpstreamId} ({Account}) — skipping",
                            result.Position.Id, result.Position.Account);
                        fatalError = ex;

                        try
                        {
                            _dbContext.ChangeTracker.Clear();

                            var fallback = await _dbContext.SyncedOpenPositions
                                .FirstOrDefaultAsync(e => e.UpstreamId == result.Position.Id, cancellationToken);

                            if (fallback != null)
                            {
                                fallback.Status = "not-processed";
                                fallback.StatusReason = ex.Message;
                                fallback.SyncedAt = DateTime.UtcNow;
                            }
                            else
                            {
                                _dbContext.SyncedOpenPositions.Add(new SyncedOpenPosition
                                {
                                    UpstreamId = result.Position.Id,
                                    Account = result.Position.Account ?? string.Empty,
                                    Coe = result.Position.Coe ?? string.Empty,
                                    Practice = result.Position.Practice ?? string.Empty,
                                    Stakeholder = result.Position.Stakeholder ?? string.Empty,
                                    MainSkill = result.Position.MainSkill ?? string.Empty,
                                    Countries = result.Position.Countries ?? string.Empty,
                                    Seniorities = result.Position.Seniorities ?? string.Empty,
                                    AvailableRange = result.Position.AvailableRange ?? string.Empty,
                                    Status = "not-processed",
                                    StatusReason = ex.Message,
                                    SyncedAt = DateTime.UtcNow
                                });
                            }

                            await _dbContext.SaveChangesAsync(cancellationToken);
                        }
                        catch (Exception persistEx)
                        {
                            _logger.LogError(persistEx, "Last-resort persist also failed for OP {UpstreamId}", result.Position.Id);
                        }
                    }

                    var candidatesCount = result.Candidates?.Count ?? 0;

                    if (fatalError != null)
                    {
                        notProcessedCount++;

                        yield return new SyncRecordEvent(new SyncRecordDto
                        {
                            Id = $"op-{result.Position.Id}",
                            Source = "open-positions",
                            Status = "not-processed",
                            Name = $"[{result.Position.Id}] {result.Position.Account} - {result.Position.MainSkill}",
                            Email = string.Empty,
                            MainSkill = result.Position.MainSkill,
                            Account = result.Position.Account,
                            Coe = result.Position.Coe,
                            Practice = result.Position.Practice,
                            Reason = fatalError.Message,
                            UpstreamId = result.Position.Id,
                            Failed = false,
                            SyncDetail = "error",
                            SyncedAt = DateTime.UtcNow.ToString("o"),
                        });

                        yield return new SyncProgressEvent(new SyncProgressDto
                        {
                            TotalRecords = totalRecords,
                            FetchedRecords = fetchedRecords,
                            SyncedCount = syncedCount,
                            IncompleteCount = incompleteCount,
                            NotProcessedCount = notProcessedCount,
                            UpdatedCount = updatedCount,
                            UnchangedCount = unchangedCount,
                            CurrentRecord = $"[{result.Position.Id}] {result.Position.Account} - {result.Position.MainSkill}",
                            Status = "syncing"
                        });

                        continue;
                    }

                    if (entity!.Status == "incomplete")
                        incompleteCount++;
                    else if (entity.Status == "not-processed")
                        notProcessedCount++;
                    else
                    {
                        switch (syncDetail)
                        {
                            case "new": syncedCount++; break;
                            case "updated": updatedCount++; break;
                            case "unchanged": unchangedCount++; break;
                        }
                    }

                    yield return new SyncRecordEvent(MapOpenPositionToDto(entity, syncDetail, candidatesCount));

                    yield return new SyncProgressEvent(new SyncProgressDto
                    {
                        TotalRecords = totalRecords,
                        FetchedRecords = fetchedRecords,
                        SyncedCount = syncedCount,
                        IncompleteCount = incompleteCount,
                        NotProcessedCount = notProcessedCount,
                        UpdatedCount = updatedCount,
                        UnchangedCount = unchangedCount,
                        CurrentRecord = $"[{entity.UpstreamId}] {entity.Account} - {entity.MainSkill}",
                        Status = "syncing"
                    });

                    if (processedInRun >= maxToProcess)
                        break;
                }
            }

            pageOffset += batch.Count;
            hasMorePages = pageOffset < totalRecords;
        }

        yield return new SyncCompleteEvent(new SyncProgressDto
        {
            TotalRecords = totalRecords,
            FetchedRecords = fetchedRecords,
            SyncedCount = syncedCount,
            IncompleteCount = incompleteCount,
            NotProcessedCount = notProcessedCount,
            UpdatedCount = updatedCount,
            UnchangedCount = unchangedCount,
            Status = "completed"
        });
    }

    private static SyncedOpenPosition BuildOpenPositionEntity(
        OpenPositionListItem paged,
        OpenPositionDetail detail,
        List<PresentedCandidateItem> candidates)
    {
        var missingFields = new List<string>();
        if (string.IsNullOrEmpty(paged.Account)) missingFields.Add("Account");
        if (string.IsNullOrEmpty(paged.MainSkill)) missingFields.Add("MainSkill");
        if (string.IsNullOrEmpty(detail.JobDescription)) missingFields.Add("JobDescription");

        var recordStatus = missingFields.Count == 0 ? "synced" : "incomplete";
        var statusReason = missingFields.Count > 0 ? $"Missing: {string.Join(", ", missingFields)}" : null;

        return new SyncedOpenPosition
        {
            UpstreamId = paged.Id,
            Account = !string.IsNullOrEmpty(paged.Account) ? paged.Account : detail.CompanyName ?? string.Empty,
            Coe = paged.Coe ?? string.Empty,
            Practice = paged.Practice ?? string.Empty,
            Stakeholder = paged.Stakeholder ?? string.Empty,
            MainSkill = !string.IsNullOrEmpty(detail.MainSkillName) ? detail.MainSkillName : paged.MainSkill ?? string.Empty,
            Countries = paged.Countries ?? string.Empty,
            Seniorities = paged.Seniorities ?? string.Empty,
            AvailableRange = paged.AvailableRange ?? string.Empty,
            AccountOverview = detail.CompanyName ?? string.Empty,
            JobDescription = detail.JobDescription ?? string.Empty,
            JobTitle = detail.JobTitle ?? string.Empty,
            PositionStatus = "Active",
            Aging = paged.Aging,
            Created = paged.Created,
            ReadyDate = paged.ReadyDate,
            LastModification = paged.LastModification,
            Sourcing = paged.Sourcing ?? string.Empty,
            Replacement = paged.Replacement,
            Status = recordStatus,
            StatusReason = statusReason,
            SyncedAt = DateTime.UtcNow
        };
    }

    private async Task<(bool InfoChanged, string SyncDetail)> UpsertOpenPositionAsync(
        SyncedOpenPosition entity,
        List<PresentedCandidateItem> candidates,
        CancellationToken ct)
    {
        var existing = await _dbContext.SyncedOpenPositions
            .FirstOrDefaultAsync(e => e.UpstreamId == entity.UpstreamId, ct);

        if (existing != null)
        {
            var infoChanged =
                existing.Account != entity.Account ||
                existing.Coe != entity.Coe ||
                existing.Practice != entity.Practice ||
                existing.Stakeholder != entity.Stakeholder ||
                existing.MainSkill != entity.MainSkill ||
                existing.Countries != entity.Countries ||
                existing.Seniorities != entity.Seniorities ||
                existing.AvailableRange != entity.AvailableRange ||
                existing.AccountOverview != entity.AccountOverview ||
                existing.JobDescription != entity.JobDescription ||
                existing.JobTitle != entity.JobTitle ||
                existing.Aging != entity.Aging ||
                existing.Sourcing != entity.Sourcing ||
                existing.Replacement != entity.Replacement;

            if (!infoChanged)
            {
                var needsStatusFix = existing.Status != "vectorized"
                    && (existing.Status != entity.Status || existing.Failed);

                if (needsStatusFix)
                {
                    existing.Status = entity.Status;
                    existing.StatusReason = entity.StatusReason;
                    existing.Failed = false;
                    await _dbContext.SaveChangesAsync(ct);
                }

                await ReplaceCandidatesAsync(existing.Id, candidates, ct);
                return (false, "unchanged");
            }

            existing.Account = entity.Account;
            existing.Coe = entity.Coe;
            existing.Practice = entity.Practice;
            existing.Stakeholder = entity.Stakeholder;
            existing.MainSkill = entity.MainSkill;
            existing.Countries = entity.Countries;
            existing.Seniorities = entity.Seniorities;
            existing.AvailableRange = entity.AvailableRange;
            existing.AccountOverview = entity.AccountOverview;
            existing.JobDescription = entity.JobDescription;
            existing.JobTitle = entity.JobTitle;
            existing.Aging = entity.Aging;
            existing.Created = entity.Created;
            existing.ReadyDate = entity.ReadyDate;
            existing.LastModification = entity.LastModification;
            existing.Sourcing = entity.Sourcing;
            existing.Replacement = entity.Replacement;
            existing.SyncedAt = entity.SyncedAt;

            if (existing.JobDescription != entity.JobDescription)
            {
                var oldEmbedding = await _dbContext.ResumeEmbeddings
                    .FirstOrDefaultAsync(e => e.SourceType == "open-positions" && e.SourceId == existing.Id, ct);
                if (oldEmbedding != null)
                    _dbContext.ResumeEmbeddings.Remove(oldEmbedding);

                existing.Status = entity.Status;
                existing.Failed = false;
            }
            else if (existing.Status != "vectorized")
            {
                existing.Status = entity.Status;
                existing.Failed = false;
            }

            existing.StatusReason = entity.StatusReason;
            await _dbContext.SaveChangesAsync(ct);

            await ReplaceCandidatesAsync(existing.Id, candidates, ct);
            return (true, "updated");
        }

        _dbContext.SyncedOpenPositions.Add(entity);
        await _dbContext.SaveChangesAsync(ct);

        await ReplaceCandidatesAsync(entity.Id, candidates, ct);
        return (true, "new");
    }

    private async Task ReplaceCandidatesAsync(int openPositionId, List<PresentedCandidateItem> candidates, CancellationToken ct)
    {
        var existingCandidates = await _dbContext.OpenPositionCandidates
            .Where(c => c.OpenPositionId == openPositionId)
            .ToListAsync(ct);

        _dbContext.OpenPositionCandidates.RemoveRange(existingCandidates);

        var newCandidates = candidates.Select(c => new OpenPositionCandidate
        {
            OpenPositionId = openPositionId,
            CandidateRequisitionId = c.CandidateRequisitionId,
            CandidateId = c.CandidateId,
            CandidateName = c.Candidate,
            MainSkill = c.Skills,
            IsEmployee = c.IsEmployee,
            CandidateStatus = c.CandidateStatusName,
            Rate = c.Rate ?? 0m,
            StartDate = c.StartDate,
            SyncedAt = DateTime.UtcNow
        }).ToList();

        _dbContext.OpenPositionCandidates.AddRange(newCandidates);
        await _dbContext.SaveChangesAsync(ct);
    }

    private static SyncRecordDto MapOpenPositionToDto(SyncedOpenPosition entity, string syncDetail, int candidatesCount) => new()
    {
        Id = $"op-{entity.UpstreamId}",
        Source = "open-positions",
        Status = entity.Status,
        Name = $"[{entity.UpstreamId}] {entity.Account} - {entity.MainSkill}",
        Email = string.Empty,
        MainSkill = entity.MainSkill,
        Account = entity.Account,
        Coe = entity.Coe,
        Practice = entity.Practice,
        Stakeholder = entity.Stakeholder,
        Countries = entity.Countries,
        Seniorities = entity.Seniorities,
        AvailableRange = entity.AvailableRange,
        PositionStatus = entity.PositionStatus,
        Aging = entity.Aging,
        HasJobDescription = !string.IsNullOrEmpty(entity.JobDescription),
        CandidatesCount = candidatesCount,
        JobTitle = entity.JobTitle,
        Reason = entity.StatusReason,
        UpstreamId = entity.UpstreamId,
        Failed = entity.Failed,
        SyncDetail = syncDetail,
        SyncedAt = entity.SyncedAt.ToString("o"),
    };
}
