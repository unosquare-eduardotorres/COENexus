namespace OperationNexus.Api.Models.Upstream;

public class EmployeeDetail
{
    public int UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public int Seniority { get; set; }
    public int MainSkillId { get; set; }
    public int CountryId { get; set; }
    public string AccountName { get; set; } = string.Empty;
    public string JobTitle { get; set; } = string.Empty;
    public string MainSkillName { get; set; } = string.Empty;
    public string OfficeName { get; set; } = string.Empty;
}
