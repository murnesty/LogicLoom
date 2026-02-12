namespace ReceiptCalculator.Api.Infrastructure.Ocr;

public sealed record OcrResult(string Text, decimal? Confidence);

public interface IOcrService
{
    Task<OcrResult> ExtractTextAsync(byte[] imageBytes, CancellationToken cancellationToken);
}
