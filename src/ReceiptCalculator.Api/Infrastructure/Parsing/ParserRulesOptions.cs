namespace ReceiptCalculator.Api.Infrastructure.Parsing;

public sealed class ParserRulesOptions
{
    public const string SectionName = "ParserRules";
    public string SqlitePath { get; set; } = "Data/parser-rules.db";
}
