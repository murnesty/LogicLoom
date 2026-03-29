namespace ReceiptCalculator.Api.DTOs;

public class VisionDocumentTextResponseDto
{
    public string Text { get; set; } = string.Empty;
    public int ScansUsedToday { get; set; }
    public int DailyLimit { get; set; }
    public int ScansUsedThisMonth { get; set; }
    public int MonthlyLimit { get; set; }
}
