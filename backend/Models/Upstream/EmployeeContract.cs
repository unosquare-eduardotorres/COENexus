namespace OperationNexus.Api.Models.Upstream;

public class EmployeeContract
{
    public decimal Salary { get; set; }
    public string CurrencyCode { get; set; } = string.Empty;
    public string StartDate { get; set; } = string.Empty;
    public decimal? NetSalary { get; set; }
    public decimal? AnnualCost { get; set; }
}
