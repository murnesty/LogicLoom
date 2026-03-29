namespace ReceiptCalculator.Api.Infrastructure.Vision;

public sealed class VisionConsumeResult
{
    public bool Allowed { get; init; }
    /// <summary>When blocked: <c>daily</c> or <c>monthly</c>.</summary>
    public string? BlockedBy { get; init; }
    public int ScansUsedToday { get; init; }
    /// <summary>Configured daily cap; 0 means unlimited.</summary>
    public int DailyLimit { get; init; }
    public int ScansUsedThisMonth { get; init; }
    /// <summary>Configured monthly cap; 0 means unlimited.</summary>
    public int MonthlyLimit { get; init; }
}
