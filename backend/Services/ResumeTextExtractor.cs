using System.Diagnostics;
using System.Text;
using DocumentFormat.OpenXml.Packaging;
using UglyToad.PdfPig;

namespace OperationNexus.Api.Services;

public class ResumeTextExtractor : IResumeTextExtractor
{
    private static readonly string TesseractPath = FindBinary("tesseract");
    private static readonly string PdftoppmPath = FindBinary("pdftoppm");

    public string ExtractText(byte[] fileBytes, string filename)
    {
        var ext = Path.GetExtension(filename)?.ToLowerInvariant();
        var raw = ext switch
        {
            ".pdf" => ExtractFromPdf(fileBytes),
            ".docx" => ExtractFromDocx(fileBytes),
            ".doc" => ExtractFromDoc(fileBytes),
            _ => throw new NotSupportedException($"Unsupported resume format: {ext}")
        };
        return raw.Replace("\0", string.Empty);
    }

    private string ExtractFromPdf(byte[] fileBytes)
    {
        using var document = PdfDocument.Open(fileBytes);
        var sb = new StringBuilder();
        var hasImages = false;

        foreach (var page in document.GetPages())
        {
            var pageText = page.Text;
            if (!string.IsNullOrWhiteSpace(pageText))
                sb.AppendLine(pageText);

            if (page.GetImages().Any())
                hasImages = true;
        }

        var cleaned = sb.ToString().Replace("\0", string.Empty).Trim();
        var meaningfulChars = cleaned.Count(c => char.IsLetterOrDigit(c));

        if (meaningfulChars < 50 && !string.IsNullOrEmpty(PdftoppmPath) && !string.IsNullOrEmpty(TesseractPath))
        {
            Console.Error.WriteLine($"[TextExtractor] PDF has {document.NumberOfPages} page(s), {meaningfulChars} meaningful chars (hasImages={hasImages}) — attempting OCR via pdftoppm");
            var ocrText = ExtractWithOcr(fileBytes);
            if (!string.IsNullOrWhiteSpace(ocrText))
                return ocrText;
        }

        return sb.ToString();
    }

    private string ExtractWithOcr(byte[] pdfBytes)
    {
        if (string.IsNullOrEmpty(TesseractPath))
            throw new InvalidOperationException(
                "Tesseract CLI not found. Install via 'brew install tesseract' on macOS.");

        if (string.IsNullOrEmpty(PdftoppmPath))
            throw new InvalidOperationException(
                "pdftoppm not found. Install via 'brew install poppler' on macOS.");

        var tempDir = Path.Combine(Path.GetTempPath(), $"ocr-{Guid.NewGuid():N}");
        Directory.CreateDirectory(tempDir);

        try
        {
            var pdfPath = Path.Combine(tempDir, "input.pdf");
            File.WriteAllBytes(pdfPath, pdfBytes);

            var pagesPrefix = Path.Combine(tempDir, "page");
            var ppmPsi = new ProcessStartInfo
            {
                FileName = PdftoppmPath,
                ArgumentList = { "-png", "-r", "300", pdfPath, pagesPrefix },
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true,
            };

            using (var ppmProcess = Process.Start(ppmPsi)!)
            {
                ppmProcess.WaitForExit(TimeSpan.FromSeconds(60));
                if (!ppmProcess.HasExited)
                {
                    ppmProcess.Kill(true);
                    throw new TimeoutException("pdftoppm timed out rendering PDF pages");
                }
                if (ppmProcess.ExitCode != 0)
                {
                    var stderr = ppmProcess.StandardError.ReadToEnd().Trim();
                    throw new InvalidOperationException($"pdftoppm failed (exit {ppmProcess.ExitCode}): {stderr}");
                }
            }

            var pageImages = Directory.GetFiles(tempDir, "page-*.png")
                .OrderBy(f => f)
                .ToArray();

            if (pageImages.Length == 0)
                throw new InvalidOperationException("pdftoppm produced no page images");

            Console.Error.WriteLine($"[OCR] Rendered {pageImages.Length} page image(s) at 300 DPI");

            var sb = new StringBuilder();
            foreach (var pageImage in pageImages)
            {
                var outputBase = pageImage.Replace(".png", "-ocr");

                var psi = new ProcessStartInfo
                {
                    FileName = TesseractPath,
                    ArgumentList = { pageImage, outputBase, "-l", "eng+spa" },
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                };

                using var process = Process.Start(psi)
                    ?? throw new InvalidOperationException("Failed to start Tesseract process");

                process.WaitForExit(TimeSpan.FromSeconds(30));

                if (!process.HasExited)
                {
                    process.Kill(true);
                    Console.Error.WriteLine($"[OCR] Tesseract timed out on {Path.GetFileName(pageImage)}");
                    continue;
                }

                var outputFile = outputBase + ".txt";
                if (process.ExitCode == 0 && File.Exists(outputFile))
                {
                    var text = File.ReadAllText(outputFile);
                    if (!string.IsNullOrWhiteSpace(text))
                        sb.AppendLine(text);
                }
                else
                {
                    var stderr = process.StandardError.ReadToEnd().Trim();
                    Console.Error.WriteLine($"[OCR] Tesseract failed on {Path.GetFileName(pageImage)}: {stderr}");
                }
            }

            Console.Error.WriteLine($"[OCR] Extracted {sb.Length} chars from {pageImages.Length} pages via pdftoppm + Tesseract");
            return sb.ToString();
        }
        catch (Exception ex) when (ex is not InvalidOperationException and not TimeoutException)
        {
            Console.Error.WriteLine($"[OCR] Pipeline failed: {ex}");
            throw new InvalidOperationException($"OCR extraction failed: {ex.Message}", ex);
        }
        finally
        {
            try { Directory.Delete(tempDir, true); } catch { }
        }
    }

