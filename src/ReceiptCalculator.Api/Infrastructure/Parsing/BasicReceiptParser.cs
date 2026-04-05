using System.Globalization;
using System.Linq;
using System.Text.RegularExpressions;
using ReceiptCalculator.Api.Domain.Entities;
using ReceiptCalculator.Api.Domain.ValueObjects;

namespace ReceiptCalculator.Api.Infrastructure.Parsing;

public sealed class BasicReceiptParser : IReceiptParser
{
    private readonly Regex _amountRegex;
    private readonly IReadOnlyList<Regex> _dateLineRegexes;
    private readonly IReadOnlyList<Regex> _metaLineRegexes;
    private readonly ParserRuleSet _rules;

    /// <summary>
    /// Tesseract / StoreHub: name on one line, then <c>unit qty discount lineAmount</c> on the next.
    /// </summary>
    private static readonly Regex NumericColumnRow = new(
        @"^\d+\.\d{2}\s+\d+\s+(\d+\.\d{2}|\d{3})\s+\d+\.\d{2}\s*$",
        RegexOptions.Compiled);

    public BasicReceiptParser(IParserRulesProvider rulesProvider)
    {
        _rules = rulesProvider.GetRules();
        _amountRegex = new Regex(_rules.AmountLinePattern, RegexOptions.Compiled);
        _dateLineRegexes = _rules.DateLinePatterns
            .Select(p => new Regex(p, RegexOptions.Compiled))
            .ToList();
        _metaLineRegexes = _rules.MetaLinePatterns
            .Select(p => new Regex(p, RegexOptions.Compiled | RegexOptions.IgnoreCase))
            .ToList();
    }

    public Receipt Parse(string ocrText, string currency)
    {
        ocrText = MergeVisionSplitNormaPrices(ocrText);
        var lines = ocrText
            .Split(new[] { "\r\n", "\n" }, StringSplitOptions.RemoveEmptyEntries)
            .Select(line => line.Trim())
            .Where(line => line.Length > 0)
            .ToList();

        Money? subtotal = null;
        Money? serviceTax = null;
        Money? sstTax = null;
        Money? total = null;

        foreach (var line in lines)
        {
            if (IsDateLikeLine(line))
            {
                continue;
            }

            if (TryParseSummary(line, currency, out var summaryType, out var amount))
            {
                switch (summaryType)
                {
                    case "subtotal":
                        subtotal = amount;
                        break;
                    case "serviceTax":
                        serviceTax = amount;
                        break;
                    case "sst":
                        sstTax = amount;
                        break;
                    case "total":
                        total = amount;
                        break;
                }
            }
        }

        var itemLines = GetItemSectionLines(lines);
        var items = ParseItemsFromLines(itemLines, currency);
        if (items.Count == 0)
        {
            // Vision often omits or garbles the column header; section bounds can be empty or wrong.
            items = ParseItemsFromLines(lines, currency);
        }

        if (items.Count == 0)
        {
            throw new InvalidOperationException("No item lines found in OCR output.");
        }

        ReceiptSummary? summary = null;
        if (subtotal != null || total != null || serviceTax != null || sstTax != null)
        {
            summary = new ReceiptSummary(
                subtotal ?? Money.Zero(currency),
                serviceTax ?? Money.Zero(currency),
                sstTax ?? Money.Zero(currency),
                total ?? Money.Zero(currency));
        }

        var taxLines = new List<ReceiptTaxLine>();
        if (serviceTax is { Amount: > 0 })
        {
            taxLines.Add(new ReceiptTaxLine(ReceiptTaxType.ServiceTax, serviceTax.Value));
        }

        if (sstTax is { Amount: > 0 })
        {
            taxLines.Add(new ReceiptTaxLine(ReceiptTaxType.Sst, sstTax.Value));
        }

        return new Receipt(Guid.NewGuid(), items, summary, taxLines, null);
    }

    /// <summary>
    /// Vision often breaks "(Norma" and "15.90" across two lines; merge so the inline Chicken parser can match.
    /// </summary>
    private static string MergeVisionSplitNormaPrices(string text)
    {
        if (string.IsNullOrEmpty(text))
        {
            return text;
        }

        return Regex.Replace(
            text,
            @"(\(\s*(?:Norma|Spicy)\s*)\r?\n\s*(\d+[.,]\d{2})",
            "$1 $2",
            RegexOptions.IgnoreCase | RegexOptions.Multiline);
    }

