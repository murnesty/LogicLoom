namespace ReceiptCalculator.Api.DTOs;

public sealed class AnalyzeReceiptResponseDto
{
    public string Currency { get; init; } = "MYR";
    public List<ReceiptItemDto> Items { get; init; } = new();
    public ReceiptSummaryDto Summary { get; init; } = new();
    public decimal? Confidence { get; init; }
    public List<string> Warnings { get; init; } = new();
}

public sealed class ReceiptItemDto
{
    public string Name { get; init; } = string.Empty;
    public decimal Quantity { get; init; }
    public decimal OriginalPrice { get; init; }
    public decimal TaxedPrice { get; init; }
    public decimal TotalPrice { get; init; }
}

public sealed class ReceiptSummaryDto
{
    public decimal Subtotal { get; init; }
    public decimal ServiceTax { get; init; }
    public decimal SstTax { get; init; }
    public decimal Total { get; init; }
}
