namespace OperationNexus.Api.Models.Entities;

public class TransformSession
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ContextType { get; set; } = string.Empty;
    public int? ContextId { get; set; }
    public string ContextName { get; set; } = string.Empty;
    public string ProcessingMode { get; set; } = "single";
    public string RefinementMode { get; set; } = string.Empty;
    public string? JobDescription { get; set; }
    public string? JobDescriptionSource { get; set; }
    public string? SelectedPositionId { get; set; }
    public string? ResumeContentJson { get; set; }
    public string? WizardStateJson { get; set; }
    public string Status { get; set; } = "draft";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