    private List<ReceiptItem> ParseItemsFromLines(IReadOnlyList<string> itemLines, string currency)
    {
        var items = new List<ReceiptItem>();
        string? pendingName = null;

        for (var li = 0; li < itemLines.Count; li++)
        {
            var line = itemLines[li];

            if (IsDateLikeLine(line))
            {
                pendingName = null;
                continue;
            }

            if (IsMetaLine(line))
            {
                pendingName = null;
                continue;
            }

            if (TryParseSummary(line, currency, out _, out _))
            {
                pendingName = null;
                continue;
            }

            if (NumericColumnRow.IsMatch(line))
            {
                if (pendingName != null &&
                    TryParseItemFromNameAndNumericRow(pendingName, line, currency, out var tabularItem))
                {
                    items.Add(tabularItem);
                }

                pendingName = null;
                continue;
            }

            if (TryParseQtyNameThenPriceNextLine(itemLines, li, currency, out var visionItem, out var visionSkip))
            {
                items.Add(visionItem);
                pendingName = null;
                li += visionSkip;
                continue;
            }

            if (line.Contains("/ea", StringComparison.OrdinalIgnoreCase) &&
                TryParseAllEaLineItems(line, currency, out var eaItems))
            {
                foreach (var it in eaItems)
                {
                    items.Add(it);
                }

                pendingName = null;
                continue;
            }

            if (TryParseAllChickenNormaInlineItems(line, currency, out var normaItems))
            {
                foreach (var it in normaItems)
                {
                    items.Add(it);
                }

                pendingName = null;
                continue;
            }

            if (TryParseAtPriceLine(line, currency, out var atItem))
            {
                items.Add(atItem);
                pendingName = null;
                continue;
            }

            if (TryParseItemLine(line, currency, out var item))
            {
                items.Add(item);
                pendingName = null;
                continue;
            }

            if (TryParseLooseQtyNamePrice(line, currency, out var loose))
            {
                items.Add(loose);
                pendingName = null;
                continue;
            }

            pendingName = CouldBePendingNameLine(line, currency) ? line : null;
        }

        return items;
    }

