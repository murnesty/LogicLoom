namespace ReceiptCalculator.Api.Infrastructure.Ocr;

public sealed class DummyOcrService : IOcrService
{
    private const string SampleOcrText = """
KEDAI MAKAN
NASI LEMAK 6.50
TEH TARIK 3.00
SUBTOTAL 9.50
SST 0.57
TOTAL 10.07
""";

    public Task<OcrResult> ExtractTextAsync(byte[] imageBytes, CancellationToken cancellationToken)
    {
        var result = new OcrResult(SampleOcrText, 0.85m);
        return Task.FromResult(result);
    }
}
