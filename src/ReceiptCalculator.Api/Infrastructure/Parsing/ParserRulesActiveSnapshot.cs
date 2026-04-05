namespace ReceiptCalculator.Api.Infrastructure.Parsing;

/// <summary>
/// Active parser-rules row: metadata (version, remark, created time) plus deserialized <see cref="ParserRuleSet"/>.
/// </summary>
public sealed class ParserRulesActiveSnapshot
{
    public int Id { get; init; }
    public int Version { get; init; }

    /// <summary>
    /// Human note when this row was published (e.g. &quot;stable after lunch-set fix&quot;).
    /// </summary>
    public string Remark { get; init; } = string.Empty;

    public DateTimeOffset CreatedAtUtc { get; init; }

    public ParserRuleSet Rules { get; init; } = null!;
}
