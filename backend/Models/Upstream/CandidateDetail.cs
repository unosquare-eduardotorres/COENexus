namespace OperationNexus.Api.Models.Upstream;

public class CandidateDetail
{
    public int CandidateId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Seniority { get; set; }
    public string? MainSkill { get; set; }
    public string? Country { get; set; }
    public decimal? CurrentSalary { get; set; }
    public string? SalaryCurrency { get; set; }
}
