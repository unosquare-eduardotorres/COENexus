namespace OperationNexus.Api.Models.Upstream;

public class CandidateDetail
{
    public int CandidateId { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public int? Seniority { get; set; }
    public int? MainSkillId { get; set; }
    public int? CountryId { get; set; }
    public int? CoeCertifiedStatusId { get; set; }
    public DateTime? StatusUpdate { get; set; }
    public decimal? CurrentSalary { get; set; }
    public string? CurrentSalaryCurrency { get; set; }
    public string? DesiredSalary { get; set; }
    public string? DesiredSalaryCurrency { get; set; }
    public decimal? Offer { get; set; }
    public string? MainSkill { get; set; }
    public string? Country { get; set; }
    public string? SeniorityText { get; set; }
    public string? CoeCertifiedStatus { get; set; }
    public string? CandidateStatusName { get; set; }
    public string? SalaryCurrency { get; set; }
}
