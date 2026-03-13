namespace OperationNexus.Api.Services;

public interface IResumeTextExtractor
{
    string ExtractText(byte[] fileBytes, string filename);
}
