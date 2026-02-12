using ReceiptCalculator.Api.Domain.ValueObjects;

namespace ReceiptCalculator.Api.Domain.Entities;

public sealed class Receipt
{
    public Guid Id { get; }
    public IReadOnlyList<ReceiptItem> Items { get; }
    public ReceiptSummary? Summary { get; private set; }
    public IReadOnlyList<ReceiptTaxLine> TaxBreakdown { get; }
    public decimal? Confidence { get; }

    public Receipt(
        Guid id,
        IReadOnlyList<ReceiptItem> items,
        ReceiptSummary? summary,
        IReadOnlyList<ReceiptTaxLine> taxBreakdown,
        decimal? confidence)
    {
        if (items == null || items.Count == 0)
        {
            throw new ArgumentException("Receipt must contain at least one item.", nameof(items));
        }

        Id = id;
        Items = items;
        Summary = summary;
        TaxBreakdown = taxBreakdown ?? Array.Empty<ReceiptTaxLine>();
        Confidence = confidence;
    }

    public void UpdateSummary(ReceiptSummary summary)
    {
        Summary = summary ?? throw new ArgumentNullException(nameof(summary));
    }
}
