using ReceiptCalculator.Api.DTOs;
using ReceiptCalculator.Api.Domain.Services;
using ReceiptCalculator.Api.Infrastructure.Ocr;
using ReceiptCalculator.Api.Infrastructure.Parsing;

namespace ReceiptCalculator.Api.Application.UseCases;

public sealed class AnalyzeReceiptUseCase
{
    private readonly IOcrService _ocrService;
    private readonly IReceiptParser _receiptParser;
    private readonly ReceiptTotalsCalculator _totalsCalculator;

    public AnalyzeReceiptUseCase(
        IOcrService ocrService,
        IReceiptParser receiptParser,
        ReceiptTotalsCalculator totalsCalculator)
    {
        _ocrService = ocrService;
        _receiptParser = receiptParser;
        _totalsCalculator = totalsCalculator;
    }

    public async Task<AnalyzeReceiptResponseDto> ExecuteAsync(AnalyzeReceiptRequestDto request, CancellationToken cancellationToken)
    {
        var currency = string.IsNullOrWhiteSpace(request.Currency) ? "MYR" : request.Currency.Trim().ToUpperInvariant();
        var warnings = new List<string>();

        byte[] imageBytes;
        if (string.IsNullOrWhiteSpace(request.ImageBase64))
        {
            imageBytes = Array.Empty<byte>();
            warnings.Add("No image provided. Using dummy OCR output.");
        }
        else
        {
            try
            {
                imageBytes = Convert.FromBase64String(request.ImageBase64);
            }
            catch (FormatException)
            {
                imageBytes = Array.Empty<byte>();
                warnings.Add("Invalid base64 image. Using dummy OCR output.");
            }
        }

        var ocrResult = await _ocrService.ExtractTextAsync(imageBytes, cancellationToken);
        var receipt = _receiptParser.Parse(ocrResult.Text, currency);

        var summary = _totalsCalculator.EnsureSummary(receipt.Items, receipt.Summary, currency);
        receipt.UpdateSummary(summary);

        var allocations = _totalsCalculator.AllocateTaxesProportionally(receipt.Items, summary);

        var items = receipt.Items.Select(item =>
        {
            var tax = allocations[item.Id];
            var taxedPrice = item.LineAmount.Add(tax);
            return new ReceiptItemDto
            {
                Name = item.Name,
                Quantity = item.Quantity.Value,
                OriginalPrice = item.LineAmount.Amount,
                TaxedPrice = taxedPrice.Amount,
                TotalPrice = taxedPrice.Amount
            };
        }).ToList();

        return new AnalyzeReceiptResponseDto
        {
            Currency = currency,
            Items = items,
            Summary = new ReceiptSummaryDto
            {
                Subtotal = summary.Subtotal.Amount,
                ServiceTax = summary.ServiceTax.Amount,
                SstTax = summary.SstTax.Amount,
                Total = summary.Total.Amount
            },
            Confidence = ocrResult.Confidence ?? receipt.Confidence,
            Warnings = warnings
        };
    }
}
