using System.Text;
using DocumentFormat.OpenXml.Packaging;
using TesseractOCR;
using TesseractOCR.Enums;
using UglyToad.PdfPig;

namespace OperationNexus.Api.Services;

public class ResumeTextExtractor : IResumeTextExtractor
{
    private readonly string _tessdataPath;

    public ResumeTextExtractor()
    {
        _tessdataPath = Path.Combine(AppContext.BaseDirectory, "tessdata");
    }

    public string ExtractText(byte[] fileBytes, string filename)
    {
        var ext = Path.GetExtension(filename)?.ToLowerInvariant();
        var raw = ext switch
        {
            ".pdf" => ExtractFromPdf(fileBytes),
            ".docx" => ExtractFromDocx(fileBytes),
            ".doc" => throw new NotSupportedException("Legacy .doc format not yet supported. Please convert to .docx or .pdf."),
            _ => throw new NotSupportedException($"Unsupported resume format: {ext}")
        };
        return raw.Replace("\0", string.Empty);
    }

    private string ExtractFromPdf(byte[] fileBytes)
    {
        using var document = PdfDocument.Open(fileBytes);
        var sb = new StringBuilder();
        var hasImagePages = false;

        foreach (var page in document.GetPages())
        {
            var pageText = page.Text;
            if (!string.IsNullOrWhiteSpace(pageText))
            {
                sb.AppendLine(pageText);
            }
            else if (page.GetImages().Any())
            {
                hasImagePages = true;
            }
        }

        if (hasImagePages && sb.Length < 50)
        {
            Console.Error.WriteLine($"[TextExtractor] PDF has {document.NumberOfPages} page(s) with images but no text — attempting OCR");
            return ExtractWithOcr(fileBytes);
        }

        return sb.ToString();
    }

    private string ExtractWithOcr(byte[] pdfBytes)
    {
        try
        {
            using var engine = new Engine(_tessdataPath, Language.English | Language.SpanishCastilian, EngineMode.Default);
            using var document = PdfDocument.Open(pdfBytes);
            var sb = new StringBuilder();

            foreach (var page in document.GetPages())
            {
                foreach (var image in page.GetImages())
                {
                    var imageBytes = image.RawBytes.ToArray();
                    try
                    {
                        using var pix = TesseractOCR.Pix.Image.LoadFromMemory(imageBytes);
                        using var resultPage = engine.Process(pix);
                        var text = resultPage.Text;
                        if (!string.IsNullOrWhiteSpace(text))
                            sb.AppendLine(text);
                    }
                    catch (Exception ex)
                    {
                        Console.Error.WriteLine($"[OCR] Failed to process image on page {page.Number}: {ex.Message}");
                    }
                }
            }

            return sb.ToString();
        }
        catch (DllNotFoundException ex)
        {
            throw new InvalidOperationException(
                "Tesseract native libraries not installed. Run 'brew install tesseract' on macOS.", ex);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[OCR] Tesseract engine failed: {ex}");
            throw new InvalidOperationException($"OCR extraction failed: {ex.Message}", ex);
        }
    }

    private static string ExtractFromDocx(byte[] fileBytes)
    {
        using var stream = new MemoryStream(fileBytes);
        using var doc = WordprocessingDocument.Open(stream, false);
        var body = doc?.MainDocumentPart?.Document?.Body;
        return body?.InnerText ?? string.Empty;
    }
}
