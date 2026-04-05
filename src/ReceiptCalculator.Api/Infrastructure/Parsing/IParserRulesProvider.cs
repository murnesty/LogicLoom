namespace ReceiptCalculator.Api.Infrastructure.Parsing;

/// <summary>
/// Supplies the active <see cref="ParserRuleSet"/> for receipt parsing (e.g. from SQLite configuration).
/// </summary>
public interface IParserRulesProvider
{
    /// <summary>
    /// Returns the current parser rules. Implementations typically cache after first load.
    /// </summary>
    ParserRuleSet GetRules();

    /// <summary>
    /// Active row metadata plus rules (for APIs and debugging). Same cache as <see cref="GetRules"/>.
    /// </summary>
    ParserRulesActiveSnapshot GetActiveSnapshot();
}
