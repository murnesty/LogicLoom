using System.Globalization;
using System.Text.RegularExpressions;
using ReceiptCalculator.Api.Domain.Entities;
using ReceiptCalculator.Api.Domain.ValueObjects;

namespace ReceiptCalculator.Api.Infrastructure.Parsing;

public sealed class BasicReceiptParser : IReceiptParser
{
    private static readonly Regex AmountRegex = new(@"(\d+(?:[\.,]\d{1,2})?)\s*$", RegexOptions.Compiled);

    public Receipt Parse(string ocrText, string currency)
    {
        var lines = ocrText
            .Split(new[] { "\r\n", "\n" }, StringSplitOptions.RemoveEmptyEntries)
            .Select(line => line.Trim())
            .Where(line => line.Length > 0)
            .ToList();

        var items = new List<ReceiptItem>();
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

                continue;
            }

            if (TryParseItemLine(line, currency, out var item))
            {
                items.Add(item);
            }
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

    private static bool IsDateLikeLine(string line)
    {
        return Regex.IsMatch(line, @"\b\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\b")
            || Regex.IsMatch(line, @"\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b")
            || Regex.IsMatch(line, @"\b\d{1,2}:\d{2}(?::\d{2})?\b");
    }

    private static bool TryParseSummary(string line, string currency, out string summaryType, out Money amount)
    {
        summaryType = string.Empty;
        amount = Money.Zero(currency);

        var normalized = line.ToLowerInvariant();
        if (normalized.Contains("subtotal"))
        {
            summaryType = "subtotal";
        }
        else if (normalized.Contains("service tax"))
        {
            summaryType = "serviceTax";
        }
        else if (normalized.Contains("sst"))
        {
            summaryType = "sst";
        }
        else if (normalized.Contains("total"))
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

    private static bool TryParseItemLine(string line, string currency, out ReceiptItem item)
    {
        item = null!;

        if (!TryExtractAmount(line, currency, out var amount))
        {
            return false;
        }

        var name = AmountRegex.Replace(line, string.Empty).Trim();
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

    private static bool TryExtractAmount(string line, string currency, out Money amount)
    {
        amount = Money.Zero(currency);

        var match = AmountRegex.Match(line);
        if (!match.Success)
        {
            return false;
        }

        var raw = match.Groups[1].Value.Replace(",", ".");
        if (!decimal.TryParse(raw, NumberStyles.Number, CultureInfo.InvariantCulture, out var parsed))
        {
            return false;
        }

        if (parsed < 0)
        {
            return false;
        }

        amount = new Money(parsed, currency);
        return true;
    }
}
