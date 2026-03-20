namespace OperationNexus.Api.Models;

public record CreateOrUpdateSessionRequest(
    string Name,
    string ContextType,
    int? ContextId,
    string? ContextName,
    string? ProcessingMode,
    string? RefinementMode,
    string? JobDescription,
    string? JobDescriptionSource,
    string? SelectedPositionId,
    string? ResumeContentJson,
    string? WizardStateJson,
    string? Status
);

public record SessionSummaryDto(
    int Id,
    string Name,
    string ContextType,
    string? ContextName,
    string Status,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record SessionDetailDto(
    int Id,
    string Name,
    string ContextType,
    int? ContextId,
    string? ContextName,
    string ProcessingMode,
    string RefinementMode,
    string? JobDescription,
    string? JobDescriptionSource,
    string? SelectedPositionId,
    string? ResumeContentJson,
    string? WizardStateJson,
    string Status,
    DateTime CreatedAt,
    DateTime UpdatedAt
);
