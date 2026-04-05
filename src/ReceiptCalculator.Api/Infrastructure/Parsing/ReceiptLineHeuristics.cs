using System.Text.RegularExpressions;

namespace ReceiptCalculator.Api.Infrastructure.Parsing;

/// <summary>
/// Line classification aligned with the browser <c>receiptParser.ts</c> so server and client agree on item boundaries.
/// </summary>
internal static class ReceiptLineHeuristics
{
    /// <summary>
    /// OCR often merges "Table Pax: 1" with the first item on one line. Those lines must not be classified as metadata.
    /// </summary>
    internal static bool LooksLikeProductLineWithPrice(string line)
    {
        var t = line.Trim();
        if (t.Length < 10)
        {
            return false;
        }

        if (!Regex.IsMatch(t, @"\d+[.,]\d{2}\s*$"))
        {
            return false;
        }

        if (Regex.IsMatch(t, @"/ea\)|/ca\)|\bSETA\b|\bSETB\b|\bPM\d+", RegexOptions.IgnoreCase))
        {
            return true;
        }

        return Regex.IsMatch(t, @"^\d+\s+\S");
    }

    /// <summary>POS column header: Qty + Item + Price/Amount (with common OCR typos).</summary>
    internal static bool IsItemHeaderLine(string line)
    {
        var lower = line.ToLowerInvariant();
        var hasItem = Regex.IsMatch(lower, @"\bitem\b");
        var hasQty = Regex.IsMatch(lower, @"\b(qty|aty|quantity)\b");
        var hasPrice = Regex.IsMatch(lower, @"\b(price|prien|amount|amt)\b");
        var hasDiscount = Regex.IsMatch(lower, @"\b(disc|discount)\b");
        return hasItem && (hasQty || hasPrice || hasDiscount);
    }

    /// <summary>Google Vision may split "Qty Item" and "Price (MYR)" across two lines.</summary>
    internal static bool IsItemHeaderTwoLine(string line1, string line2)
    {
        var a = line1.Trim().ToLowerInvariant();
        var b = line2.Trim().ToLowerInvariant();
        var line1QtyOnly = Regex.IsMatch(a, @"^(qty|quantity|aty)\s*$");
        var line2ItemPrice = b.Contains("item") && (b.Contains("price") || b.Contains("amount") || b.Contains("myr"));
        if (line1QtyOnly && line2ItemPrice)
        {
            return true;
        }

        var line1QtyItem = a.Contains("qty") && a.Contains("item") && !a.Contains("price") && !a.Contains("amount");
        var line2Price =
            b.Contains("price") || b.Contains("amount") || b.Contains("myr") || b.Contains("(myr)");
        return line1QtyItem && line2Price;
    }

    /// <summary>First line after items (subtotal, total, rounding, etc.).</summary>
    internal static bool IsEndOfItemsLine(string line)
    {
        var t = line.Trim();
        return Regex.IsMatch(
            t,
            @"^(subtotal|sub\s*total|sub-total|total|total\s+sales|total\s+amount|bill\s+rounding|rounding|ounding|so\s+\d|\d+\s+qty|RM\s+\d|duit\s+now|tax\s+rm|payment\s+ref|change|qr\s+payment|qty\s*:\s*\d)",
            RegexOptions.IgnoreCase);
    }
}
