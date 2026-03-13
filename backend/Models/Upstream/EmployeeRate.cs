namespace OperationNexus.Api.Models.Upstream;

public class EmployeeRate
{
    public string AccountName { get; set; } = string.Empty;
    public string ProjectName { get; set; } = string.Empty;
    public decimal Rate { get; set; }
    public string StartDate { get; set; } = string.Empty;
}
