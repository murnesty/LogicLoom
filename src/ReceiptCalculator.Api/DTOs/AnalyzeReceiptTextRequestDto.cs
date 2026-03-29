namespace ReceiptCalculator.Api.DTOs;

public sealed class AnalyzeReceiptTextRequestDto
{
    public string OcrText { get; init; } = string.Empty;
    public string? Currency { get; init; }
}
