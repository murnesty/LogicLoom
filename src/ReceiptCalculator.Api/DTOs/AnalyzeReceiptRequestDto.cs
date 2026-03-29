namespace ReceiptCalculator.Api.DTOs;

public sealed class AnalyzeReceiptRequestDto
{
    public string? ImageBase64 { get; init; }
    public string? Currency { get; init; }
}
