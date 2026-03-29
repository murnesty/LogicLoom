using ReceiptCalculator.Api.Domain.Entities;
using ReceiptCalculator.Api.Domain.ValueObjects;

namespace ReceiptCalculator.Api.Domain.Services;

public sealed class ReceiptTotalsCalculator
{
    public ReceiptSummary EnsureSummary(IReadOnlyList<ReceiptItem> items, ReceiptSummary? summary, string currency)
    {
        if (summary != null)
        {
            return summary;
        }

        var subtotal = items.Aggregate(Money.Zero(currency), (current, item) => current.Add(item.LineAmount));
        var total = subtotal;

        return new ReceiptSummary(subtotal, Money.Zero(currency), Money.Zero(currency), total);
    }

    public IReadOnlyDictionary<Guid, Money> AllocateTaxesProportionally(
        IReadOnlyList<ReceiptItem> items,
        ReceiptSummary summary)
    {
        var currency = summary.Total.Currency;
        var totalTax = summary.ServiceTax.Add(summary.SstTax);
        if (totalTax.Amount <= 0)
        {
            return items.ToDictionary(item => item.Id, item => Money.Zero(currency));
        }

        var subtotalAmount = items.Sum(item => item.LineAmount.Amount);
        if (subtotalAmount <= 0)
        {
            return items.ToDictionary(item => item.Id, item => Money.Zero(currency));
        }

        var allocations = new Dictionary<Guid, Money>();
        var allocatedSum = 0m;

        for (var index = 0; index < items.Count; index++)
        {
            var item = items[index];
            var share = item.LineAmount.Amount / subtotalAmount;
            var raw = totalTax.Amount * share;
            var rounded = decimal.Round(raw, 2, MidpointRounding.AwayFromZero);
            allocations[item.Id] = new Money(rounded, currency);
            allocatedSum += rounded;
        }

        var diff = decimal.Round(totalTax.Amount - allocatedSum, 2, MidpointRounding.AwayFromZero);
        if (diff != 0m && allocations.Count > 0)
        {
            var firstKey = allocations.Keys.First();
            var first = allocations[firstKey];
            allocations[firstKey] = new Money(first.Amount + diff, currency);
        }

        return allocations;
    }
}
