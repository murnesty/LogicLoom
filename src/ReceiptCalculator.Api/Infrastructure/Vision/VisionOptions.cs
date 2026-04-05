namespace ReceiptCalculator.Api.Infrastructure.Vision;

public class VisionOptions
{
    public const string SectionName = "Vision";

    /// <summary>Google Cloud API key (server only — never expose to the browser).</summary>
    public string ApiKey { get; set; } = string.Empty;

    /// <summary>
    /// Max image scans (proxy units) per UTC calendar day, all users combined.
    /// Set via appsettings <c>Vision:DailyScanLimit</c> or env <c>Vision__DailyScanLimit</c> (Railway, GitHub Actions, etc.).
    /// Use <c>0</c> for no daily cap (monthly cap may still apply).
    /// </summary>
    public int DailyScanLimit { get; set; } = 50;

    /// <summary>
    /// Max scans per UTC calendar month (<c>yyyy-MM</c>), all users combined.
    /// Configure like <see cref="DailyScanLimit"/>. Use <c>0</c> for no monthly cap.
    /// </summary>
    public int MonthlyScanLimit { get; set; } = 900;

    /// <summary>SQLite file path (relative paths are under the API content root).</summary>
    public string SqlitePath { get; set; } = "Data/vision-usage.db";

    /// <summary>Reject requests with more than this many images (abuse guard).</summary>
    public int MaxImagesPerRequest { get; set; } = 5;

    /// <summary>
    /// When true, daily/monthly SQLite scan counters are not enforced (e.g. Production profile on localhost).
    /// In ASP.NET Core Development hosting, limits are skipped automatically regardless of this flag.
    /// </summary>
    public bool DisableScanLimits { get; set; }
}