    /// <summary>FeedMe-style: qty + name + (unit/ea) + line total; Tesseract may concatenate several on one line.</summary>
    private static readonly Regex EaItemPattern = new(
        @"(\d+)\s+(.+?)\s+\(\s*\d+[.,]\d{2}\s*/\s*ea\s*\)\s+(\d+[.,]\d{2})",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private bool TryParseAllEaLineItems(string line, string currency, out List<ReceiptItem> items)
    {
        items = new List<ReceiptItem>();
        foreach (Match m in EaItemPattern.Matches(line))
        {
            var q = int.Parse(m.Groups[1].Value, CultureInfo.InvariantCulture);
            var rawName = m.Groups[2].Value.Trim();
            var price = decimal.Parse(m.Groups[3].Value.Replace(',', '.'), CultureInfo.InvariantCulture);
            if (q <= 0 || q >= 100 || rawName.Length < 1 || LooksLikeFooterName(rawName))
            {
                continue;
            }

            items.Add(
                new ReceiptItem(
                    Guid.NewGuid(),
                    rawName,
                    new Quantity(q),
                    new Money(price / q, currency),
                    new Money(price, currency)));
        }

        return items.Count > 0;
    }

    /// <summary>
    /// Some POS print <c>1 Chicken ... (Norma 15.90</c> or <c>(Spicy 15.90</c> with trailing OCR noise instead of EOL amounts.
    /// </summary>
    private static readonly Regex ChickenNormaInlinePattern = new(
        @"(?:\b|^)(\d+)\s+(Chicken[^\n(]{3,120}?)\s*\(\s*(?:Norma|Spicy)\s+(\d+[.,]\d{2})",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex ChickenNormaInlineNoQtyPattern = new(
        @"^\s*(Chicken[^\n(]{3,120}?)\s*\(\s*(?:Norma|Spicy)\s+(\d+[.,]\d{2})",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private bool TryParseAllChickenNormaInlineItems(string line, string currency, out List<ReceiptItem> items)
    {
        items = new List<ReceiptItem>();
        foreach (Match m in ChickenNormaInlinePattern.Matches(line))
        {
            var qty = int.Parse(m.Groups[1].Value, CultureInfo.InvariantCulture);
            var rawName = m.Groups[2].Value.Trim();
            var unit = decimal.Parse(m.Groups[3].Value.Replace(',', '.'), CultureInfo.InvariantCulture);
            if (qty <= 0 || qty >= 100 || rawName.Length < 3 || LooksLikeFooterName(rawName))
            {
                continue;
            }

            var lineTotal = unit * qty;
            items.Add(
                new ReceiptItem(
                    Guid.NewGuid(),
                    rawName,
                    new Quantity(qty),
                    new Money(unit, currency),
                    new Money(lineTotal, currency)));
        }

        if (items.Count > 0)
        {
            return true;
        }

        var m2 = ChickenNormaInlineNoQtyPattern.Match(line.Trim());
        if (!m2.Success)
        {
            return false;
        }

        var raw = m2.Groups[1].Value.Trim();
        var unitPrice = decimal.Parse(m2.Groups[2].Value.Replace(',', '.'), CultureInfo.InvariantCulture);
        if (raw.Length < 3 || LooksLikeFooterName(raw))
        {
            return false;
        }

        const int defaultQty = 1;
        items.Add(
            new ReceiptItem(
                Guid.NewGuid(),
                raw,
                new Quantity(defaultQty),
                new Money(unitPrice, currency),
                new Money(unitPrice * defaultQty, currency)));
        return true;
    }

    /// <summary>Last-resort: qty + trailing amount without /ea (noisy single-line tabular).</summary>
    private bool TryParseLooseQtyNamePrice(string line, string currency, out ReceiptItem item)
    {
        item = null!;
        var t = line.Trim();
        if (t.Contains("/ea", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var m = Regex.Match(t, @"^(\d+)\s+(.+?)\s+(\d+[.,]\d{2})\s*$");
        if (!m.Success)
        {
            return false;
        }

        var q = int.Parse(m.Groups[1].Value, CultureInfo.InvariantCulture);
        var rawName = m.Groups[2].Value.Trim();
        var price = decimal.Parse(m.Groups[3].Value.Replace(',', '.'), CultureInfo.InvariantCulture);
        if (q <= 0 || q >= 100 || rawName.Length < 2 || LooksLikeFooterName(rawName))
        {
            return false;
        }

        item = new ReceiptItem(
            Guid.NewGuid(),
            rawName,
            new Quantity(q),
            new Money(price / q, currency),
            new Money(price, currency));
        return true;
    }

    /// <summary>POS lines like <c>A6 lemon@12.90</c> (qty implied 1).</summary>
    private bool TryParseAtPriceLine(string line, string currency, out ReceiptItem item)
    {
        item = null!;
        var t = line.Trim();
        if (!t.Contains('@', StringComparison.Ordinal))
        {
            return false;
        }

        var m = Regex.Match(t, @"^([^\n@]+)@(\d+[.,]\d{2})\s*$");
        if (!m.Success)
        {
            return false;
        }

        var rawName = m.Groups[1].Value.Trim();
        var price = decimal.Parse(m.Groups[2].Value.Replace(',', '.'), CultureInfo.InvariantCulture);
        if (rawName.Length < 2 || LooksLikeFooterName(rawName))
        {
            return false;
        }

        const int q = 1;
        item = new ReceiptItem(
            Guid.NewGuid(),
            rawName,
            new Quantity(q),
            new Money(price, currency),
            new Money(price, currency));
        return true;
    }

    /// <summary>
    /// Lines between a Qty/Item/Price header and Subtotal/Total (aligned with browser parser). If no header, use full text (legacy).
    /// </summary>
    private static List<string> GetItemSectionLines(List<string> lines)
    {
        var startIndex = -1;
        var endIndex = lines.Count;

        for (var i = 0; i < lines.Count; i++)
        {
            if (startIndex < 0)
            {
                if (ReceiptLineHeuristics.IsItemHeaderLine(lines[i]))
                {
                    startIndex = i + 1;
                    continue;
                }

                if (i + 1 < lines.Count && ReceiptLineHeuristics.IsItemHeaderTwoLine(lines[i], lines[i + 1]))
                {
                    startIndex = i + 2;
                    i++;
                    continue;
                }
            }

            if (startIndex >= 0 && ReceiptLineHeuristics.IsEndOfItemsLine(lines[i]))
            {
                endIndex = i;
                break;
            }
        }

        if (startIndex < 0)
        {
            return lines;
        }

        var count = endIndex - startIndex;
        // Vision can place "Subtotal" immediately after the header with no body in between, or mis-detect the end line.
        if (count <= 0)
        {
            return lines;
        }

        return lines.GetRange(startIndex, count);
    }

    private bool IsMetaLine(string line)
    {
        if (ReceiptLineHeuristics.LooksLikeProductLineWithPrice(line))
        {
            return false;
        }

        // Do not treat "A6 lemon@12.90" as an email/meta line.
        if (Regex.IsMatch(line, @"@\d+[.,]\d{2}\s*$"))
        {
            return false;
        }

        return _metaLineRegexes.Any(r => r.IsMatch(line));
    }

    /// <summary>
    /// Google Vision often puts the line amount on the following line (same as browser multi-line parser).
    /// </summary>
    private bool TryParseQtyNameThenPriceNextLine(
        IReadOnlyList<string> lines,
        int index,
        string currency,
        out ReceiptItem item,
        out int extraLinesConsumed)
    {
        item = null!;
        extraLinesConsumed = 0;
        if (index + 1 >= lines.Count)
        {
            return false;
        }

        var line = lines[index].Trim();

        // Same line already ends with an amount — single-line parser handles it
        if (Regex.IsMatch(line, @"\d+[.,]\d{2}\s*$"))
        {
            return false;
        }

        // Case: "1" then name line then "14.00" (three lines). Must run before requiring index+1 to be a price.
        if (Regex.IsMatch(line, @"^\d+$") && index + 2 < lines.Count)
        {
            var nameLine = lines[index + 1].Trim();
            var priceLine = lines[index + 2].Trim();
            if (TryParseStandalonePrice(priceLine, out var price3) && nameLine.Length >= 2)
            {
                var qty = int.Parse(line, CultureInfo.InvariantCulture);
                if (qty > 0 && qty < 100 && !IsMetaLine(nameLine) && !LooksLikeFooterName(nameLine))
                {
                    item = new ReceiptItem(
                        Guid.NewGuid(),
                        nameLine,
                        new Quantity(qty),
                        new Money(price3 / qty, currency),
                        new Money(price3, currency));
                    extraLinesConsumed = 2;
                    return true;
                }
            }
        }

        var next = lines[index + 1].Trim();
        if (!TryParseStandalonePrice(next, out var nextAmount))
        {
            return false;
        }

        // Case: "1 x PM10 ..." or "1 PM10 ..." then "14.00"
        var m = Regex.Match(line, @"^(\d+)\s*(?:[xX]\s+)?(.+)$");
        if (!m.Success)
        {
            return false;
        }

        var q = int.Parse(m.Groups[1].Value, CultureInfo.InvariantCulture);
        var rawName = m.Groups[2].Value.Trim();
        if (q <= 0 || q >= 100 || rawName.Length < 1)
        {
            return false;
        }

        if (IsMetaLine(line) || LooksLikeFooterName(rawName))
        {
            return false;
        }

        var lineTotal = nextAmount;
        item = new ReceiptItem(
            Guid.NewGuid(),
            rawName,
            new Quantity(q),
            new Money(lineTotal / q, currency),
            new Money(lineTotal, currency));
        extraLinesConsumed = 1;
        return true;
    }

    /// <summary>Vision may emit "14.00", "14,00", "$14.00", or "RM 14.00" on its own line.</summary>
    private static bool TryParseStandalonePrice(string line, out decimal amount)
    {
        amount = 0m;
        var t = line.Trim();
        var m = Regex.Match(t, @"^(?:RM|MYR|\$|€)?\s*(\d+[.,]\d{2})\s*$", RegexOptions.IgnoreCase);
        if (!m.Success)
        {
            return false;
        }

        var raw = m.Groups[1].Value.Replace(',', '.');
        return decimal.TryParse(raw, NumberStyles.Number, CultureInfo.InvariantCulture, out amount);
    }

    private static bool LooksLikeFooterName(string name)
    {
        var n = name.ToLowerInvariant();
        return n.Contains("subtotal") || n.Contains("total") || n.Contains("rounding") || n.Contains("payment");
    }

    private bool CouldBePendingNameLine(string line, string currency)
    {
        if (line.Length < 2)
        {
            return false;
        }

        if (!line.Any(char.IsLetter))
        {
            return false;
        }

        if (TryExtractAmount(line, currency, out _))
        {
            return false;
        }

        return true;
    }

    private bool TryParseItemFromNameAndNumericRow(
        string nameLine,
        string numLine,
        string currency,
        out ReceiptItem item)
    {
        item = null!;
        var m = Regex.Match(numLine.Trim(), @"^(\d+\.\d{2})\s+(\d+)\s+(\d+\.\d{2}|\d{3})\s+(\d+\.\d{2})\s*$");
        if (!m.Success)
        {
            return false;
        }

        var unitPrice = decimal.Parse(m.Groups[1].Value, CultureInfo.InvariantCulture);
        var qty = int.Parse(m.Groups[2].Value, CultureInfo.InvariantCulture);
        var discRaw = m.Groups[3].Value;
        var discount = discRaw.Length == 3 && discRaw.All(char.IsDigit)
            ? 0m
            : decimal.Parse(discRaw.Replace(",", "."), CultureInfo.InvariantCulture);
        var lineAmount = decimal.Parse(m.Groups[4].Value, CultureInfo.InvariantCulture);

        if (qty <= 0 || qty >= 100)
        {
            return false;
        }

        var expected = unitPrice * qty - discount;
        if (Math.Abs(expected - lineAmount) > 0.05m)
        {
            return false;
        }

        var name = Regex.Replace(nameLine.Trim(), @"^\d+\.\s*", "");
        if (string.IsNullOrWhiteSpace(name))
        {
            return false;
        }

        item = new ReceiptItem(
            Guid.NewGuid(),
            name,
            new Quantity(qty),
            new Money(unitPrice, currency),
            new Money(lineAmount, currency));

        return true;
    }

    private bool IsDateLikeLine(string line)
    {
        return _dateLineRegexes.Any(r => r.IsMatch(line));
    }

    private bool TryParseSummary(string line, string currency, out string summaryType, out Money amount)
    {
        summaryType = string.Empty;
        amount = Money.Zero(currency);

        var normalized = line.ToLowerInvariant();
        var kw = _rules.SummaryKeywords;
        if (kw.Subtotal.Any(k => normalized.Contains(k)))
        {
            summaryType = "subtotal";
        }
        else if (kw.ServiceTax.Any(k => normalized.Contains(k)))
        {
            summaryType = "serviceTax";
        }
        else if (kw.Sst.Any(k => normalized.Contains(k)))
        {
            summaryType = "sst";
        }
        else if (kw.Total.Any(k => normalized.Contains(k)))
        {
            summaryType = "total";
        }
        else
        {
            return false;
        }

        if (!TryExtractAmount(line, currency, out amount))
        {
            return false;
        }

        return true;
    }

    private bool TryParseItemLine(string line, string currency, out ReceiptItem item)
    {
        item = null!;

        if (!TryExtractAmount(line, currency, out var amount))
        {
            return false;
        }

        var name = _amountRegex.Replace(line, string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(name))
        {
            return false;
        }

        var quantity = Quantity.One();
        var unitPrice = amount;
        var lineAmount = amount;
        item = new ReceiptItem(Guid.NewGuid(), name, quantity, unitPrice, lineAmount);

        return true;
    }

    /// <summary>
    /// Require a proper currency-style decimal (xx.xx) so phone numbers and long IDs are not parsed as amounts.
    /// </summary>
    private bool TryExtractAmount(string line, string currency, out Money amount)
    {
        amount = Money.Zero(currency);

        var match = _amountRegex.Match(line);
        if (!match.Success)
        {
            match = Regex.Match(line, @"(?:RM|MYR)\s*(\d+\.\d{2})\s*$", RegexOptions.IgnoreCase);
        }

        if (!match.Success)
        {
            match = Regex.Match(line, @"(?:RM|MYR)\s*(\d+[.,]\d{2})\s*$", RegexOptions.IgnoreCase);
        }

        if (!match.Success)
        {
            match = Regex.Match(line, @"(\d+[.,]\d{2})\s*$");
        }

        if (!match.Success)
        {
            return false;
        }

        var raw = match.Groups[1].Value.Replace(",", ".");
        if (!decimal.TryParse(raw, NumberStyles.Number, CultureInfo.InvariantCulture, out var parsed))
        {
            return false;
        }

        if (parsed is < 0 or > 1_000_000m)
        {
            return false;
        }

        amount = new Money(parsed, currency);
        return true;
    }
}
