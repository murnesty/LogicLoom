using System.Text.Json.Serialization;

namespace ReceiptCalculator.Api.Infrastructure.Parsing;

/// <summary>
/// Serializable parser knobs (stored as JSON in SQLite). The engine in <see cref="BasicReceiptParser"/> interprets these.
/// </summary>
public sealed class ParserRuleSet
{
    /// <summary>Bump when defaults change; SQLite active row is migrated when below <see cref="CreateDefault"/>.</summary>
    public const int CurrentSchemaVersion = 3;

    [JsonPropertyName("version")]
    public int Version { get; set; } = CurrentSchemaVersion;

    /// <summary>
    /// Regex for the trailing amount on a line (must have a capturing group for the numeric part).
    /// Prefer <c>xx.xx</c> at EOL; optional <c>RM</c>/<c>MYR</c> before the amount (Tesseract / POS).
    /// </summary>
    [JsonPropertyName("amountLinePattern")]
    public string AmountLinePattern { get; set; } = @"(?:(?:RM|MYR)\s*)?(\d+\.\d{2})\s*$";

    [JsonPropertyName("summaryKeywords")]
    public SummaryKeywordRules SummaryKeywords { get; set; } = new();

    /// <summary>
    /// If any pattern matches, the line is treated as date/time noise and skipped for item parsing.
    /// </summary>
    [JsonPropertyName("dateLinePatterns")]
    public List<string> DateLinePatterns { get; set; } = new()
    {
        @"\b\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\b",
        @"\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b",
        @"\b\d{1,2}:\d{2}(?::\d{2})?\b",
    };

    /// <summary>
    /// Lines matching any of these (case-insensitive) are never treated as item lines (phone, email, cashier, etc.).
    /// </summary>
    [JsonPropertyName("metaLinePatterns")]
    public List<string> MetaLinePatterns { get; set; } = new()
    {
        @"^(date|time|tel|phone|fax|address|receipt|invoice|order|cashier|server|table|check|registration|no\.|powered|guest check|staff|h\/p|register|company|compri|balance|change|scan qr|thank you|don't forget|visit|see you)",
        @"\d{2}[\/\-]\d{2}[\/\-]\d{2,4}",
        @"^[+]\d",
        @"@",
        @"^\(CO\.?\s*NO",
        @"^PAX\s*:",
        @"^order\s*:",
        @"^invoice\s*no",
        @"^cashier\s*:",
        @"^table\s*pax\s*:\s*\d+\s*$",
        @"^to\s+rate",
        @"\brate\s+us",
        @"^thank",
    };

    public static ParserRuleSet CreateDefault() => new() { Version = CurrentSchemaVersion };
}

public sealed class SummaryKeywordRules
{
    [JsonPropertyName("subtotal")]
    public List<string> Subtotal { get; set; } = new() { "subtotal", "sub total", "sub-total" };

    [JsonPropertyName("serviceTax")]
    public List<string> ServiceTax { get; set; } = new() { "service tax", "service charge", "svc chg", "svr chg", "svr chrg" };

    [JsonPropertyName("sst")]
    public List<string> Sst { get; set; } = new() { "sst", "gst" };

    [JsonPropertyName("total")]
    public List<string> Total { get; set; } = new()
    {
        "total amount",
        "total sales",
        "grand total",
        "duit now",
        "balance",
        "total",
    };
}
