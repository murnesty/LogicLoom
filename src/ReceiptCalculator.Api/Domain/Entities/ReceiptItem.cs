using ReceiptCalculator.Api.Domain.ValueObjects;

namespace ReceiptCalculator.Api.Domain.Entities;

public sealed class ReceiptItem
{
    public Guid Id { get; }
    public string Name { get; }
    public Quantity Quantity { get; }
    public Money UnitPrice { get; }
    public Money LineAmount { get; }

    public ReceiptItem(Guid id, string name, Quantity quantity, Money unitPrice, Money lineAmount)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("Item name is required.", nameof(name));
        }

        if (!string.Equals(unitPrice.Currency, lineAmount.Currency, StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException("Currency mismatch between unit price and line amount.");
        }

        Id = id;
        Name = name.Trim();
        Quantity = quantity;
        UnitPrice = unitPrice;
        LineAmount = lineAmount;
    }
}