    private static string ExtractFromDocx(byte[] fileBytes)
    {
        try
        {
            using var stream = new MemoryStream(fileBytes);
            using var doc = WordprocessingDocument.Open(stream, false);
            var body = doc?.MainDocumentPart?.Document?.Body;
            var text = body?.InnerText ?? string.Empty;
            if (!string.IsNullOrWhiteSpace(text))
                return text;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[TextExtractor] OpenXml failed on .docx, falling back to textutil: {ex.Message}");
        }

        return ExtractWithTextutil(fileBytes, ".docx");
    }

    private static string ExtractFromDoc(byte[] fileBytes)
    {
        return ExtractWithTextutil(fileBytes, ".doc");
    }

    private static string ExtractWithTextutil(byte[] fileBytes, string extension)
    {
        var tempDir = Path.Combine(Path.GetTempPath(), $"textutil-{Guid.NewGuid():N}");
        Directory.CreateDirectory(tempDir);

        try
        {
            var inputPath = Path.Combine(tempDir, $"input{extension}");
            var outputPath = Path.Combine(tempDir, "output.txt");
            File.WriteAllBytes(inputPath, fileBytes);

            var psi = new ProcessStartInfo
            {
                FileName = "/usr/bin/textutil",
                ArgumentList = { "-convert", "txt", "-output", outputPath, inputPath },
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true,
            };

            using var process = Process.Start(psi)
                ?? throw new InvalidOperationException("Failed to start textutil");

            process.WaitForExit(TimeSpan.FromSeconds(15));

            if (!process.HasExited)
            {
                process.Kill(true);
                throw new TimeoutException("textutil timed out converting document");
            }

            if (process.ExitCode != 0)
            {
                var stderr = process.StandardError.ReadToEnd().Trim();
                throw new InvalidOperationException($"textutil failed (exit {process.ExitCode}): {stderr}");
            }

            if (!File.Exists(outputPath))
                throw new InvalidOperationException("textutil produced no output");

            var text = File.ReadAllText(outputPath);
            Console.Error.WriteLine($"[TextExtractor] Extracted {text.Length} chars from {extension} via textutil");
            return text;
        }
        finally
        {
            try { Directory.Delete(tempDir, true); } catch { }
        }
    }

    private static string FindBinary(string name)
    {
        string[] searchDirs =
        [
            "/opt/homebrew/bin",
            "/usr/local/bin",
            "/usr/bin",
        ];

        foreach (var dir in searchDirs)
        {
            var path = Path.Combine(dir, name);
            if (File.Exists(path)) return path;
        }

        return string.Empty;
    }
}
