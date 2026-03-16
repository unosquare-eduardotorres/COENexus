namespace OperationNexus.Api.Models.Entities;

public class OpenPositionCandidate
{
    public int Id { get; set; }
    public int OpenPositionId { get; set; }
    public int CandidateRequisitionId { get; set; }
    public int CandidateId { get; set; }
    public string CandidateName { get; set; } = string.Empty;
    public string MainSkill { get; set; } = string.Empty;
    public bool IsEmployee { get; set; }
    public string CandidateStatus { get; set; } = string.Empty;
    public decimal Rate { get; set; }
    public string? StartDate { get; set; }
    public DateTime SyncedAt { get; set; }
}
