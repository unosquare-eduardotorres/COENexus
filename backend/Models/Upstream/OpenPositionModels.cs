using System.Text.Json.Serialization;
using OperationNexus.Api.Converters;

namespace OperationNexus.Api.Models.Upstream;

public class OpenPositionListItem
{
    public int Id { get; set; }
    public string Account { get; set; } = string.Empty;
    public string Coe { get; set; } = string.Empty;
    public string Practice { get; set; } = string.Empty;
    public string Stakeholder { get; set; } = string.Empty;
    public string MainSkill { get; set; } = string.Empty;
    public string Countries { get; set; } = string.Empty;
    public string Seniorities { get; set; } = string.Empty;
    public string AvailableRange { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int Aging { get; set; }
    public string Created { get; set; } = string.Empty;
    public string ReadyDate { get; set; } = string.Empty;
    public string LastModification { get; set; } = string.Empty;
    public string Sourcing { get; set; } = string.Empty;
    public bool Replacement { get; set; }
}

public class OpenPositionDetail
{
    public int RecruitmentRequisitionId { get; set; }
    public string JobDescription { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public string JobTitle { get; set; } = string.Empty;
    public int MainSkillId { get; set; }
    public string MainSkillName { get; set; } = string.Empty;
    public int[] Seniorities { get; set; } = [];
    public int[] Countries { get; set; } = [];
    public string Seniority { get; set; } = string.Empty;
    public string Research { get; set; } = string.Empty;
    public string Active { get; set; } = string.Empty;
    [JsonConverter(typeof(NullableDecimalConverter))]
    public decimal? MaximumRate { get; set; }

    [JsonConverter(typeof(NullableDecimalConverter))]
    public decimal? MinimumRate { get; set; }
    public string? Comments { get; set; }
}

public class PresentedCandidateItem
{
    public int CandidateRequisitionId { get; set; }
    public string Candidate { get; set; } = string.Empty;
    public string CandidateStatusName { get; set; } = string.Empty;
    public string StartDate { get; set; } = string.Empty;
    public string Skills { get; set; } = string.Empty;
    [JsonConverter(typeof(NullableDecimalConverter))]
    public decimal? Rate { get; set; }
    public bool IsEmployee { get; set; }
    public int CandidateId { get; set; }
}
