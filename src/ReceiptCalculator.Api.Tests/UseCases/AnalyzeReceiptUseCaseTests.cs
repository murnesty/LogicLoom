using System.Text;
using Xunit;
using ReceiptCalculator.Api.Application.UseCases;
using ReceiptCalculator.Api.DTOs;
using ReceiptCalculator.Api.Domain.Services;
using ReceiptCalculator.Api.Infrastructure.Ocr;
using ReceiptCalculator.Api.Infrastructure.Parsing;

namespace ReceiptCalculator.Api.Tests.UseCases;

public sealed class AnalyzeReceiptUseCaseTests
{
    [Fact]
    public async Task ExecuteAsync_WhenValidInput_ReturnsAllocatedTaxes()
    {
        var ocrService = new FakeOcrService();
        var parser = new BasicReceiptParser();
        var totalsCalculator = new ReceiptTotalsCalculator();
        var useCase = new AnalyzeReceiptUseCase(ocrService, parser, totalsCalculator);

        var request = new AnalyzeReceiptRequestDto
        {
            ImageBase64 = Convert.ToBase64String(Encoding.UTF8.GetBytes("img")),
            Currency = "MYR"
        };

        var response = await useCase.ExecuteAsync(request, CancellationToken.None);

        Assert.Equal("MYR", response.Currency);
        Assert.Equal(2, response.Items.Count);
        Assert.Equal(6.89m, response.Items[0].TaxedPrice);
        Assert.Equal(3.18m, response.Items[1].TaxedPrice);
        Assert.Equal(10.07m, response.Summary.Total);
    }

    private sealed class FakeOcrService : IOcrService
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
            return Task.FromResult(new OcrResult(SampleOcrText, 0.9m));
        }
    }
}
