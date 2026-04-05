using ReceiptCalculator.Api.Infrastructure.Parsing;

namespace ReceiptCalculator.Api.Tests.Parsing;

/// <summary>Supplies default parser rules for unit tests (no SQLite).</summary>
public sealed class TestParserRulesProvider : IParserRulesProvider
{
    private readonly ParserRuleSet _rules;

    public TestParserRulesProvider(ParserRuleSet? rules = null)
    {
        _rules = rules ?? ParserRuleSet.CreateDefault();
    }

    public ParserRuleSet GetRules() => _rules;

    public ParserRulesActiveSnapshot GetActiveSnapshot() => new()
    {
        Id = 1,
        Version = _rules.Version,
        Remark = "test",
        CreatedAtUtc = DateTimeOffset.UtcNow,
        Rules = _rules,
    };
}
