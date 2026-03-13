using System.Text;
using DocumentFormat.OpenXml.Packaging;
using UglyToad.PdfPig;

namespace OperationNexus.Api.Services;

public class ResumeTextExtractor : IResumeTextExtractor
{
    public string ExtractText(byte[] fileBytes, string filename)
    {
        var ext = Path.GetExtension(filename)?.ToLowerInvariant();
        var raw = ext switch
        {
            ".pdf" => ExtractFromPdf(fileBytes),
            ".docx" => ExtractFromDocx(fileBytes),
            _ => Encoding.UTF8.GetString(fileBytes)
        };
        return raw.Replace("\0", string.Empty);
    }

    private static string ExtractFromPdf(byte[] fileBytes)
    {
        using var document = PdfDocument.Open(fileBytes);
        var sb = new StringBuilder();
        foreach (var page in document.GetPages())
            sb.AppendLine(page.Text);
        return sb.ToString();
    }

    private static string ExtractFromDocx(byte[] fileBytes)
    {
        using var stream = new MemoryStream(fileBytes);
        using var doc = WordprocessingDocument.Open(stream, false);
        var body = doc?.MainDocumentPart?.Document?.Body;
        return body?.InnerText ?? string.Empty;
    }
}
