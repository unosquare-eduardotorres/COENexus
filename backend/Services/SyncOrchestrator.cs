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

    private static readonly HashSet<string> SupportedResumeExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".pdf", ".docx", ".doc"
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
        ILogger<SyncOrchestrator> logger)
    {
        _upstreamApi = upstreamApi;
        _catalogService = catalogService;
        _dbContext = dbContext;
        _logger = logger;
    }

    public async IAsyncEnumerable<SyncEvent> SyncAsync(string source, string token, int? limit = null, int? skip = null, [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        if (source == "employees")
        {
            await foreach (var syncEvent in SyncEmployeesAsync(token, limit, skip, cancellationToken))
                yield return syncEvent;
        }
        else if (source == "candidates")
        {
            await foreach (var syncEvent in SyncCandidatesAsync(token, limit, skip, cancellationToken))
                yield return syncEvent;
        }
    }

    public async Task<SyncRecordDto> SyncSingleAsync(string source, string token, int upstreamId, CancellationToken ct = default)
    {
        if (source == "employees")
            return await SyncSingleEmployeeAsync(token, upstreamId, ct);
        if (source == "candidates")
            return await SyncSingleCandidateAsync(token, upstreamId, ct);

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

        return MapEmployeeToDto(entity, resumeChanged, syncDetail);
    }

    private async Task<SyncRecordDto> SyncSingleCandidateAsync(string token, int upstreamId, CancellationToken ct)
    {
        var detail = await _upstreamApi.GetCandidateDetailAsync(token, upstreamId);
        var notes = await _upstreamApi.GetCandidateNotesAsync(token, upstreamId);

        var entity = BuildCandidateEntity(detail, notes);
        var (_, resumeChanged, syncDetail) = await UpsertCandidateAsync(entity, ct);

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

        foreach (var basicEmployee in allEmployees)
        {
            cancellationToken.ThrowIfCancellationRequested();
            fetchedRecords++;

            SyncedEmployee? entity = null;
            bool resumeChanged = false;
            string syncDetail = "not-processed";
            Exception? fatalError = null;

            try
            {
                try
                {
                    var detail = await _upstreamApi.GetEmployeeDetailAsync(token, basicEmployee.UserId);
                    var contracts = await LoadOrEmpty("Contracts", () => _upstreamApi.GetEmployeeContractsAsync(token, basicEmployee.UserId));
                    var rates = await LoadOrEmpty("Rates", () => _upstreamApi.GetEmployeeRatesAsync(token, basicEmployee.UserId));
                    var notes = await LoadOrEmpty("Notes", () => _upstreamApi.GetEmployeeNotesAsync(token, basicEmployee.UserId));

                    entity = BuildEmployeeEntity(detail, contracts, rates, notes, seniorities, mainSkills, countries, basicEmployee);
                    (_, resumeChanged, syncDetail) = await UpsertEmployeeAsync(entity, cancellationToken);
                }
                catch (Exception ex)
                {
                    entity = new SyncedEmployee
                    {
                        UpstreamId = basicEmployee.UserId,
                        FullName = basicEmployee.FullName ?? string.Empty,
                        Email = basicEmployee.Email ?? string.Empty,
                        JobTitle = basicEmployee.JobTitle ?? string.Empty,
                        MainSkill = basicEmployee.MainSkillName ?? string.Empty,
                        Country = basicEmployee.OfficeName ?? string.Empty,
                        Seniority = seniorities.GetValueOrDefault(basicEmployee.Seniority, string.Empty),
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
                    basicEmployee.UserId, basicEmployee.FullName);
                fatalError = ex;
            }

            if (fatalError != null)
            {
                notProcessedCount++;

                yield return new SyncRecordEvent(new SyncRecordDto
                {
                    Id = $"emp-{basicEmployee.UserId}",
                    Source = "employees",
                    Status = "not-processed",
                    Name = basicEmployee.FullName ?? "Unknown",
                    Email = basicEmployee.Email ?? string.Empty,
                    JobTitle = basicEmployee.JobTitle ?? string.Empty,
                    Reason = fatalError.Message,
                    UpstreamId = basicEmployee.UserId,
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
                    CurrentRecord = basicEmployee.FullName ?? "Unknown",
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

    private async IAsyncEnumerable<SyncEvent> SyncCandidatesAsync(string token, int? limit, int? skipRecords, [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        var allCandidates = new List<CandidateDetail>();
        int pageOffset = 0;
        int totalRecords = 0;
        int pageSize = limit.HasValue ? Math.Min(100, limit.Value) : 100;

        while (true)
        {
            var (items, total) = await _upstreamApi.GetCandidatesPagedAsync(token, pageOffset, pageSize);
            totalRecords = total;
            allCandidates.AddRange(items);
            pageOffset += items.Count;
            if (pageOffset >= totalRecords || items.Count == 0)
                break;
            if (limit.HasValue && allCandidates.Count >= limit.Value)
                break;
        }

        if (limit.HasValue && allCandidates.Count > limit.Value)
            allCandidates = allCandidates.Take(limit.Value).ToList();

        if (skipRecords.HasValue && skipRecords.Value > 0)
        {
            var toSkip = Math.Min(skipRecords.Value, allCandidates.Count);
            _logger.LogInformation("Resuming sync — skipping first {SkipCount} of {Total} candidates", toSkip, allCandidates.Count);
            allCandidates = allCandidates.Skip(toSkip).ToList();
        }

        var totalAfterSkip = allCandidates.Count + (skipRecords ?? 0);
        totalRecords = limit.HasValue ? Math.Min(totalRecords, totalAfterSkip) : totalAfterSkip;

        int syncedCount = 0;
        int incompleteCount = 0;
        int notProcessedCount = 0;
        int updatedCount = 0;
        int unchangedCount = 0;
        int fetchedRecords = skipRecords ?? 0;

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

        foreach (var basicCandidate in allCandidates)
        {
            cancellationToken.ThrowIfCancellationRequested();
            fetchedRecords++;

            SyncedCandidate? entity = null;
            bool resumeChanged = false;
            string syncDetail = "not-processed";
            Exception? fatalError = null;

            try
            {
                try
                {
                    var detail = await _upstreamApi.GetCandidateDetailAsync(token, basicCandidate.CandidateId);
                    var notes = await _upstreamApi.GetCandidateNotesAsync(token, basicCandidate.CandidateId);

                    entity = BuildCandidateEntity(detail, notes);
                    (_, resumeChanged, syncDetail) = await UpsertCandidateAsync(entity, cancellationToken);
                }
                catch (Exception ex)
                {
                    entity = new SyncedCandidate
                    {
                        UpstreamId = basicCandidate.CandidateId,
                        FullName = basicCandidate.FullName ?? string.Empty,
                        Email = basicCandidate.Email ?? string.Empty,
                        MainSkill = basicCandidate.MainSkill ?? string.Empty,
                        Seniority = basicCandidate.Seniority ?? string.Empty,
                        Country = basicCandidate.Country ?? string.Empty,
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
                    basicCandidate.CandidateId, basicCandidate.FullName);
                fatalError = ex;
            }

            if (fatalError != null)
            {
                notProcessedCount++;

                yield return new SyncRecordEvent(new SyncRecordDto
                {
                    Id = $"cand-{basicCandidate.CandidateId}",
                    Source = "candidates",
                    Status = "not-processed",
                    Name = basicCandidate.FullName ?? "Unknown",
                    Email = basicCandidate.Email ?? string.Empty,
                    Reason = fatalError.Message,
                    UpstreamId = basicCandidate.CandidateId,
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
                    CurrentRecord = basicCandidate.FullName ?? "Unknown",
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
        var rate = rates.FirstOrDefault();
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

        var isBench = string.IsNullOrEmpty(detail.AccountName) ||
            string.Equals(detail.AccountName, "Bench", StringComparison.OrdinalIgnoreCase);

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

    private SyncedCandidate BuildCandidateEntity(CandidateDetail detail, List<PersonaNote> notes)
    {
        var resumeNote = notes
            .Where(n => n.NoteTypeName == "Resume"
                && !string.IsNullOrEmpty(n.Filename)
                && SupportedResumeExtensions.Contains(Path.GetExtension(n.Filename)))
            .OrderByDescending(n => n.DateCreated)
            .FirstOrDefault();

        var missingFields = new List<string>();
        if (string.IsNullOrEmpty(detail.FullName)) missingFields.Add("FullName");
        if (string.IsNullOrEmpty(detail.Email)) missingFields.Add("Email");
        if (resumeNote == null) missingFields.Add("Resume");

        var recordStatus = missingFields.Count == 0 ? "synced" : "incomplete";
        var statusReason = missingFields.Count > 0 ? $"Missing: {string.Join(", ", missingFields)}" : null;

        return new SyncedCandidate
        {
            UpstreamId = detail.CandidateId,
            FullName = detail.FullName,
            Email = detail.Email,
            Seniority = detail.Seniority,
            MainSkill = detail.MainSkill,
            Country = detail.Country,
            CurrentSalary = detail.CurrentSalary,
            SalaryCurrency = detail.SalaryCurrency,
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
                entity.ResumeDateCreated > existing.ResumeDateCreated;

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
                existing.HasResume != entity.HasResume;

            var resumeChanged = entity.HasResume &&
                entity.ResumeDateCreated.HasValue &&
                entity.ResumeDateCreated > existing.ResumeDateCreated;

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
}
