using OperationNexus.Api.Models.Upstream;

namespace OperationNexus.Api.Services;

public interface IUpstreamApiService
{
    Task<(List<EmployeeDetail> Items, int TotalRecords)> GetEmployeesPagedAsync(string token, int skip, int take);
    Task<EmployeeDetail> GetEmployeeDetailAsync(string token, int id);
    Task<List<EmployeeContract>> GetEmployeeContractsAsync(string token, int id);
    Task<List<EmployeeRate>> GetEmployeeRatesAsync(string token, int id);
    Task<List<PersonaNote>> GetEmployeeNotesAsync(string token, int id);
    Task<(List<CandidateDetail> Items, int TotalRecords)> GetCandidatesPagedAsync(string token, int skip, int take, int? year = null);
    Task<CandidateDetail> GetCandidateDetailAsync(string token, int id);
    Task<List<PersonaNote>> GetCandidateNotesAsync(string token, int id);
    Task<byte[]> GetNoteFileAsync(string token, int noteId);
}
